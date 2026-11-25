using System.ComponentModel.DataAnnotations;
using MusteriTakip.Services;

namespace MusteriTakip.Models.ViewModels;

// ---------------- Giriş ----------------
public class LoginVm
{
    [Required(ErrorMessage = "Kullanıcı adı gerekli.")]
    public string UserName { get; set; } = "";
    [Required(ErrorMessage = "Şifre gerekli.")]
    public string Password { get; set; } = "";
    public string? ReturnUrl { get; set; }
}

public class RegisterVm
{
    [Required(ErrorMessage = "Kullanıcı adı gerekli."), MaxLength(60)]
    public string UserName { get; set; } = "";
    [Required(ErrorMessage = "Şifre gerekli."), MinLength(4, ErrorMessage = "Şifre en az 4 karakter olmalı.")]
    public string Password { get; set; } = "";
    [Compare(nameof(Password), ErrorMessage = "Şifreler aynı değil.")]
    public string Password2 { get; set; } = "";
}

// ---------------- Ana sayfa ----------------
public class MonthStat
{
    public int Jobs { get; set; }
    public decimal Ciro { get; set; }
    public decimal Tahsilat { get; set; }
    public decimal GiderUsd { get; set; }
}

public class DashboardVm
{
    public string MonthTitle { get; set; } = "";
    public MonthStat This { get; set; } = new();
    public MonthStat Prev { get; set; } = new();
    public MonthStat Today { get; set; } = new();
    public decimal KasaBakiye { get; set; }
    public decimal TotalRest { get; set; }
    public decimal TotalGoldRest { get; set; }
    public int CustomerCount { get; set; }
    public int DebtorCount { get; set; }
    public List<(Customer c, decimal rest)> TopDebtors { get; set; } = new();
    public List<Movement> Timeline { get; set; } = new();
    public string? Search { get; set; }
    /// <summary>Ana sayfa "Son Eklenen Kayıtlar" (sipariş + ödeme + gider, en yeni üstte).</summary>
    public List<RecentItem> Recent { get; set; } = new();
}

/// <summary>Ana sayfa listesindeki bir satır (HTML: homeRecentAllItems).</summary>
public class RecentItem
{
    /// <summary>"rec" sipariş/borç, "pay" ödeme, "exp" gider.</summary>
    public string Ev { get; set; } = "rec";
    public int? CustomerId { get; set; }
    public int? RecordId { get; set; }
    /// <summary>Sipariş satırında ayrıntı penceresi için kaydın kendisi.</summary>
    public OrderRecord? Rec { get; set; }
    public string CustName { get; set; } = "";
    public DateOnly Date { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? EditedAt { get; set; }
    /// <summary>Liste sırası: eklenme anı; "en üste taşı" seçildiyse daha yeni olan o an.</summary>
    public DateTime SortAt { get; set; }
    public string? Image { get; set; }
    public string? Note { get; set; }
    public string? EditNote { get; set; }
    public string Code { get; set; } = "";
    public string CodeCls { get; set; } = "";
    public string CustCode { get; set; } = "";
    public string Model { get; set; } = "";
    public string Kind { get; set; } = "";
    public string KindCls { get; set; } = "";
    public string Badge { get; set; } = "";
    // Zaman çizgisi görünümü
    public string TlTag { get; set; } = "";
    public string TlAmt { get; set; } = "";
    public string? TlAmtSub { get; set; }
}

// ---------------- Müşteriler ----------------
public class CustomerListItem
{
    public Customer Customer { get; set; } = null!;
    public decimal Rest { get; set; }
    public decimal GoldRest { get; set; }
    public DateOnly? LastDate { get; set; }

    /// <summary>Müşteriler listesi araması için metin: ad, kod, telefon (boşluklu/boşluksuz), e-posta,
    /// son işlem tarihi (gg.aa.yyyy ve yyyy-aa-gg). Türkçe küçük harf; Türkçe karakterler korunur.</summary>
    public static string SearchText(CustomerListItem it)
    {
        var c = it.Customer;
        var parts = new[]
        {
            c.Name, c.Code, c.Phone, c.Phone?.Replace(" ", ""), c.Email,
            it.LastDate is { } d ? d.ToString("dd.MM.yyyy") : null,
            it.LastDate is { } d2 ? d2.ToString("yyyy-MM-dd") : null,
            // Düzenlenmiş siparişi olan müşteri: "düzenlenen / değiştirilen" yazınca listelenir
            c.Records.Any(r => r.EditedAt != null) ? "düzenlenen düzenlenmiş düzenlendi değiştirilen değiştirilmiş değiştirildi" : null,
        };
        return string.Join(" ", parts.Where(s => !string.IsNullOrWhiteSpace(s))).ToLower(Helpers.Fmt.Tr);
    }

