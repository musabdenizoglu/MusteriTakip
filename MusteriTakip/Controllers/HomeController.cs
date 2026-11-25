using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MusteriTakip.Helpers;
using MusteriTakip.Models;
using MusteriTakip.Models.ViewModels;
using MusteriTakip.Services;

namespace MusteriTakip.Controllers;

public class HomeController : Controller
{
    private readonly LedgerService _ledger;
    public HomeController(LedgerService ledger) { _ledger = ledger; }

    public async Task<IActionResult> Index(string? q)
    {
        //bu metod uygulamanın başlangıç metodudur.
        var customers = await _ledger.LoadCustomersAsync();
        var expenses = await _ledger.LoadExpensesAsync();
        var today = Dates.Today;
        var m0 = new DateOnly(today.Year, today.Month, 1);
        var m1 = m0.AddMonths(-1);

        MonthStat Stat(DateOnly from, int days = 0)
        {
            var to = days > 0 ? from.AddDays(days) : from.AddMonths(1);
            var recs = customers.SelectMany(c => c.Records).Where(r => r.Date >= from && r.Date < to).ToList();
            var pays = customers.SelectMany(c => c.Payments).Where(p => p.Date >= from && p.Date < to);
            return new MonthStat
            {
                Jobs = recs.Count(r => !r.IsDebt),
                Ciro = recs.Sum(r => r.Price ?? 0m),
                Tahsilat = pays.Sum(LedgerService.PayCash),
                GiderUsd = expenses.Where(e => e.Date >= from && e.Date < to).Sum(e => LedgerService.ExpenseUsd(e) ?? 0m)
            };
        }

        var kasa = LedgerService.Kasa(customers, expenses);
        var rests = customers.Select(c => (c, rest: LedgerService.CustomerTotals(c).Rest)).ToList();

        var timeline = LedgerService.Movements(customers, null);
        if (!string.IsNullOrWhiteSpace(q))
        {
            var terms = q.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(t => t.ToLower(Fmt.Tr)).ToList();
            timeline = timeline.Where(m => terms.Any(t =>
                m.CustomerName.ToLower(Fmt.Tr).Contains(t) ||
                m.Description.ToLower(Fmt.Tr).Contains(t) ||
                (m.Code ?? "").ToLower(Fmt.Tr).Contains(t) ||
                Fmt.Date(m.Date).Contains(t))).ToList();
        }

        var vm = new DashboardVm
        {
            MonthTitle = Fmt.Month(today.Year, today.Month),
            This = Stat(m0),
            Prev = Stat(m1),
            Today = Stat(today, 1),
            KasaBakiye = kasa.Bakiye,
            TotalRest = rests.Sum(x => x.rest),
            TotalGoldRest = customers.Sum(c => LedgerService.GoldRemaining(c)),
            CustomerCount = customers.Count,
            DebtorCount = rests.Count(x => x.rest > 0.004m),
            TopDebtors = rests.Where(x => x.rest > 0.004m).OrderByDescending(x => x.rest).Take(5).ToList(),
            Timeline = timeline.Take(200).ToList(),
            Search = q,
            Recent = BuildRecent(customers, expenses)
        };
        return View(vm);
    }

    /// <summary>
    /// HTML'deki renderHomeRecent() karşılığı: siparişler, ödemeler ve giderler tek listede,
    /// en son eklenen/değiştirilen en üstte.
    /// </summary>
    static List<RecentItem> BuildRecent(List<Customer> customers, List<Expense> expenses)
    {
        var items = new List<RecentItem>();
        foreach (var c in customers)
        {
            var cc = Ui.CustCode(c);
            foreach (var r in c.Records)
            {
                var kind = Ui.RecKind(r);
                items.Add(new RecentItem
                {
                    Ev = "rec", CustomerId = c.Id, RecordId = r.Id, Rec = r, CustName = c.Name, Date = r.Date,
                    CreatedAt = r.CreatedAt, EditedAt = r.EditedAt,
                    SortAt = r.UpdatedAt is { } u && u > r.CreatedAt ? u : r.CreatedAt,
                    Image = r.ImagePath, Note = r.Note, EditNote = r.EditNote, Code = r.Code ?? "", CustCode = cc, Model = r.Model,
                    Kind = kind, KindCls = Ui.RecKindCls(r),
                    TlTag = kind, TlAmt = Fmt.Usd(r.Price)
                });
            }
            foreach (var p in c.Payments)
            {
                if (p.ArchDevirYear != null) continue;
                var isGr = p.PayType == OdemeTuru.Gram && (p.Gram ?? 0) > 0;
                items.Add(new RecentItem
                {
                    Ev = "pay", CustomerId = c.Id, CustName = c.Name, Date = p.Date, CreatedAt = p.CreatedAt,
                    Code = Ui.PayCode(p, c), CodeCls = Ui.PayCls(p), CustCode = cc, Model = Ui.PayMain(p),
                    Kind = "Ödeme", Badge = Ui.PayBadge(p),
                    TlTag = Ui.IsHurda(p) ? "Hurda" : p.PayType switch { OdemeTuru.Gram => "Has", OdemeTuru.Tl => "Nakit-₺", _ => "Nakit-$" },
                    TlAmt = isGr ? "+" + Fmt.Gr(p.Gram) : "+" + Fmt.Usd(p.Amount),
                    TlAmtSub = isGr ? Fmt.Usd(p.Amount) : (p.PayType == OdemeTuru.Tl && (p.Tl ?? 0) > 0 ? Fmt.Tl(p.Tl) : null)
                });
            }
        }
        foreach (var x in expenses)
        {
            var u = LedgerService.ExpenseUsd(x);
            var label = LedgerService.ExpenseLabel(x);
            items.Add(new RecentItem
            {
                Ev = "exp", CustName = label, Date = x.Date, CreatedAt = x.CreatedAt,
                Model = string.IsNullOrWhiteSpace(x.Note) ? label : x.Note!.Trim(), Kind = "Gider", Badge = "−",
                TlTag = label, TlAmt = "−" + (u != null ? Fmt.Usd(u) : Fmt.Tl(x.Amount)), TlAmtSub = u != null ? Fmt.Tl(x.Amount) : null
            });
        }
        foreach (var i in items) if (i.SortAt == default) i.SortAt = i.CreatedAt;
        return items.OrderByDescending(i => i.SortAt).ToList();
    }

    [AllowAnonymous]
    public IActionResult Error() => View();
}
