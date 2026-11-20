using Microsoft.EntityFrameworkCore;
using MusteriTakip.Data;
using MusteriTakip.Helpers;
using MusteriTakip.Models;

namespace MusteriTakip.Services;

public enum MovementType { Order, Debt, Payment, Expense }

/// <summary>Genel Kasa / zaman çizgisi / ekstre satırı.</summary>
public class Movement
{
    public MovementType Type { get; set; }
    public int Id { get; set; }
    public DateOnly Date { get; set; }
    public DateTime CreatedAt { get; set; }
    public int? CustomerId { get; set; }
    public string CustomerName { get; set; } = "";
    public string? Code { get; set; }
    public string Description { get; set; } = "";
    public string? SubText { get; set; }
    public IslemTuru? Kind { get; set; }
    /// <summary>Sipariş/borç: fiyat ($). Ödeme: tutar ($). Gider: dolar karşılığı.</summary>
    public decimal AmountUsd { get; set; }
    /// <summary>Ödemenin dolar (işçilik) hesabından düşen kısmı.</summary>
    public decimal PayUsd { get; set; }
    /// <summary>Kasaya giren nakit ($).</summary>
    public decimal CashUsd { get; set; }
    public decimal? AmountTl { get; set; }
    /// <summary>Altın hesabı: sipariş çıkışı (+) ya da ödeme (−) gram.</summary>
    public decimal Gold { get; set; }
    public string? ImagePath { get; set; }
    public bool MissingRate { get; set; }

    public string TypeText => Type switch
    {
        MovementType.Order => "Sipariş",
        MovementType.Debt => "Borç",
        MovementType.Payment => "Ödeme",
        _ => "Gider"
    };
}

public class Totals
{
    public decimal Ciro { get; set; }
    public decimal Paid { get; set; }
    public decimal Rest => Ciro - Paid;
    public decimal GoldTotal { get; set; }
    public decimal GoldPaid { get; set; }
    public decimal GoldRest => GoldTotal - GoldPaid;
}

public class KasaTotals
{
    public decimal Ciro { get; set; }
    public decimal Tahsilat { get; set; }
    public decimal GiderUsd { get; set; }
    public decimal GiderTl { get; set; }
    public int MissingRate { get; set; }
    public decimal Bakiye => Tahsilat - GiderUsd;
    public decimal GoldTotal { get; set; }
    public decimal GoldPaid { get; set; }
    public decimal GoldRest => GoldTotal - GoldPaid;
}

public class StatementRow
{
    public DateOnly Date { get; set; }
    public string Description { get; set; } = "";
    public decimal Debt { get; set; }
    public decimal Pay { get; set; }
    public decimal Balance { get; set; }
    public bool IsCarry { get; set; }
}

/// <summary>
/// HTML sürümündeki hesap kuralları (iki ayrı hesap: dolar/işçilik ve altın gram).
/// SQLite decimal toplamayı sunucuda desteklemediği için hesaplar bellekte yapılır.
/// </summary>
public class LedgerService
{
    private readonly AppDbContext _db;
    public LedgerService(AppDbContext db) { _db = db; }

    // ---------------- Tek kayıt hesapları ----------------

    /// <summary>Altın çıkış (gr): girilmişse o, yoksa gr × milyem / 1000 (aşağı yuvarlanır).</summary>
    public static decimal RecGoldOut(OrderRecord r)
    {
        if (r.AltinCikis.HasValue) return r.AltinCikis.Value;
        if (r.AltinGram > 0 && r.AltinMilyem > 0) return CalcHas(r.AltinGram.Value, r.AltinMilyem.Value);
        return 0m;
    }

    /// <summary>gr × milyem / 1000, binde bire aşağı yuvarlanır.</summary>
    public static decimal CalcHas(decimal gram, decimal milyem) => Math.Floor(gram * milyem) / 1000m;

    /// <summary>Ödemenin altın hesabından düşen gramı.</summary>
    public static decimal GoldPaid(Payment p) => p.PayType == OdemeTuru.Gram ? (p.Gram ?? 0m) : (p.GoldEq ?? 0m);

    /// <summary>Ödemenin dolar (işçilik) hesabından düşen kısmı. Has/hurda ödeme 0.</summary>
    public static decimal PayUsd(Payment p)
    {
        if (p.PayType == OdemeTuru.Gram) return 0m;
        var a = p.Amount;
        if (p.GoldEq > 0 && p.GoldEqPrice > 0)
        {
            var left = a - p.GoldEq.Value * p.GoldEqPrice.Value;
            return left < p.GoldEqPrice.Value * 0.001m ? 0m : Math.Round(left, 2);
        }
        return a;
    }

    /// <summary>Kasaya gerçekten giren nakit ($). Has/hurda ödeme 0.</summary>
    public static decimal PayCash(Payment p) => p.PayType == OdemeTuru.Gram ? 0m : p.Amount;

    public static decimal ExpenseTotal(OrderRecord r) => r.Expenses.Sum(e => e.Amount);

