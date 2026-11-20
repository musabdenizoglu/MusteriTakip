using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;

namespace MusteriTakip.Models;

/// <summary>Çöp kutusuna atılabilen (yumuşak silinen) kayıtlar.</summary>
public interface ISoftDelete
{
    DateTime? DeletedAt { get; set; }
}

/// <summary>Sipariş/ödeme türü: HTML'deki "Altın" / "Kalıp".</summary>
public enum IslemTuru
{
    Altin = 1,
    Kalip = 2
}

/// <summary>Ödeme türü (HTML'deki payType). Hurda, Gram + Method "Hurda altın" olarak tutulur.</summary>
public enum OdemeTuru
{
    Yok = 0,   // Kalıp ödemesi: sadece dolar tutarı
    Gram = 1,  // Has / hurda altın (gr) → altın hesabına
    Usd = 2,   // Dolar ($)
    Tl = 3     // Türk Lirası (₺) → kur ile dolara çevrilir
}

public class AppUser
{
    public int Id { get; set; }

    [Required, MaxLength(60)]
    public string UserName { get; set; } = "";

    [Required, MaxLength(200)]
    public string PasswordHash { get; set; } = "";

    [MaxLength(80)]
    public string? DisplayName { get; set; }

    public DateTime CreatedAt { get; set; }
}

public class Customer : ISoftDelete
{
    public int Id { get; set; }

    /// <summary>Ad Soyad (Türkçe kurala göre büyük harf).</summary>
    [Required, MaxLength(120)]
    public string Name { get; set; } = "";

    [MaxLength(40)]
    public string? Phone { get; set; }

    [MaxLength(120)]
    public string? Email { get; set; }

    /// <summary>2-3 harfli müşteri kodu (örn. KY, MRT). Model kodları "KY-0001" şeklinde bundan üretilir.</summary>
    [MaxLength(3)]
    public string? Code { get; set; }

    /// <summary>Profil resminin wwwroot altındaki yolu (/uploads/...).</summary>
    [MaxLength(260)]
    public string? ImagePath { get; set; }

    [MaxLength(2000)]
    public string? Note { get; set; }

    /// <summary>HTML sürümünden içe aktarılan kayıtların eski kimliği (c_...).</summary>
    [MaxLength(40)]
    public string? LegacyId { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }

    public List<OrderRecord> Records { get; set; } = new();
    public List<Payment> Payments { get; set; } = new();
}

/// <summary>Sipariş (iş) ya da müşteriye yazılan eski borç / açılış bakiyesi.</summary>
public class OrderRecord : ISoftDelete
{
    public int Id { get; set; }

    public int CustomerId { get; set; }
    public Customer? Customer { get; set; }

    /// <summary>Model kodu: "KY-0001" (açılış bakiyesinde "KY-Eski B.").</summary>
    [MaxLength(24)]
    public string? Code { get; set; }

    [Required, MaxLength(160)]
    public string Model { get; set; } = "";

    public IslemTuru? Kind { get; set; }

    public DateOnly Date { get; set; }

    /// <summary>Fiyat ($) — müşterinin dolar hesabına borç yazılır.</summary>
    [Precision(18, 2)] public decimal? Price { get; set; }

    /// <summary>Sipariş değil, elle eklenen borç (eski borç / açılış bakiyesi).</summary>
    public bool IsDebt { get; set; }
    public bool IsOpening { get; set; }

    [Precision(18, 3)] public decimal? MumGram { get; set; }
    [Precision(18, 2)] public decimal? MumIscilik { get; set; }
    [Precision(18, 3)] public decimal? GumusGram { get; set; }
    [Precision(18, 2)] public decimal? GumusUsd { get; set; }
    [Precision(18, 2)] public decimal? AltinGram { get; set; }
    [Precision(18, 0)] public decimal? AltinMilyem { get; set; }
    /// <summary>Altın çıkış (gr) = altın gr × milyem / 1000 (aşağı yuvarlanır) — müşterinin altın hesabına borç.</summary>
    [Precision(18, 3)] public decimal? AltinCikis { get; set; }
    [Precision(18, 2)] public decimal? AltinIscilik { get; set; }
    [Precision(18, 2)] public decimal? Cizim { get; set; }

    [MaxLength(2000)]
    public string? Note { get; set; }

    [MaxLength(260)]
    public string? ImagePath { get; set; }

    // Fiyat ayarlarının kayıt anındaki kopyası (HTML'deki r.calc)
    [Precision(18, 4)] public decimal? SnapMumGrFiyat { get; set; }
    [Precision(18, 4)] public decimal? SnapGumusGrFiyat { get; set; }
    [Precision(18, 4)] public decimal? SnapAltinGrFiyat { get; set; }
    [Precision(18, 4)] public decimal? SnapUsdTry { get; set; }
    [Precision(18, 2)] public decimal? SnapGramAltinTl { get; set; }
    public DateOnly? SnapDate { get; set; }

