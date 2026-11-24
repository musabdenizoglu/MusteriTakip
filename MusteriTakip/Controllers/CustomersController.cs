using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MusteriTakip.Data;
using MusteriTakip.Helpers;
using MusteriTakip.Models;
using MusteriTakip.Models.ViewModels;
using MusteriTakip.Services;

namespace MusteriTakip.Controllers;

public class CustomersController : Controller
{
    private readonly AppDbContext _db;
    private readonly LedgerService _ledger;
    private readonly CodeService _codes;
    private readonly ImageService _img;
    private readonly SettingsService _settings;

    public CustomersController(AppDbContext db, LedgerService ledger, CodeService codes, ImageService img, SettingsService settings)
    {
        _db = db; _ledger = ledger; _codes = codes; _img = img; _settings = settings;
    }

    // GET /Customers
    public async Task<IActionResult> Index(string? q, string? sort)
    {
        var customers = await _ledger.LoadCustomersAsync();
        // Arama: ad, kod, telefon, e-posta, son işlem tarihi; virgülle ayrılan terimlerin hepsi geçmeli
        var items = customers
            .Select(c =>
            {
                var t = LedgerService.CustomerTotals(c);
                var dates = c.Records.Select(r => r.Date).Concat(c.Payments.Select(p => p.Date)).ToList();
                return new CustomerListItem { Customer = c, Rest = t.Rest, GoldRest = t.GoldRest, LastDate = dates.Count > 0 ? dates.Max() : null };
            })
            .Where(x => CustomerListItem.MatchesAll(CustomerListItem.SearchText(x), q))
            .ToList()
            .AsEnumerable();
        items = sort switch
        {
            "az" => items.OrderBy(x => x.Customer.Name, StringComparer.Create(Fmt.Tr, false)),
            "debt" => items.OrderByDescending(x => x.Rest),
            "last" => items.OrderByDescending(x => x.LastDate ?? DateOnly.MinValue),
            _ => items.OrderBy(x => x.Customer.CreatedAt).ThenBy(x => x.Customer.Id) // HTML: kayıt sırası
        };
        var trash = await _db.Customers.IgnoreQueryFilters().CountAsync(c => c.DeletedAt != null)
                  + await _db.OrderRecords.IgnoreQueryFilters().CountAsync(r => r.DeletedAt != null)
                  + await _db.Payments.IgnoreQueryFilters().CountAsync(p => p.DeletedAt != null)
                  + await _db.Expenses.IgnoreQueryFilters().CountAsync(e => e.DeletedAt != null);
        return View(new CustomerListVm { Items = items.ToList(), Search = q, Sort = sort, TrashCount = trash, TotalCount = customers.Count });
    }

    // GET /Customers/SearchData — üst çubuktaki genel arama (gsearch) için müşteri + sipariş listesi
    [HttpGet]
    public async Task<IActionResult> SearchData()
    {
        var customers = await _db.Customers.AsNoTracking()
            .Select(c => new { id = c.Id, name = c.Name, code = c.Code, phone = c.Phone })
            .ToListAsync();
        var rows = await _db.OrderRecords.AsNoTracking()
            .Select(r => new { r.Id, r.CustomerId, r.Model, r.Code, r.Note, r.Date, r.EditedAt, r.Price, r.ImagePath })
            .ToListAsync();
        // edited: değiştirme tarihi, yerel saate çevrilmiş arama metni ("gg.aa.yyyy yyyy-aa-gg")
        var records = rows.Select(r => new { id = r.Id, cid = r.CustomerId, model = r.Model, code = r.Code, note = r.Note, date = r.Date, edited = Fmt.EditSearch(r.EditedAt), price = r.Price, image = r.ImagePath });
        return Json(new { customers, records });
    }

    // GET /Customers/Create
    public IActionResult Create() => View("Form", new CustomerFormVm());

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Create(CustomerFormVm vm)
    {
        var name = Fmt.Upper(vm.Name);
        if (name != "" && await _db.Customers.AnyAsync(c => c.Name == name))
            ModelState.AddModelError(nameof(vm.Name), "Bu müşteri zaten kayıtlı.");
        var (code, err) = await _codes.MakeCustomerCodeAsync(vm.Code, name, null);
        if (err != null) ModelState.AddModelError(nameof(vm.Code), err);
        if (!ModelState.IsValid) return View("Form", vm);

        var c = new Customer
        {
            Name = name,
            Phone = vm.Phone?.Trim(),
            Email = vm.Email?.Trim(),
            Code = code,
            Note = vm.Note?.Trim(),
            CreatedAt = DateTime.UtcNow,
            ImagePath = await _img.SaveDataUrlAsync(vm.ImageData, "customers")
        };
        if (vm.OpeningBalance > 0)
        {
            c.Records.Add(new OrderRecord
            {
                Model = string.IsNullOrWhiteSpace(vm.OpeningDesc) ? "Açılış (Eski) bakiyesi" : vm.OpeningDesc.Trim(),
                IsDebt = true,
                IsOpening = true,
                Code = code != null ? code + "-Eski B." : null,
                Date = Dates.Today,
                Price = Math.Round(vm.OpeningBalance.Value, 2),
                CreatedAt = DateTime.UtcNow
            });
        }
        _db.Customers.Add(c);
        await _db.SaveChangesAsync();
        TempData["Ok"] = $"{c.Name} kaydedildi.";
        // HTML'deki gibi: kayıttan sonra müşterinin sayfası ve Yeni Sipariş açılır
        return RedirectToAction("Create", "Orders", new { customerId = c.Id });
    }

