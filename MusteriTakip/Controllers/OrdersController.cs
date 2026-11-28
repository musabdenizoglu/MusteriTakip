using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MusteriTakip.Data;
using MusteriTakip.Helpers;
using MusteriTakip.Models;
using MusteriTakip.Models.ViewModels;
using MusteriTakip.Services;

namespace MusteriTakip.Controllers;

/// <summary>Siparişler (iş kayıtları) ve elle eklenen eski borçlar.</summary>
public class OrdersController : Controller
{
    private readonly AppDbContext _db;
    private readonly CodeService _codes;
    private readonly ImageService _img;
    private readonly SettingsService _settings;

    public OrdersController(AppDbContext db, CodeService codes, ImageService img, SettingsService settings)
    {
        _db = db; _codes = codes; _img = img; _settings = settings;
    }

    /// <summary>Yeni Sipariş: müşteri seçilmemişse önce müşteri seçtirir.</summary>
    public async Task<IActionResult> New()
    {
        ViewBag.Customers = await _db.Customers.OrderBy(c => c.Name).ToListAsync();
        return View();
    }

    public async Task<IActionResult> Create(int customerId)
    {
        var c = await _db.Customers.FindAsync(customerId);
        if (c == null) return RedirectToAction(nameof(New));
        // Kodu olmayan (ör. içe aktarılmış) müşteriye addan kod önerilir; kayıtta müşteriye yazılır
        var cc = c.Code ?? await _codes.UniqueCodeAsync(c.Name, c.Id);
        var vm = new OrderFormVm
        {
            CustomerId = c.Id,
            CustomerName = c.Name,
            CustCode = cc,
            ModelNo = await _codes.NextModelNoAsync(c.Id, cc),
            Date = Fmt.InputDate(Dates.Today)
        };
        await FillSettings(vm);
        return View("Form", vm);
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Create(OrderFormVm vm)
    {
        var c = await _db.Customers.FindAsync(vm.CustomerId);
        if (c == null) return NotFound();
        var code = await ValidateAsync(vm, c, null);
        if (!ModelState.IsValid) { vm.CustomerName = c.Name; await FillSettings(vm); return View("Form", vm); }

        var r = new OrderRecord { CustomerId = c.Id, CreatedAt = DateTime.UtcNow };
        await ApplyAsync(r, vm, code, snapshot: true);
        SyncCustomerCode(c, code);
        _db.OrderRecords.Add(r);
        await _db.SaveChangesAsync();
        TempData["Ok"] = $"Sipariş kaydedildi{(code != null ? " (" + code + ")" : "")}.";
        return RedirectToAction("Details", "Customers", new { id = c.Id });
    }

    public async Task<IActionResult> Edit(int id, string? returnUrl)
    {
        if (!string.IsNullOrEmpty(returnUrl) && Url.IsLocalUrl(returnUrl)) ViewData["ReturnUrl"] = returnUrl;
        var r = await _db.OrderRecords.Include(x => x.Customer).Include(x => x.Expenses).FirstOrDefaultAsync(x => x.Id == id);
        if (r == null) return NotFound();
        if (r.IsDebt) return RedirectToAction(nameof(EditDebt), new { id });
        string? cc = null, no = null;
        if (!string.IsNullOrEmpty(r.Code) && r.Code.Contains('-'))
        {
            var i = r.Code.IndexOf('-');
            cc = r.Code[..i];
            no = r.Code[(i + 1)..];
        }
        else cc = r.Customer?.Code;
        var vm = new OrderFormVm
        {
            Id = r.Id,
            CustomerId = r.CustomerId,
            CustomerName = r.Customer?.Name ?? "",
            CustCode = cc,
            ModelNo = no,
            Model = r.Model,
            Date = Fmt.InputDate(r.Date),
            MumGram = r.MumGram, MumIscilik = r.MumIscilik,
            GumusGram = r.GumusGram, GumusUsd = r.GumusUsd,
            AltinGram = r.AltinGram, AltinMilyem = r.AltinMilyem, AltinCikis = r.AltinCikis, AltinIscilik = r.AltinIscilik,
            Cizim = r.Cizim,
            Price = r.Price,
            Note = r.Note,
            EditNote = r.EditNote,
            ExistingImage = r.ImagePath,
            Expenses = r.Expenses.Select(e => new OrderExpenseVm { Desc = e.Description, Amount = e.Amount }).ToList()
        };
        await FillSettings(vm);
        return View("Form", vm);
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Edit(int id, OrderFormVm vm, string? returnUrl)
    {
        var r = await _db.OrderRecords.Include(x => x.Customer).Include(x => x.Expenses).FirstOrDefaultAsync(x => x.Id == id);
        if (r == null || r.Customer == null) return NotFound();
        var localReturn = !string.IsNullOrEmpty(returnUrl) && Url.IsLocalUrl(returnUrl) ? returnUrl : null;
        ViewData["ReturnUrl"] = localReturn;
        var code = await ValidateAsync(vm, r.Customer, id);
        if (!ModelState.IsValid) { vm.Id = id; vm.CustomerName = r.Customer.Name; vm.ExistingImage = r.ImagePath; await FillSettings(vm); return View("Form", vm); }

        _db.OrderExpenses.RemoveRange(r.Expenses);
        r.Expenses.Clear();
        await ApplyAsync(r, vm, code, snapshot: false);
        r.EditedAt = DateTime.UtcNow;
        if (vm.Bump) r.UpdatedAt = r.EditedAt;
        r.EditNote = string.IsNullOrWhiteSpace(vm.EditNote) ? null : vm.EditNote.Trim();
        SyncCustomerCode(r.Customer, code);
        await _db.SaveChangesAsync();
        TempData["Ok"] = "Sipariş güncellendi.";
        TempData["EditedRec"] = "price:" + r.Id;   // dönülen sayfada bu siparişin satırı kısa süre yeşil yanar
        if (localReturn != null) return Redirect(localReturn);   // düzenlemenin açıldığı sayfaya dön
        return RedirectToAction("Details", "Customers", new { id = r.CustomerId });
    }

    /// <summary>Siparişi kopyala: aynı bilgilerle yeni numaralı sipariş formu açar.</summary>
    public async Task<IActionResult> Duplicate(int id)
    {
        var r = await _db.OrderRecords.Include(x => x.Customer).Include(x => x.Expenses).FirstOrDefaultAsync(x => x.Id == id);
        if (r == null || r.Customer == null) return NotFound();
        var vm = new OrderFormVm
        {
            CustomerId = r.CustomerId,
            CustomerName = r.Customer.Name,
            CustCode = r.Customer.Code,
            ModelNo = r.Customer.Code != null ? await _codes.NextModelNoAsync(r.CustomerId, r.Customer.Code) : null,
            Model = r.Model,
            Date = Fmt.InputDate(Dates.Today),
            MumGram = r.MumGram, MumIscilik = r.MumIscilik,
            GumusGram = r.GumusGram, GumusUsd = r.GumusUsd,
            AltinGram = r.AltinGram, AltinMilyem = r.AltinMilyem, AltinCikis = r.AltinCikis, AltinIscilik = r.AltinIscilik,
            Cizim = r.Cizim,
            Price = r.Price,
            Note = r.Note,
            Expenses = r.Expenses.Select(e => new OrderExpenseVm { Desc = e.Description, Amount = e.Amount }).ToList()
        };
        await FillSettings(vm);
        return View("Form", vm);
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Delete(int id, string? returnUrl)
    {
        var r = await _db.OrderRecords.FindAsync(id);
        if (r == null) return NotFound();
        r.DeletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        TempData["Ok"] = "Kayıt çöp kutusuna taşındı.";
        if (!string.IsNullOrEmpty(returnUrl) && Url.IsLocalUrl(returnUrl)) return Redirect(returnUrl);
        return RedirectToAction("Details", "Customers", new { id = r.CustomerId });
    }

    /// <summary>Müşteri sayfasında seçilen siparişleri topluca çöp kutusuna taşır.</summary>
    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> DeleteMany(int customerId, int[] ids, string? returnUrl)
    {
        var recs = await _db.OrderRecords.Where(r => r.CustomerId == customerId && ids.Contains(r.Id)).ToListAsync();
        var now = DateTime.UtcNow;
        foreach (var r in recs) r.DeletedAt = now;
        await _db.SaveChangesAsync();
        if (recs.Count > 0) TempData["Ok"] = $"{recs.Count} kayıt çöp kutusuna taşındı.";
        if (!string.IsNullOrEmpty(returnUrl) && Url.IsLocalUrl(returnUrl)) return Redirect(returnUrl);
        return RedirectToAction("Details", "Customers", new { id = customerId });
    }

    // ---------------- Eski borç ----------------

    public async Task<IActionResult> AddDebt(int customerId)
    {
        var c = await _db.Customers.FindAsync(customerId);
        if (c == null) return NotFound();
        return View("DebtForm", new DebtFormVm { CustomerId = c.Id, CustomerName = c.Name, Date = Fmt.InputDate(Dates.Today) });
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> AddDebt(DebtFormVm vm)
    {
        var c = await _db.Customers.FindAsync(vm.CustomerId);
        if (c == null) return NotFound();
        if (!ModelState.IsValid) { vm.CustomerName = c.Name; return View("DebtForm", vm); }
        _db.OrderRecords.Add(new OrderRecord
        {
            CustomerId = c.Id,
            Model = vm.Description.Trim(),
            IsDebt = true,
            Date = Dates.ParseOrToday(vm.Date),
            Price = Math.Round(vm.Amount!.Value, 2),
            Note = vm.Note?.Trim(),
            Kind = vm.Kind == "Kalıp" ? IslemTuru.Kalip : IslemTuru.Altin,
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
        TempData["Ok"] = "Borç eklendi.";
        if (!string.IsNullOrEmpty(vm.ReturnUrl) && Url.IsLocalUrl(vm.ReturnUrl)) return Redirect(vm.ReturnUrl);
        return RedirectToAction("Details", "Customers", new { id = c.Id, tab = "cari" });
    }

    public async Task<IActionResult> EditDebt(int id)
    {
        var r = await _db.OrderRecords.Include(x => x.Customer).FirstOrDefaultAsync(x => x.Id == id && x.IsDebt);
        if (r == null) return NotFound();
        return View("DebtForm", new DebtFormVm
        {
            Id = r.Id, CustomerId = r.CustomerId, CustomerName = r.Customer?.Name ?? "",
            Description = r.Model, Amount = r.Price, Date = Fmt.InputDate(r.Date), Note = r.Note, Kind = Fmt.KindText(r.Kind)
        });
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> EditDebt(int id, DebtFormVm vm)
    {
        var r = await _db.OrderRecords.Include(x => x.Customer).FirstOrDefaultAsync(x => x.Id == id && x.IsDebt);
        if (r == null) return NotFound();
        if (!ModelState.IsValid) { vm.Id = id; vm.CustomerName = r.Customer?.Name ?? ""; return View("DebtForm", vm); }
        r.Model = vm.Description.Trim();
        r.Price = Math.Round(vm.Amount!.Value, 2);
        r.Date = Dates.ParseOrToday(vm.Date);
        r.Note = vm.Note?.Trim();
        if (!string.IsNullOrEmpty(vm.Kind)) r.Kind = vm.Kind == "Kalıp" ? IslemTuru.Kalip : IslemTuru.Altin;
        r.EditedAt = r.UpdatedAt = DateTime.UtcNow; // borç düzenlemesi soru sormadan en üste çıkar (önceki davranış)
        await _db.SaveChangesAsync();
        TempData["Ok"] = "Borç güncellendi.";
        TempData["EditedRec"] = "price:" + r.Id;   // dönülen sayfada bu borcun satırı kısa süre yeşil yanar
        if (!string.IsNullOrEmpty(vm.ReturnUrl) && Url.IsLocalUrl(vm.ReturnUrl)) return Redirect(vm.ReturnUrl);
        return RedirectToAction("Details", "Customers", new { id = r.CustomerId, tab = "cari" });
    }

    // ---------------- yardımcılar ----------------

    private async Task FillSettings(OrderFormVm vm)
    {
        var s = await _settings.GetAsync();
        vm.SetMum = s.MumGrFiyat;
        vm.SetGumus = s.GumusGrFiyat;
        vm.SetAltin = s.AltinGrFiyat;
        vm.Brand = string.IsNullOrWhiteSpace(s.WatermarkBrand) ? "ARTE DESIGN" : s.WatermarkBrand!;
    }

    /// <summary>Formu doğrular, "KOD-0001" model kodunu döndürür.</summary>
    private async Task<string?> ValidateAsync(OrderFormVm vm, Customer c, int? recordId)
    {
        if ((vm.AltinGram != null) != (vm.AltinMilyem != null))
            ModelState.AddModelError(vm.AltinGram != null ? nameof(vm.AltinMilyem) : nameof(vm.AltinGram),
                vm.AltinGram != null ? "Altın (gr) girildi; lütfen Altın Milyem de girin." : "Altın Milyem girildi; lütfen Altın (gr) de girin.");
        if (vm.Price < 0) ModelState.AddModelError(nameof(vm.Price), "Fiyat negatif olamaz.");

        var cc = CodeService.LettersOnly(vm.CustCode);
        if (cc == "") return null;
        if (cc.Length < 2 || cc.Length > 3) { ModelState.AddModelError(nameof(vm.CustCode), "Müşteri kodu 2 veya 3 harf olmalı."); return null; }
        var owner = await _db.Customers.Where(x => x.Code == cc && x.Id != c.Id).Select(x => x.Name).FirstOrDefaultAsync();
        if (owner != null) { ModelState.AddModelError(nameof(vm.CustCode), $"“{cc}” kodu başka bir müşteride kayıtlı ({owner})."); return null; }

        var digits = new string((vm.ModelNo ?? "").Where(char.IsDigit).ToArray());
        if (digits == "") digits = await _codes.NextModelNoAsync(c.Id, cc);
        else if (int.TryParse(digits, out var n)) digits = n.ToString("D4");
        var code = cc + "-" + digits;
        if (await _codes.ModelCodeTakenAsync(c.Id, code, recordId))
            ModelState.AddModelError(nameof(vm.ModelNo), $"“{code}” numarası bu müşterinin başka bir kaydında kullanılıyor (sıradaki: {cc}-{await _codes.NextModelNoAsync(c.Id, cc)}).");
        return code;
    }

    private async Task ApplyAsync(OrderRecord r, OrderFormVm vm, string? code, bool snapshot)
    {
        r.Model = Fmt.Upper(vm.Model);
        r.Code = code;
        r.Date = Dates.ParseOrToday(vm.Date);
        r.MumGram = vm.MumGram;
        r.MumIscilik = vm.MumIscilik;
        r.GumusGram = vm.GumusGram;
        r.GumusUsd = vm.GumusUsd;
        r.AltinGram = vm.AltinGram;
        r.AltinMilyem = vm.AltinMilyem;
        r.AltinCikis = vm.AltinCikis ?? (vm.AltinGram > 0 && vm.AltinMilyem > 0 ? (decimal?)LedgerService.CalcHas(vm.AltinGram.Value, vm.AltinMilyem.Value) : null);
        r.AltinIscilik = vm.AltinIscilik;
        r.Cizim = vm.Cizim;
        // HTML'deki kural: altın gr ve milyem girildiyse "Altın", değilse "Kalıp"
        r.Kind = vm.AltinGram != null && vm.AltinMilyem != null ? IslemTuru.Altin : IslemTuru.Kalip;
        r.Price = vm.Price.HasValue ? Math.Round(vm.Price.Value, 2) : null;
        r.Note = string.IsNullOrWhiteSpace(vm.Note) ? null : vm.Note.Trim();
        foreach (var e in vm.Expenses.Where(e => !string.IsNullOrWhiteSpace(e.Desc) || e.Amount > 0))
            r.Expenses.Add(new OrderExpense { Description = (e.Desc ?? "").Trim(), Amount = Math.Round(e.Amount ?? 0m, 2) });

        if (vm.RemoveImage || !string.IsNullOrEmpty(vm.ImageData))
        {
            _img.Delete(r.ImagePath);
            r.ImagePath = vm.RemoveImage ? null : await _img.SaveDataUrlAsync(vm.ImageData, "orders");
        }

        if (snapshot || r.SnapDate == null)
        {
            var s = await _settings.GetAsync();
            r.SnapMumGrFiyat = s.MumGrFiyat;
            r.SnapGumusGrFiyat = s.GumusGrFiyat;
            r.SnapAltinGrFiyat = s.AltinGrFiyat;
            r.SnapUsdTry = vm.LiveUsdTry > 0 ? vm.LiveUsdTry : null;
            r.SnapGramAltinTl = vm.LiveGramAltinTl > 0 ? vm.LiveGramAltinTl : null;
            r.SnapDate = Dates.Today;
        }
    }

    private static void SyncCustomerCode(Customer c, string? code)
    {
        if (code == null) return;
        var cc = code.Split('-')[0];
        if (c.Code != cc) c.Code = cc;
    }
}
