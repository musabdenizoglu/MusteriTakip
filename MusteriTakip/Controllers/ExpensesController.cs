using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MusteriTakip.Data;
using MusteriTakip.Helpers;
using MusteriTakip.Models;
using MusteriTakip.Models.ViewModels;
using MusteriTakip.Services;

namespace MusteriTakip.Controllers;

/// <summary>Giderler (₺). Dolar karşılığı = Tutar ÷ Dolar kuru.</summary>
public class ExpensesController : Controller
{
    private readonly AppDbContext _db;
    public ExpensesController(AppDbContext db) { _db = db; }

    public async Task<IActionResult> Index(string? period, int? edit)
    {
        var vm = new ExpensesVm { Period = period };
        if (edit != null)
        {
            var e = await _db.Expenses.FindAsync(edit.Value);
            if (e != null)
                vm.Form = new ExpenseFormVm { Id = e.Id, ExpenseTagId = e.ExpenseTagId, Note = e.Note, Amount = e.Amount, Rate = e.Rate, Date = Fmt.InputDate(e.Date) };
        }
        else vm.Form.Date = Fmt.InputDate(Dates.Today);
        await FillAsync(vm);
        return View(vm);
    }

    // GET /Expenses/Create — kasadan açılan "Gider Ekle" penceresi (sayfa değişmeden, data-modal)
    public async Task<IActionResult> Create()
    {
        var vm = new ExpensesVm();
        vm.Form.Date = Fmt.InputDate(Dates.Today);
        vm.Tags = await _db.ExpenseTags.OrderBy(t => t.SortOrder).ThenBy(t => t.Name).ToListAsync();
        return View("Form", vm);
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Save([Bind(Prefix = "Form")] ExpenseFormVm form, string? returnUrl)
    {
        var fromModal = !string.IsNullOrEmpty(returnUrl) && Url.IsLocalUrl(returnUrl);
        ExpenseTag? tag = null;
        if (!string.IsNullOrWhiteSpace(form.NewTag))
        {
            var name = form.NewTag.Trim();
            tag = await _db.ExpenseTags.FirstOrDefaultAsync(t => t.Name == name);
            if (tag == null)
            {
                tag = new ExpenseTag { Name = name, SortOrder = await _db.ExpenseTags.CountAsync() + 1 };
                _db.ExpenseTags.Add(tag);
            }
        }
        else if (form.ExpenseTagId != null) tag = await _db.ExpenseTags.FindAsync(form.ExpenseTagId.Value);
        if (tag == null) ModelState.AddModelError("Form.ExpenseTagId", "Gider türü seçilmedi. Lütfen bir gider türü seçin.");
        if (!ModelState.IsValid)
        {
            var vm = new ExpensesVm { Form = form };
            await FillAsync(vm);
            if (fromModal) { ViewData["ReturnUrl"] = returnUrl; return View("Form", vm); }
            return View("Index", vm);
        }

        Expense e;
        if (form.Id != null)
        {
            e = await _db.Expenses.FindAsync(form.Id.Value) ?? throw new InvalidOperationException("Gider bulunamadı.");
        }
        else
        {
            e = new Expense { CreatedAt = DateTime.UtcNow };
            _db.Expenses.Add(e);
        }
        e.Tag = tag;
        e.TagName = tag!.Name;
        e.Note = string.IsNullOrWhiteSpace(form.Note) ? null : form.Note.Trim();
        e.Amount = Math.Round(form.Amount!.Value, 2);
        e.Rate = form.Rate > 0 ? form.Rate : null;
        e.Date = Dates.ParseOrToday(form.Date);
        await _db.SaveChangesAsync();
        TempData["Ok"] = form.Id != null ? "Gider güncellendi." : "Gider eklendi.";
        if (fromModal) return Redirect(returnUrl!);
        return RedirectToAction(nameof(Index));
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Delete(int id)
    {
        var e = await _db.Expenses.FindAsync(id);
        if (e == null) return NotFound();
        e.DeletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        TempData["Ok"] = "Gider çöp kutusuna taşındı.";
        return RedirectToAction(nameof(Index));
    }

    private async Task FillAsync(ExpensesVm vm)
    {
        vm.Tags = await _db.ExpenseTags.OrderBy(t => t.SortOrder).ThenBy(t => t.Name).ToListAsync();
        var list = await _db.Expenses.AsNoTracking().ToListAsync();
        var range = Dates.Period(vm.Period);
        if (range != null) list = list.Where(e => e.Date >= range.Value.from && e.Date <= range.Value.to).ToList();
        vm.Items = list.OrderByDescending(e => e.Date).ThenByDescending(e => e.CreatedAt).ToList();
        vm.TotalTl = vm.Items.Sum(e => e.Amount);
        vm.TotalUsd = vm.Items.Sum(e => LedgerService.ExpenseUsd(e) ?? 0m);
    }
}