    /// <summary>Yıl arşivlemede yazılan devir kaydı ise o yıl.</summary>
    public int? ArchDevirYear { get; set; }

    [MaxLength(40)]
    public string? LegacyId { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? EditedAt { get; set; }
    public DateTime? DeletedAt { get; set; }

    public List<OrderExpense> Expenses { get; set; } = new();
}

/// <summary>Siparişe ait masraf satırı (cila, kaplama, taş mıhlama, dış atölye…).</summary>
public class OrderExpense
{
    public int Id { get; set; }
    public int OrderRecordId { get; set; }
    public OrderRecord? OrderRecord { get; set; }

    [MaxLength(160)]
    public string Description { get; set; } = "";

    [Precision(18, 2)] public decimal Amount { get; set; }
}

public class Payment : ISoftDelete
{
    public int Id { get; set; }

    public int CustomerId { get; set; }
    public Customer? Customer { get; set; }

    public DateOnly Date { get; set; }

    /// <summary>Tutar ($).</summary>
    [Precision(18, 2)] public decimal Amount { get; set; }

    public IslemTuru Kind { get; set; } = IslemTuru.Altin;

    public OdemeTuru PayType { get; set; } = OdemeTuru.Yok;

    /// <summary>Nakit, Havale / EFT, Kredi kartı, Hurda altın.</summary>
    [MaxLength(40)]
    public string Method { get; set; } = "Nakit";

    /// <summary>Has altın (gr) — PayType = Gram ise altın hesabından düşer.</summary>
    [Precision(18, 3)] public decimal? Gram { get; set; }
    /// <summary>Altın fiyatı ($/gr).</summary>
    [Precision(18, 2)] public decimal? GoldPrice { get; set; }
    [Precision(18, 2)] public decimal? Tl { get; set; }
    /// <summary>Dolar kuru (₺).</summary>
    [Precision(18, 4)] public decimal? Rate { get; set; }

    [Precision(18, 2)] public decimal? HurdaGr { get; set; }
    [Precision(18, 0)] public decimal? HurdaMil { get; set; }
    [Precision(18, 3)] public decimal? HurdaHas { get; set; }

    /// <summary>Nakit ödemenin altın borcuna sayılan kısmı (gr) ve kullanılan fiyat ($/gr).</summary>
    [Precision(18, 3)] public decimal? GoldEq { get; set; }
    [Precision(18, 2)] public decimal? GoldEqPrice { get; set; }

    [MaxLength(1000)]
    public string? Note { get; set; }

    public int? ArchDevirYear { get; set; }

    [MaxLength(40)]
    public string? LegacyId { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
}

public class ExpenseTag
{
    public int Id { get; set; }

    [Required, MaxLength(60)]
    public string Name { get; set; } = "";

    public int SortOrder { get; set; }
}

/// <summary>Gider (TL). Dolar karşılığı = Amount ÷ Rate.</summary>
public class Expense : ISoftDelete
{
    public int Id { get; set; }

    public int? ExpenseTagId { get; set; }
    public ExpenseTag? Tag { get; set; }

    /// <summary>Etiket silinse bile eski adı görünsün diye tutulur.</summary>
    [MaxLength(60)]
    public string? TagName { get; set; }

    [MaxLength(160)]
    public string? Name { get; set; }

    [MaxLength(500)]
    public string? Note { get; set; }

    /// <summary>Tutar (₺).</summary>
    [Precision(18, 2)] public decimal Amount { get; set; }

    /// <summary>Dolar kuru (₺).</summary>
    [Precision(18, 4)] public decimal? Rate { get; set; }

    public DateOnly Date { get; set; }

    [MaxLength(40)]
    public string? LegacyId { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
}

/// <summary>Genel ayarlar (tek satır, Id = 1).</summary>
public class AppSetting
{
    public int Id { get; set; }

    /// <summary>Mum gr fiyatı ($).</summary>
    [Precision(18, 4)] public decimal? MumGrFiyat { get; set; }
    /// <summary>Gümüş gr fiyatı ($).</summary>
    [Precision(18, 4)] public decimal? GumusGrFiyat { get; set; }
    /// <summary>Altın işçilik ($/gr).</summary>
    [Precision(18, 4)] public decimal? AltinGrFiyat { get; set; }

    /// <summary>Üst başlıkta ve ekstrelerde görünen işyeri adı.</summary>
    [MaxLength(60)]
    public string? ShopName { get; set; }

    /// <summary>Filigranda model kodunun üstüne yazılan marka.</summary>
    [MaxLength(40)]
    public string? WatermarkBrand { get; set; }
}