    /// <summary>Sipariş maliyeti: mum + gümüş + altın işçilik + çizim + masraflar (Kalıp'ta sadece masraflar).</summary>
    public static decimal? RecordCost(OrderRecord r)
    {
        if (r.IsDebt) return null;
        var ex = ExpenseTotal(r);
        if (r.Kind == IslemTuru.Kalip) return ex;
        var parts = new[] { r.MumIscilik, r.GumusUsd, r.AltinIscilik, r.Cizim };
        if (parts.All(x => x == null)) return ex > 0 ? ex : null;
        return parts.Sum(x => x ?? 0m) + ex;
    }

    public static decimal? RecordProfit(OrderRecord r)
    {
        var cost = RecordCost(r);
        if (cost == null || r.Price == null) return null;
        return r.Price.Value - cost.Value;
    }

    public static decimal? ExpenseUsd(Expense e) => e.Rate > 0 ? Math.Round(e.Amount / e.Rate.Value, 2) : null;

    public static string ExpenseLabel(Expense e) => !string.IsNullOrWhiteSpace(e.TagName) ? e.TagName! : (!string.IsNullOrWhiteSpace(e.Name) ? e.Name! : "Gider");

    public static string RecDesc(OrderRecord r)
    {
        if (r.IsDebt) return (r.IsOpening ? "Eski bakiye · " : "Eski borç · ") + r.Model;
        var k = Fmt.KindText(r.Kind);
        return (k != "" ? k + " · " : "") + r.Model;
    }

    /// <summary>Ödemenin açıklaması (ör. "Has 3,744 gr × 105,00 $/gr", "4.250,00 ₺ ÷ 42,5").</summary>
    public static string PayDesc(Payment p)
    {
        var bits = new List<string>();
        if (p.PayType == OdemeTuru.Gram)
        {
            if (p.Method == "Hurda altın" && p.HurdaGr > 0)
                bits.Add($"Hurda {Fmt.Num(p.HurdaGr)} gr × {Fmt.Num(p.HurdaMil, 0)} → {Fmt.Gr(p.Gram)} has");
            else
                bits.Add($"Has {Fmt.Gr(p.Gram)}");
            if (p.GoldPrice > 0) bits.Add($"{Fmt.Usd(p.GoldPrice)}/gr");
        }
        else if (p.PayType == OdemeTuru.Tl)
        {
            bits.Add($"{Fmt.Tl(p.Tl)} ÷ {Fmt.Rate(p.Rate)}");
        }
        else if (p.PayType == OdemeTuru.Usd)
        {
            bits.Add("Dolar");
        }
        if (p.Method != "Hurda altın" && !string.IsNullOrEmpty(p.Method)) bits.Add(p.Method);
        if (p.GoldEq > 0) bits.Add($"{Fmt.Gr(p.GoldEq)} altın borcuna");
        var head = "Ödeme" + (p.Kind == IslemTuru.Kalip ? " (Kalıp)" : "");
        var text = head + " – " + string.Join(" · ", bits);
        if (!string.IsNullOrWhiteSpace(p.Note)) text += " · " + p.Note;
        return text;
    }

    // ---------------- Toplamlar ----------------

    public static Totals CustomerTotals(Customer c, IslemTuru? kind = null)
    {
        var recs = c.Records.Where(r => kind == null || r.Kind == kind || (r.IsDebt && kind == null));
        var pays = c.Payments.Where(p => kind == null || p.Kind == kind);
        return new Totals
        {
            Ciro = recs.Sum(r => r.Price ?? 0m),
            Paid = pays.Sum(PayUsd),
            GoldTotal = recs.Sum(RecGoldOut),
            GoldPaid = pays.Sum(GoldPaid)
        };
    }

    public static decimal GoldRemaining(Customer c, int? exceptPaymentId = null)
    {
        var outG = c.Records.Sum(RecGoldOut);
        var paid = c.Payments.Where(p => p.Id != exceptPaymentId).Sum(GoldPaid);
        return Math.Round(outG - paid, 3);
    }

    public static KasaTotals Kasa(IEnumerable<Customer> customers, IEnumerable<Expense> expenses)
    {
        var cs = customers.ToList();
        var ex = expenses.ToList();
        return new KasaTotals
        {
            Ciro = cs.SelectMany(c => c.Records).Sum(r => r.Price ?? 0m),
            Tahsilat = cs.SelectMany(c => c.Payments).Sum(PayCash),
            GiderUsd = ex.Sum(e => ExpenseUsd(e) ?? 0m),
            GiderTl = ex.Sum(e => e.Amount),
            MissingRate = ex.Count(e => !(e.Rate > 0)),
            GoldTotal = cs.SelectMany(c => c.Records).Sum(RecGoldOut),
            GoldPaid = cs.SelectMany(c => c.Payments).Sum(GoldPaid)
        };
    }

    // ---------------- Veri yükleme ----------------

