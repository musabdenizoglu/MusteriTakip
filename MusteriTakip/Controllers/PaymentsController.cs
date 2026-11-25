using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MusteriTakip.Data;
using MusteriTakip.Helpers;
using MusteriTakip.Models;
using MusteriTakip.Models.ViewModels;
using MusteriTakip.Services;

namespace MusteriTakip.Controllers;

public class PaymentsController : Controller
{
    private readonly AppDbContext _db;
    private readonly LedgerService _ledger;

    public PaymentsController(AppDbContext db, LedgerService ledger) { _db = db; _ledger = ledger; }

    // GET /Payments/Create?customerId=5  (customerId yoksa — Genel Kasa'dan — müşteri seçilir)
    public async Task<IActionResult> Create(int? customerId, bool fromKasa = false)
    {
        var vm = new PaymentFormVm { CustomerId = customerId, FromKasa = fromKasa || customerId == null, Date = Fmt.InputDate(Dates.Today) };
        await FillAsync(vm, null);
        return View("Form", vm);
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Create(PaymentFormVm vm)
    {
        var c = await ResolveCustomerAsync(vm);
        var p = new Payment { CreatedAt = DateTime.UtcNow };
        if (c != null) Validate(vm, c, null, p);
        if (c == null || !ModelState.IsValid) { await FillAsync(vm, null); return View("Form", vm); }

        p.CustomerId = c.Id;
        _db.Payments.Add(p);
        await _db.SaveChangesAsync();
        TempData["Ok"] = $"{c.Name}: {Fmt.Usd(p.Amount)} ödeme eklendi.";
        if (!string.IsNullOrEmpty(vm.ReturnUrl) && Url.IsLocalUrl(vm.ReturnUrl)) return Redirect(vm.ReturnUrl);
        return vm.FromKasa ? RedirectToAction("Index", "Kasa") : RedirectToAction("Details", "Customers", new { id = c.Id, tab = "cari" });
    }

    public async Task<IActionResult> Edit(int id)
    {
        var p = await _db.Payments.Include(x => x.Customer).FirstOrDefaultAsync(x => x.Id == id);
        if (p == null) return NotFound();
        var vm = new PaymentFormVm
        {
            Id = p.Id,
            CustomerId = p.CustomerId,
            CustomerName = p.Customer?.Name,
            Kind = Fmt.KindText(p.Kind),
            PayType = p.PayType switch
            {
                OdemeTuru.Gram => p.Method == "Hurda altın" ? "hurda" : "gr",
                OdemeTuru.Tl => "tl",
                OdemeTuru.Eur => "eur",
                _ => "usd"
            },
            Eur = p.Eur,
            EurRate = p.EurRate,
            Method = p.Method == "Hurda altın" ? "Nakit" : p.Method,
            Amount = p.Amount,
            Gram = p.PayType == OdemeTuru.Gram && p.Method != "Hurda altın" ? p.Gram : null,
            GoldPrice = p.GoldPrice,
            Tl = p.Tl,
            Rate = p.Rate,
            HurdaGr = p.HurdaGr,
            HurdaMil = p.HurdaMil,
            GoldEqPrice = p.GoldEqPrice,
            CountAsCash = !(p.GoldEq > 0),
            Date = Fmt.InputDate(p.Date),
            Note = p.Note
        };
        await FillAsync(vm, id);
        return View("Form", vm);
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Edit(int id, PaymentFormVm vm)
    {
        var p = await _db.Payments.FirstOrDefaultAsync(x => x.Id == id);
        if (p == null) return NotFound();
        vm.CustomerId = p.CustomerId;
        var c = await _ledger.LoadCustomerAsync(p.CustomerId);
        if (c == null) return NotFound();
        Validate(vm, c, id, p);
        if (!ModelState.IsValid) { vm.Id = id; await FillAsync(vm, id); return View("Form", vm); }
        await _db.SaveChangesAsync();
        TempData["Ok"] = "Ödeme güncellendi.";
        if (!string.IsNullOrEmpty(vm.ReturnUrl) && Url.IsLocalUrl(vm.ReturnUrl)) return Redirect(vm.ReturnUrl);
        return RedirectToAction("Details", "Customers", new { id = p.CustomerId, tab = "cari" });
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Delete(int id, string? returnUrl)
    {
        var p = await _db.Payments.FindAsync(id);
        if (p == null) return NotFound();
        p.DeletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        TempData["Ok"] = "Ödeme çöp kutusuna taşındı.";
        if (!string.IsNullOrEmpty(returnUrl) && Url.IsLocalUrl(returnUrl)) return Redirect(returnUrl);
        return RedirectToAction("Details", "Customers", new { id = p.CustomerId, tab = "cari" });
    }

    // ---------------- yardımcılar ----------------

    private async Task<Customer?> ResolveCustomerAsync(PaymentFormVm vm)
    {
        Customer? c = null;
        if (vm.CustomerId > 0) c = await _ledger.LoadCustomerAsync(vm.CustomerId.Value);
        else if (!string.IsNullOrWhiteSpace(vm.CustomerName))
        {
            var name = Fmt.Upper(vm.CustomerName);
            var id = await _db.Customers.Where(x => x.Name == name).Select(x => (int?)x.Id).FirstOrDefaultAsync();
            if (id != null) c = await _ledger.LoadCustomerAsync(id.Value);
        }
        if (c == null) ModelState.AddModelError(nameof(vm.CustomerName), string.IsNullOrWhiteSpace(vm.CustomerName) ? "Lütfen müşteriyi seçin." : "Bu isimde kayıtlı müşteri yok. Listeden seçin.");
        else vm.CustomerId = c.Id;
        return c;
    }

    private async Task FillAsync(PaymentFormVm vm, int? paymentId)
    {
        vm.Customers = await _db.Customers.OrderBy(x => x.Name).ToListAsync();
        if (vm.CustomerId > 0)
        {
            var c = await _ledger.LoadCustomerAsync(vm.CustomerId.Value);
            if (c != null)
            {
                vm.CustomerName = c.Name;
                vm.GoldRemaining = LedgerService.GoldRemaining(c, paymentId);
                vm.PrevBalance = Math.Round(c.Records.Sum(r => r.Price ?? 0m) - c.Payments.Where(p => p.Id != paymentId).Sum(LedgerService.PayUsd), 2);
            }
        }
    }

    /// <summary>HTML'deki ödeme penceresi kuralları; geçerliyse p'yi doldurur.</summary>
    private void Validate(PaymentFormVm vm, Customer c, int? paymentId, Payment p)
    {
        var kind = vm.Kind == "Kalıp" ? IslemTuru.Kalip : IslemTuru.Altin;
        var mode = kind == IslemTuru.Kalip ? "kalip" : (vm.PayType ?? "usd");
        decimal? gram = null, hurdaHas = null;

        if (mode == "hurda")
        {
            if (!(vm.HurdaGr > 0) || !(vm.HurdaMil > 0)) ModelState.AddModelError(nameof(vm.HurdaGr), "Lütfen hurda gramını ve milyemi girin.");
            else { hurdaHas = LedgerService.CalcHas(vm.HurdaGr!.Value, vm.HurdaMil!.Value); gram = hurdaHas; }
        }
        else if (mode == "gr")
        {
            if (!(vm.Gram > 0)) ModelState.AddModelError(nameof(vm.Gram), "Lütfen altın gramını girin.");
            gram = vm.Gram;
        }
        else if (mode == "tl")
        {
            if (!(vm.Tl > 0)) ModelState.AddModelError(nameof(vm.Tl), "Lütfen TL tutarını girin.");
            if (!(vm.Rate > 0)) ModelState.AddModelError(nameof(vm.Rate), "Lütfen dolar kurunu girin ya da “Güncel kur”a basın.");
            if (vm.Tl > 0 && vm.Rate > 0 && !(vm.Amount > 0)) vm.Amount = Math.Round(vm.Tl.Value / vm.Rate.Value, 2);
        }
        else if (mode == "eur")
        {
            if (!(vm.Eur > 0)) ModelState.AddModelError(nameof(vm.Eur), "Lütfen euro tutarını girin.");
            if (!(vm.EurRate > 0)) ModelState.AddModelError(nameof(vm.EurRate), "Lütfen €/$ paritesini girin.");
            if (vm.Eur > 0 && vm.EurRate > 0) vm.Amount = Math.Round(vm.Eur.Value * vm.EurRate.Value, 2);
        }

        if ((mode == "gr" || mode == "hurda") && !(vm.Amount > 0) && gram > 0 && vm.GoldPrice > 0)
            vm.Amount = Math.Round(gram.Value * vm.GoldPrice.Value, 2);
        if (!(vm.Amount > 0)) ModelState.AddModelError(nameof(vm.Amount), "Lütfen tutarı ($) girin.");

        var remaining = LedgerService.GoldRemaining(c, paymentId);
        var wantsGoldEq = kind == IslemTuru.Altin && (mode == "usd" || mode == "tl" || mode == "eur") && !vm.CountAsCash && remaining > 0.0005m;
        if (wantsGoldEq && !(vm.GoldEqPrice > 0))
            ModelState.AddModelError(nameof(vm.GoldEqPrice), "Tutarı altına çevirmek için altın fiyatını ($/gr) yazın ya da “nakit borcuna sayılsın” kutusunu işaretleyin.");

        if (!ModelState.IsValid) return;

        p.Date = Dates.ParseOrToday(vm.Date);
        p.Amount = Math.Round(vm.Amount!.Value, 2);
        p.Kind = kind;
        p.Note = string.IsNullOrWhiteSpace(vm.Note) ? null : Fmt.Upper(vm.Note);
        p.Method = mode == "hurda" ? "Hurda altın" : (string.IsNullOrWhiteSpace(vm.Method) ? "Nakit" : vm.Method);
        p.PayType = mode switch { "kalip" => OdemeTuru.Yok, "gr" or "hurda" => OdemeTuru.Gram, "tl" => OdemeTuru.Tl, "eur" => OdemeTuru.Eur, _ => OdemeTuru.Usd };
        p.Eur = mode == "eur" ? vm.Eur : null;
        p.EurRate = mode == "eur" ? vm.EurRate : null;
        p.Gram = gram;
        p.GoldPrice = (mode == "gr" || mode == "hurda") && vm.GoldPrice > 0 ? vm.GoldPrice : null;
        p.Tl = mode == "tl" && vm.Tl > 0 ? vm.Tl : null;
        p.Rate = vm.Rate > 0 ? vm.Rate : null;
        p.HurdaGr = mode == "hurda" ? vm.HurdaGr : null;
        p.HurdaMil = mode == "hurda" ? vm.HurdaMil : null;
        p.HurdaHas = hurdaHas;
        p.GoldEq = null;
        p.GoldEqPrice = null;
        if (wantsGoldEq)
        {
            var gq = Math.Min(Math.Round(p.Amount / vm.GoldEqPrice!.Value, 3), remaining);
            if (gq > 0.0005m) { p.GoldEq = gq; p.GoldEqPrice = vm.GoldEqPrice; }
        }
        // HTML: nakit hesabına işlenen $/₺/€ ödemede etiket boş (Nakit-$/₺/€); Kalıp etiketi korunur
        if (mode is "usd" or "tl" or "eur" && !(p.GoldEq > 0)) p.Kind = vm.Kind == "Kalıp" ? IslemTuru.Kalip : null;
    }
}
