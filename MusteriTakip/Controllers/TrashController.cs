using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MusteriTakip.Data;
using MusteriTakip.Helpers;
using MusteriTakip.Models.ViewModels;
using MusteriTakip.Services;

namespace MusteriTakip.Controllers;

/// <summary>Çöp kutusu: silinenler 30 gün tutulur, geri alınabilir ya da kalıcı silinir.</summary>
public class TrashController : Controller
{
    const int Days = 30;
    private readonly AppDbContext _db;
    private readonly ImageService _img;

    public TrashController(AppDbContext db, ImageService img) { _db = db; _img = img; }

    public async Task<IActionResult> Index()
    {
        await PurgeOldAsync();
        var items = new List<TrashItem>();

        foreach (var c in await _db.Customers.IgnoreQueryFilters().Where(x => x.DeletedAt != null).ToListAsync())
            items.Add(new TrashItem { Type = "customer", Id = c.Id, Title = c.Name, Value = "", DeletedAt = c.DeletedAt!.Value });

        foreach (var r in await _db.OrderRecords.IgnoreQueryFilters().Include(x => x.Customer).Where(x => x.DeletedAt != null).ToListAsync())
            items.Add(new TrashItem { Type = r.IsDebt ? "debt" : "record", Id = r.Id, Title = (r.Customer?.Name ?? "?") + " · " + (r.Code != null ? r.Code + " · " : "") + r.Model, Value = Fmt.Usd(r.Price), DeletedAt = r.DeletedAt!.Value });

        foreach (var p in await _db.Payments.IgnoreQueryFilters().Include(x => x.Customer).Where(x => x.DeletedAt != null).ToListAsync())
            items.Add(new TrashItem { Type = "payment", Id = p.Id, Title = (p.Customer?.Name ?? "?") + " · " + LedgerService.PayDesc(p), Value = Fmt.Usd(p.Amount), DeletedAt = p.DeletedAt!.Value });

        foreach (var e in await _db.Expenses.IgnoreQueryFilters().Where(x => x.DeletedAt != null).ToListAsync())
            items.Add(new TrashItem { Type = "expense", Id = e.Id, Title = LedgerService.ExpenseLabel(e) + (e.Note != null ? " · " + e.Note : ""), Value = Fmt.Tl(e.Amount), DeletedAt = e.DeletedAt!.Value });

        return View(items.OrderByDescending(i => i.DeletedAt).ToList());
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Restore(string type, int id)
    {
        switch (type)
        {
            case "customer":
                var c = await _db.Customers.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == id);
                if (c != null) c.DeletedAt = null;
                break;
            case "record":
            case "debt":
                var r = await _db.OrderRecords.IgnoreQueryFilters().Include(x => x.Customer).FirstOrDefaultAsync(x => x.Id == id);
                if (r != null)
                {
                    if (r.Customer?.DeletedAt != null) { TempData["Error"] = $"“{r.Customer.Name}” müşterisi de silinmiş. Önce müşteriyi geri alın."; return RedirectToAction(nameof(Index)); }
                    r.DeletedAt = null;
                }
                break;
            case "payment":
                var p = await _db.Payments.IgnoreQueryFilters().Include(x => x.Customer).FirstOrDefaultAsync(x => x.Id == id);
                if (p != null)
                {
                    if (p.Customer?.DeletedAt != null) { TempData["Error"] = $"“{p.Customer.Name}” müşterisi de silinmiş. Önce müşteriyi geri alın."; return RedirectToAction(nameof(Index)); }
                    p.DeletedAt = null;
                }
                break;
            case "expense":
                var e = await _db.Expenses.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == id);
                if (e != null) e.DeletedAt = null;
                break;
        }
        await _db.SaveChangesAsync();
        TempData["Ok"] = "Geri alındı.";
        return RedirectToAction(nameof(Index));
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Purge(string type, int id)
    {
        await PurgeAsync(type, id);
        await _db.SaveChangesAsync();
        TempData["Ok"] = "Kalıcı olarak silindi.";
        return RedirectToAction(nameof(Index));
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Empty()
    {
        await PurgeOldAsync(TimeSpan.Zero);
        TempData["Ok"] = "Çöp kutusu boşaltıldı.";
        return RedirectToAction(nameof(Index));
    }

    private async Task PurgeAsync(string type, int id)
    {
        switch (type)
        {
            case "customer":
                var c = await _db.Customers.IgnoreQueryFilters().Include(x => x.Records).Include(x => x.Payments).FirstOrDefaultAsync(x => x.Id == id);
                if (c != null)
                {
                    _img.Delete(c.ImagePath);
                    foreach (var r in await _db.OrderRecords.IgnoreQueryFilters().Where(x => x.CustomerId == id).ToListAsync()) _img.Delete(r.ImagePath);
                    _db.OrderRecords.RemoveRange(await _db.OrderRecords.IgnoreQueryFilters().Where(x => x.CustomerId == id).ToListAsync());
                    _db.Payments.RemoveRange(await _db.Payments.IgnoreQueryFilters().Where(x => x.CustomerId == id).ToListAsync());
                    _db.Customers.Remove(c);
                }
                break;
            case "record":
            case "debt":
                var rr = await _db.OrderRecords.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == id);
                if (rr != null) { _img.Delete(rr.ImagePath); _db.OrderRecords.Remove(rr); }
                break;
            case "payment":
                var p = await _db.Payments.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == id);
                if (p != null) _db.Payments.Remove(p);
                break;
            case "expense":
                var e = await _db.Expenses.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == id);
                if (e != null) _db.Expenses.Remove(e);
                break;
        }
    }

    /// <summary>30 günden eski (ya da verilen süreden eski) silinenleri kalıcı siler.</summary>
    private async Task PurgeOldAsync(TimeSpan? age = null)
    {
        var limit = DateTime.UtcNow - (age ?? TimeSpan.FromDays(Days));
        var cs = await _db.Customers.IgnoreQueryFilters().Where(x => x.DeletedAt != null && x.DeletedAt <= limit).Select(x => x.Id).ToListAsync();
        foreach (var id in cs) await PurgeAsync("customer", id);
        var rs = await _db.OrderRecords.IgnoreQueryFilters().Where(x => x.DeletedAt != null && x.DeletedAt <= limit).Select(x => x.Id).ToListAsync();
        foreach (var id in rs) await PurgeAsync("record", id);
        var ps = await _db.Payments.IgnoreQueryFilters().Where(x => x.DeletedAt != null && x.DeletedAt <= limit).Select(x => x.Id).ToListAsync();
        foreach (var id in ps) await PurgeAsync("payment", id);
        var es = await _db.Expenses.IgnoreQueryFilters().Where(x => x.DeletedAt != null && x.DeletedAt <= limit).Select(x => x.Id).ToListAsync();
        foreach (var id in es) await PurgeAsync("expense", id);
        await _db.SaveChangesAsync();
    }
}
