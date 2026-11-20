using Microsoft.AspNetCore.Mvc;
using MusteriTakip.Helpers;
using MusteriTakip.Models;
using MusteriTakip.Models.ViewModels;
using MusteriTakip.Services;

namespace MusteriTakip.Controllers;

public class ReportsController : Controller
{
    private readonly LedgerService _ledger;
    public ReportsController(LedgerService ledger) { _ledger = ledger; }

    public async Task<IActionResult> Index(int? year)
    {
        var customers = await _ledger.LoadCustomersAsync();
        var expenses = await _ledger.LoadExpensesAsync();
        var y = year ?? Dates.Today.Year;

        var years = customers.SelectMany(c => c.Records.Select(r => r.Date.Year).Concat(c.Payments.Select(p => p.Date.Year)))
            .Concat(expenses.Select(e => e.Date.Year)).Append(Dates.Today.Year).Distinct().OrderByDescending(x => x).ToList();

        var recs = customers.SelectMany(c => c.Records.Select(r => (c, r))).Where(x => x.r.Date.Year == y).ToList();
        var pays = customers.SelectMany(c => c.Payments).Where(p => p.Date.Year == y).ToList();
        var exps = expenses.Where(e => e.Date.Year == y).ToList();

        var months = Enumerable.Range(1, 12).Select(m => new MonthRow
        {
            Month = m,
            Jobs = recs.Count(x => x.r.Date.Month == m && !x.r.IsDebt),
            Ciro = recs.Where(x => x.r.Date.Month == m && !x.r.IsDebt).Sum(x => x.r.Price ?? 0m),
            Cost = recs.Where(x => x.r.Date.Month == m && !x.r.IsDebt).Sum(x => LedgerService.RecordCost(x.r) ?? 0m),
            Tahsilat = pays.Where(p => p.Date.Month == m).Sum(LedgerService.PayCash),
            GiderUsd = exps.Where(e => e.Date.Month == m).Sum(e => LedgerService.ExpenseUsd(e) ?? 0m),
            GoldOut = recs.Where(x => x.r.Date.Month == m).Sum(x => LedgerService.RecGoldOut(x.r)),
            GoldIn = pays.Where(p => p.Date.Month == m).Sum(LedgerService.GoldPaid)
        }).ToList();

        var byTag = exps.GroupBy(e => LedgerService.ExpenseLabel(e))
            .Select(g => new NameValue { Name = g.Key, Value = g.Sum(e => LedgerService.ExpenseUsd(e) ?? 0m), Extra = g.Sum(e => e.Amount), Count = g.Count() })
            .OrderByDescending(x => x.Value).ToList();

        var top = recs.Where(x => !x.r.IsDebt).GroupBy(x => x.c)
            .Select(g => new NameValue
            {
                Id = g.Key.Id,
                Name = g.Key.Name,
                Value = g.Sum(x => x.r.Price ?? 0m),
                Extra = g.Sum(x => LedgerService.RecordProfit(x.r) ?? 0m),
                Count = g.Count()
            })
            .OrderByDescending(x => x.Value).Take(10).ToList();

        var kinds = recs.Where(x => !x.r.IsDebt).GroupBy(x => x.r.Kind)
            .Select(g => new NameValue { Name = Fmt.KindText(g.Key) is { Length: > 0 } k ? k : "Diğer", Value = g.Sum(x => x.r.Price ?? 0m), Count = g.Count() })
            .OrderByDescending(x => x.Value).ToList();

        return View(new ReportsVm { Year = y, Years = years, Months = months, ExpenseByTag = byTag, TopCustomers = top, KindSplit = kinds });
    }
}
