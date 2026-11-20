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

        MonthStat Stat(DateOnly from)
        {
            var to = from.AddMonths(1);
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
            KasaBakiye = kasa.Bakiye,
            TotalRest = rests.Sum(x => x.rest),
            TotalGoldRest = customers.Sum(c => LedgerService.GoldRemaining(c)),
            CustomerCount = customers.Count,
            DebtorCount = rests.Count(x => x.rest > 0.004m),
            TopDebtors = rests.Where(x => x.rest > 0.004m).OrderByDescending(x => x.rest).Take(5).ToList(),
            Timeline = timeline.Take(200).ToList(),
            Search = q
        };
        return View(vm);
    }

    [AllowAnonymous]
    public IActionResult Error() => View();
}