    /// <summary>Virgülle ayrılmış terimlerin hepsi metinde geçiyor mu (boşluksuz hali de denenir).</summary>
    public static bool MatchesAll(string text, string? query)
    {
        var terms = (query ?? "").ToLower(Helpers.Fmt.Tr).Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
        return terms.All(t => text.Contains(t) || text.Contains(t.Replace(" ", "")));
    }
}

public class CustomerListVm
{
    public List<CustomerListItem> Items { get; set; } = new();
    public string? Search { get; set; }
    public string? Sort { get; set; }
    public int TrashCount { get; set; }
    /// <summary>Aramadan bağımsız toplam müşteri sayısı ("henüz müşteri yok" / "bulunamadı" ayrımı için).</summary>
    public int TotalCount { get; set; }
}

public class CustomerFormVm
{
    public int? Id { get; set; }

    [Required(ErrorMessage = "Ad Soyad gerekli."), MaxLength(120)]
    public string Name { get; set; } = "";
    [MaxLength(40)] public string? Phone { get; set; }
    [MaxLength(120), EmailAddress(ErrorMessage = "Geçerli bir e-posta yazın.")] public string? Email { get; set; }
    [MaxLength(3)] public string? Code { get; set; }
    [MaxLength(2000)] public string? Note { get; set; }

    /// <summary>Açılış bakiyesi / eski borç ($) — sadece yeni müşteride.</summary>
    [Range(0, 100000000)] public decimal? OpeningBalance { get; set; }
    [MaxLength(160)] public string? OpeningDesc { get; set; }

    /// <summary>Tarayıcıda küçültülmüş profil resmi (data URL).</summary>
    public string? ImageData { get; set; }
    public string? ExistingImage { get; set; }
    public bool RemoveImage { get; set; }
}

public class CustomerDetailsVm
{
    public Customer Customer { get; set; } = null!;
    public Totals Totals { get; set; } = new();
    public string? KindFilter { get; set; }
    public string Tab { get; set; } = "records";
    public List<OrderRecord> Records { get; set; } = new();
    public List<Movement> History { get; set; } = new();
    public string WhatsAppText { get; set; } = "";
}

public class StatementVm
{
    public Customer Customer { get; set; } = null!;
    public string ShopName { get; set; } = "";
    public DateOnly? From { get; set; }
    public DateOnly? To { get; set; }
    public List<StatementRow> Rows { get; set; } = new();
    public Totals Totals { get; set; } = new();
}

// ---------------- Sipariş ----------------
public class OrderExpenseVm
{
    public string? Desc { get; set; }
    public decimal? Amount { get; set; }
}

public class OrderFormVm
{
    public int? Id { get; set; }
    public int CustomerId { get; set; }
    public string CustomerName { get; set; } = "";

    /// <summary>Müşteri kodu (2-3 harf) ve model no (0001) → kod "KY-0001".</summary>
    public string? CustCode { get; set; }
    public string? ModelNo { get; set; }

    [Required(ErrorMessage = "Model adı gerekli."), MaxLength(160)]
    public string Model { get; set; } = "";
    public string? Date { get; set; }

    public decimal? MumGram { get; set; }
    public decimal? MumIscilik { get; set; }
    public decimal? GumusGram { get; set; }
    public decimal? GumusUsd { get; set; }
    public decimal? AltinGram { get; set; }
    public decimal? AltinMilyem { get; set; }
    public decimal? AltinCikis { get; set; }
    public decimal? AltinIscilik { get; set; }
    public decimal? Cizim { get; set; }

    [Required(ErrorMessage = "Fiyat gerekli.")]
    public decimal? Price { get; set; }
    [MaxLength(2000)] public string? Note { get; set; }
    public List<OrderExpenseVm> Expenses { get; set; } = new();

    /// <summary>Düzenleme notu: yalnızca sipariş düzenlenirken girilir.</summary>
    [MaxLength(2000)] public string? EditNote { get; set; }

    /// <summary>Düzenlemede "Evet, en üste taşı" seçildiyse kayıt Kasa listesinde en üste çıkar.</summary>
    public bool Bump { get; set; }

    public string? ImageData { get; set; }
    public string? ExistingImage { get; set; }
    public bool RemoveImage { get; set; }

    /// <summary>Üst bardaki canlı kur / gram altın (kayıt anı kopyası için).</summary>
    public decimal? LiveUsdTry { get; set; }
    public decimal? LiveGramAltinTl { get; set; }

    // Ekrandaki otomatik hesap için ayarlar
    public decimal? SetMum { get; set; }
    public decimal? SetGumus { get; set; }
    public decimal? SetAltin { get; set; }
    public string Brand { get; set; } = "ARTE DESIGN";
}

public class DebtFormVm
{
    public int? Id { get; set; }
    public int CustomerId { get; set; }
    public string CustomerName { get; set; } = "";
    [Required(ErrorMessage = "Açıklama gerekli."), MaxLength(160)]
    public string Description { get; set; } = "Eski borç";
    [Required(ErrorMessage = "Tutar gerekli."), Range(0.01, 100000000, ErrorMessage = "Tutar 0'dan büyük olmalı.")]
    public decimal? Amount { get; set; }
    public string? Date { get; set; }
    [MaxLength(2000)] public string? Note { get; set; }
    /// <summary>"Altın", "Kalıp" ya da boş.</summary>
    public string? Kind { get; set; }
    public string? ReturnUrl { get; set; }
}

// ---------------- Ödeme ----------------
public class PaymentFormVm
{
    public int? Id { get; set; }
    public int? CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public List<Customer> Customers { get; set; } = new();
    public bool FromKasa { get; set; }