    public Task<List<Customer>> LoadCustomersAsync() =>
        _db.Customers
            .Include(c => c.Records).ThenInclude(r => r.Expenses)
            .Include(c => c.Payments)
            .AsSplitQuery()
            .AsNoTracking()
            .ToListAsync();

    public Task<List<Expense>> LoadExpensesAsync() => _db.Expenses.AsNoTracking().ToListAsync();

    public Task<Customer?> LoadCustomerAsync(int id) =>
        _db.Customers
            .Include(c => c.Records).ThenInclude(r => r.Expenses)
            .Include(c => c.Payments)
            .AsSplitQuery()
            .FirstOrDefaultAsync(c => c.Id == id);

    // ---------------- Hareket listeleri ----------------

    public static List<Movement> Movements(IEnumerable<Customer> customers, IEnumerable<Expense>? expenses)
    {
        var list = new List<Movement>();
        foreach (var c in customers)
        {
            foreach (var r in c.Records)
            {
                var g = RecGoldOut(r);
                list.Add(new Movement
                {
                    Type = r.IsDebt ? MovementType.Debt : MovementType.Order,
                    Id = r.Id,
                    Date = r.Date,
                    CreatedAt = r.EditedAt ?? r.CreatedAt,
                    CustomerId = c.Id,
                    CustomerName = c.Name,
                    Code = r.Code,
                    Kind = r.Kind,
                    Description = RecDesc(r),
                    SubText = g > 0 ? $"{Fmt.Num(r.AltinGram)} gr × {Fmt.Num(r.AltinMilyem, 0)} = {Fmt.Gr(g)}" : null,
                    AmountUsd = r.Price ?? 0m,
                    Gold = g,
                    ImagePath = r.ImagePath
                });
            }
            foreach (var p in c.Payments)
            {
                list.Add(new Movement
                {
                    Type = MovementType.Payment,
                    Id = p.Id,
                    Date = p.Date,
                    CreatedAt = p.CreatedAt,
                    CustomerId = c.Id,
                    CustomerName = c.Name,
                    Kind = p.Kind,
                    Description = PayDesc(p),
                    SubText = p.PayType == OdemeTuru.Gram ? "altın hesabına" : (p.GoldEq > 0 ? $"{Fmt.Gr(p.GoldEq)} altın hesabına" : null),
                    AmountUsd = p.Amount,
                    PayUsd = PayUsd(p),
                    CashUsd = PayCash(p),
                    AmountTl = p.Tl,
                    Gold = -GoldPaid(p)
                });
            }
        }
        if (expenses != null)
        {
            foreach (var e in expenses)
            {
                var usd = ExpenseUsd(e);
                list.Add(new Movement
                {
                    Type = MovementType.Expense,
                    Id = e.Id,
                    Date = e.Date,
                    CreatedAt = e.CreatedAt,
                    CustomerName = ExpenseLabel(e),
                    Description = string.IsNullOrWhiteSpace(e.Note) ? ExpenseLabel(e) : e.Note!,
                    SubText = e.Rate > 0 ? $"{Fmt.Tl(e.Amount)} ÷ {Fmt.Rate(e.Rate)}" : "kur girilmemiş",
                    AmountUsd = usd ?? 0m,
                    AmountTl = e.Amount,
                    MissingRate = usd == null
                });
            }
        }
        return list.OrderByDescending(m => m.Date).ThenByDescending(m => m.CreatedAt).ToList();
    }

    /// <summary>Dolar hesabı ekstresi: devreden bakiye + dönem hareketleri + yürüyen bakiye.</summary>
    public static List<StatementRow> Statement(Customer c, DateOnly? from, DateOnly? to)
    {
        var mv = new List<(DateOnly date, DateTime at, string desc, decimal debt, decimal pay)>();
        foreach (var r in c.Records.Where(r => r.Price != null))
            mv.Add((r.Date, r.CreatedAt, (r.Code != null ? r.Code + " · " : "") + RecDesc(r), r.Price!.Value, 0m));
        foreach (var p in c.Payments)
            mv.Add((p.Date, p.CreatedAt, PayDesc(p), 0m, PayUsd(p)));
        mv = mv.OrderBy(x => x.date).ThenBy(x => x.at).ToList();

        var rows = new List<StatementRow>();
        decimal open = 0m;
        if (from != null) open = mv.Where(x => x.date < from).Sum(x => x.debt - x.pay);
        var inRange = mv.Where(x => (from == null || x.date >= from) && (to == null || x.date <= to)).ToList();
        decimal bal = open;
        if (from != null && Math.Abs(open) > 0.004m)
            rows.Add(new StatementRow { Date = from.Value, Description = "Devreden bakiye", Balance = open, IsCarry = true });
        foreach (var x in inRange)
        {
            bal += x.debt - x.pay;
            rows.Add(new StatementRow { Date = x.date, Description = x.desc, Debt = x.debt, Pay = x.pay, Balance = bal });
        }
        return rows;
    }
}