    // GET /Customers/Edit/5
    public async Task<IActionResult> Edit(int id)
    {
        var c = await _db.Customers.FindAsync(id);
        if (c == null) return NotFound();
        return View("Form", new CustomerFormVm
        {
            Id = c.Id, Name = c.Name, Phone = c.Phone, Email = c.Email, Code = c.Code, Note = c.Note, ExistingImage = c.ImagePath
        });
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Edit(int id, CustomerFormVm vm)
    {
        var c = await _db.Customers.FindAsync(id);
        if (c == null) return NotFound();
        var name = Fmt.Upper(vm.Name);
        if (name != "" && await _db.Customers.AnyAsync(x => x.Name == name && x.Id != id))
            ModelState.AddModelError(nameof(vm.Name), "Bu isimde başka bir müşteri var.");
        var (code, err) = await _codes.MakeCustomerCodeAsync(string.IsNullOrWhiteSpace(vm.Code) ? c.Code : vm.Code, name, id);
        if (err != null) ModelState.AddModelError(nameof(vm.Code), err);
        if (!ModelState.IsValid) { vm.Id = id; vm.ExistingImage = c.ImagePath; return View("Form", vm); }

        c.Name = name;
        c.Phone = vm.Phone?.Trim();
        c.Email = vm.Email?.Trim();
        c.Code = code;
        c.Note = vm.Note?.Trim();
        if (vm.RemoveImage || !string.IsNullOrEmpty(vm.ImageData))
        {
            _img.Delete(c.ImagePath);
            c.ImagePath = vm.RemoveImage ? null : await _img.SaveDataUrlAsync(vm.ImageData, "customers");
        }
        await _db.SaveChangesAsync();
        TempData["Ok"] = "Müşteri bilgileri güncellendi.";
        return RedirectToAction(nameof(Details), new { id });
    }

    // GET /Customers/Details/5?tab=records|cari&kind=Altın
    public async Task<IActionResult> Details(int id, string? tab, string? kind)
    {
        var c = await _ledger.LoadCustomerAsync(id);
        if (c == null) return NotFound();
        IslemTuru? k = kind switch { "Altın" => IslemTuru.Altin, "Kalıp" => IslemTuru.Kalip, _ => null };
        var totals = LedgerService.CustomerTotals(c, k);
        var all = LedgerService.CustomerTotals(c);

        var wa = new StringBuilder();
        wa.AppendLine($"Sayın {c.Name},");
        wa.AppendLine($"Hesap özetiniz ({Fmt.Date(Dates.Today)}):");
        wa.AppendLine($"Toplam: {Fmt.Usd(all.Ciro)}");
        wa.AppendLine($"Ödenen: {Fmt.Usd(all.Paid)}");
        wa.AppendLine($"Kalan: {Fmt.Usd(all.Rest)}");
        if (Math.Abs(all.GoldRest) > 0.0005m) wa.AppendLine($"Kalan altın: {Fmt.Gr(all.GoldRest)}");
        wa.Append("Teşekkürler.");

        return View(new CustomerDetailsVm
        {
            Customer = c,
            Totals = totals,
            KindFilter = kind,
            Tab = tab == "cari" ? "cari" : "records",
            Records = c.Records.Where(r => !r.IsDebt).OrderByDescending(r => r.Date).ThenByDescending(r => r.CreatedAt).ToList(),
            History = LedgerService.Movements(new[] { c }, null).Where(m => k == null || m.Kind == k || m.Kind == null).ToList(),
            WhatsAppText = wa.ToString()
        });
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> SaveNote(int id, string? note)
    {
        var c = await _db.Customers.FindAsync(id);
        if (c == null) return NotFound();
        c.Note = note?.Trim();
        await _db.SaveChangesAsync();
        return RedirectToAction(nameof(Details), new { id });
    }

    /// <summary>Müşteriyi çöp kutusuna taşır (30 gün içinde geri alınabilir).</summary>
    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Delete(int id)
    {
        var c = await _db.Customers.FindAsync(id);
        if (c == null) return NotFound();
        c.DeletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        TempData["Ok"] = $"{c.Name} çöp kutusuna taşındı.";
        return RedirectToAction(nameof(Index));
    }

    // GET /Customers/Statement/5?from=2026-01-01&to=2026-12-31
    public async Task<IActionResult> Statement(int id, string? from, string? to)
    {
        var c = await _ledger.LoadCustomerAsync(id);
        if (c == null) return NotFound();
        var st = await _settings.GetAsync();
        var f = Dates.TryParse(from);
        var t = Dates.TryParse(to);
        return View(new StatementVm
        {
            Customer = c,
            ShopName = string.IsNullOrWhiteSpace(st.ShopName) ? "Müşteri Takip" : st.ShopName!,
            From = f,
            To = t,
            Rows = LedgerService.Statement(c, f, t),
            Totals = LedgerService.CustomerTotals(c)
        });
    }

    /// <summary>Ad yazarken öneri (datalist / otomatik tamamlama).</summary>
    [HttpGet]
    public async Task<IActionResult> Names() =>
        Json(await _db.Customers.OrderBy(c => c.Name).Select(c => new { c.Id, c.Name, c.Code }).ToListAsync());
}