    /// <summary>"Altın" ya da "Kalıp".</summary>
    public string Kind { get; set; } = "Altın";
    /// <summary>gr (has), hurda, usd, tl — Kalıp'ta kullanılmaz.</summary>
    public string PayType { get; set; } = "usd";
    public string Method { get; set; } = "Nakit";

    public decimal? Amount { get; set; }
    public decimal? Gram { get; set; }
    public decimal? GoldPrice { get; set; }
    public decimal? Tl { get; set; }
    public decimal? Rate { get; set; }
    public decimal? Eur { get; set; }
    public decimal? EurRate { get; set; }
    public decimal? HurdaGr { get; set; }
    public decimal? HurdaMil { get; set; }

    /// <summary>Nakit ödemeyi altın borcuna saymak için kullanılacak fiyat ($/gr).</summary>
    public decimal? GoldEqPrice { get; set; }
    /// <summary>İşaretliyse tutar altına çevrilmez, nakit (işçilik) borcuna sayılır.</summary>
    public bool CountAsCash { get; set; } = true;

    public string? Date { get; set; }
    [MaxLength(1000)] public string? Note { get; set; }

    public decimal GoldRemaining { get; set; }
    /// <summary>Bu ödemeden önceki nakit ($) bakiye.</summary>
    public decimal PrevBalance { get; set; }
    public string? ReturnUrl { get; set; }
}

// ---------------- Genel Kasa ----------------
public class KasaVm
{
    public KasaTotals Totals { get; set; } = new();
    public List<Movement> Items { get; set; } = new();
    public string? Search { get; set; }
    public string? Period { get; set; }
    public bool Filtered { get; set; }
    public decimal SumDebt { get; set; }
    public decimal SumPay { get; set; }
    public decimal SumExpense { get; set; }
}

// ---------------- Giderler ----------------
public class ExpenseFormVm
{
    public int? Id { get; set; }
    public int? ExpenseTagId { get; set; }
    [MaxLength(60)] public string? NewTag { get; set; }
    [MaxLength(500)] public string? Note { get; set; }
    [Required(ErrorMessage = "Tutar gerekli."), Range(0, 1000000000)]
    public decimal? Amount { get; set; }
    public decimal? Rate { get; set; }
    public string? Date { get; set; }
}

public class ExpensesVm
{
    public List<Expense> Items { get; set; } = new();
    public List<ExpenseTag> Tags { get; set; } = new();
    public ExpenseFormVm Form { get; set; } = new();
    public decimal TotalTl { get; set; }
    public decimal TotalUsd { get; set; }
    public string? Period { get; set; }
}

// ---------------- Raporlar ----------------
public class MonthRow
{
    public int Month { get; set; }
    public int Jobs { get; set; }
    public decimal Ciro { get; set; }
    public decimal Cost { get; set; }
    public decimal Profit => Ciro - Cost;
    public decimal Tahsilat { get; set; }
    public decimal GiderUsd { get; set; }
    public decimal Net => Tahsilat - GiderUsd;
    public decimal GoldOut { get; set; }
    public decimal GoldIn { get; set; }
}

public class NameValue
{
    public string Name { get; set; } = "";
    public decimal Value { get; set; }
    public int Count { get; set; }
    public int? Id { get; set; }
    public decimal Extra { get; set; }
}

public class ReportsVm
{
    public int Year { get; set; }
    public List<int> Years { get; set; } = new();
    public List<MonthRow> Months { get; set; } = new();
    public List<NameValue> ExpenseByTag { get; set; } = new();
    public List<NameValue> TopCustomers { get; set; } = new();
    public List<NameValue> KindSplit { get; set; } = new();
}

// ---------------- Ayarlar / Çöp ----------------
public class SettingsVm
{
    public decimal? MumGrFiyat { get; set; }
    public decimal? GumusGrFiyat { get; set; }
    public decimal? AltinGrFiyat { get; set; }
    [MaxLength(60)] public string? ShopName { get; set; }
    [MaxLength(40)] public string? WatermarkBrand { get; set; }
    public List<ExpenseTag> Tags { get; set; } = new();
    public int CustomerCount { get; set; }
    public int RecordCount { get; set; }
    public int PaymentCount { get; set; }
    public int ExpenseCount { get; set; }
}

public class TrashItem
{
    public string Type { get; set; } = "";
    public int Id { get; set; }
    public string Title { get; set; } = "";
    public string Value { get; set; } = "";
    public DateTime DeletedAt { get; set; }
}
