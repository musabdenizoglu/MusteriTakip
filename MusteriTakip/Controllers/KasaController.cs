using ClosedXML.Excel;
using Microsoft.AspNetCore.Mvc;
using MusteriTakip.Helpers;
using MusteriTakip.Models.ViewModels;
using MusteriTakip.Services;

namespace MusteriTakip.Controllers;

/// <summary>Genel Kasa: tüm sipariş, borç, ödeme ve gider hareketleri.</summary>
public class KasaController : Controller
{
    private readonly LedgerService _ledger;
    public KasaController(LedgerService ledger) { _ledger = ledger; }

    public async Task<IActionResult> Index(string? q, string? period)
    {
        var (items, totals) = await LoadAsync(q, period);
        var vm = new KasaVm
        {
            Totals = totals,
            Items = items,
            Search = q,
            Period = period,
            Filtered = !string.IsNullOrWhiteSpace(q) || !string.IsNullOrEmpty(period),
            SumDebt = items.Where(i => i.Type is MovementType.Order or MovementType.Debt).Sum(i => i.AmountUsd),
            SumPay = items.Where(i => i.Type == MovementType.Payment).Sum(i => i.CashUsd),
            SumExpense = items.Where(i => i.Type == MovementType.Expense).Sum(i => i.AmountUsd)
        };
        return View(vm);
    }

    /// <summary>Hareketleri Excel dosyasına aktar (filtre uygulanmış hali).</summary>
    public async Task<IActionResult> Excel(string? q, string? period)
    {
        var (items, _) = await LoadAsync(q, period);
        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Hareketler");
        string[] head = { "Tarih", "Tür", "Müşteri / Gider", "Kod", "Açıklama", "Tutar ($)", "Kasaya giren ($)", "TL (₺)", "Altın (gr)" };
        for (int i = 0; i < head.Length; i++) ws.Cell(1, i + 1).Value = head[i];
        ws.Row(1).Style.Font.Bold = true;
        int r = 2;
        foreach (var m in items)
        {
            ws.Cell(r, 1).Value = m.Date.ToDateTime(TimeOnly.MinValue);
            ws.Cell(r, 1).Style.DateFormat.Format = "dd.mm.yyyy";
            ws.Cell(r, 2).Value = m.TypeText;
            ws.Cell(r, 3).Value = m.CustomerName;
            ws.Cell(r, 4).Value = m.Code ?? "";
            ws.Cell(r, 5).Value = m.Description;
            ws.Cell(r, 6).Value = (double)(m.Type == MovementType.Expense ? -m.AmountUsd : m.AmountUsd);
            ws.Cell(r, 7).Value = (double)m.CashUsd;
            if (m.AmountTl.HasValue) ws.Cell(r, 8).Value = (double)m.AmountTl.Value;
            ws.Cell(r, 9).Value = (double)m.Gold;
            r++;
        }
        ws.Range(2, 6, Math.Max(2, r), 8).Style.NumberFormat.Format = "#,##0.00";
        ws.Range(2, 9, Math.Max(2, r), 9).Style.NumberFormat.Format = "#,##0.000";
        ws.Columns().AdjustToContents();
        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return File(ms.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"kasa-hareketleri-{Dates.Today:yyyy-MM-dd}.xlsx");
    }

    private async Task<(List<Movement> items, KasaTotals totals)> LoadAsync(string? q, string? period)
    {
        var customers = await _ledger.LoadCustomersAsync();
        var expenses = await _ledger.LoadExpensesAsync();
        var totals = LedgerService.Kasa(customers, expenses);
        IEnumerable<Movement> items = LedgerService.Movements(customers, expenses);

        var range = Dates.Period(period);
        if (range != null) items = items.Where(m => m.Date >= range.Value.from && m.Date <= range.Value.to);

        if (!string.IsNullOrWhiteSpace(q))
        {
            var terms = q.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).Select(t => t.ToLower(Fmt.Tr)).ToList();
            items = items.Where(m => terms.Any(t =>
                m.CustomerName.ToLower(Fmt.Tr).Contains(t) ||
                m.Description.ToLower(Fmt.Tr).Contains(t) ||
                (m.Code ?? "").ToLower(Fmt.Tr).Contains(t) ||
                m.TypeText.ToLower(Fmt.Tr).Contains(t) ||
                Fmt.Date(m.Date).Contains(t)));
        }
        return (items.ToList(), totals);
    }
}
