using Microsoft.EntityFrameworkCore;
using MusteriTakip.Models;

namespace MusteriTakip.Data;

/// <summary>
/// Başlangıç verileri (EF Core HasData). Veritabanı ilk oluşturulurken yazılır.
/// Giriş: kullanıcı adı "admin", şifre "admin123" (ilk girişten sonra Ayarlar'dan değiştirin).
/// </summary>
public static class SeedData
{
    static readonly DateTime T0 = new(2026, 9, 1, 9, 0, 0, DateTimeKind.Utc);

    public static void Apply(ModelBuilder b)
    {
        // ---- Kullanıcı (şifre: admin123, ASP.NET PasswordHasher V3 biçiminde) ----
        b.Entity<AppUser>().HasData(new AppUser
        {
            Id = 1,
            UserName = "admin",
            DisplayName = "Yönetici",
            PasswordHash = "AQAAAAIAAYagAAAAEG11c3RlcmktdGFraXAtMjBU8xDBfpBLK3b4c3oijIF/2lipVCJIl0H/mw1Qs+WJ3g==",
            CreatedAt = T0
        });

        // ---- Ayarlar ----
        b.Entity<AppSetting>().HasData(new AppSetting
        {
            Id = 1,
            MumGrFiyat = 1.50m,
            GumusGrFiyat = 1.20m,
            AltinGrFiyat = 2.50m,
            ShopName = "Müşteri Takip",
            WatermarkBrand = "ARTE DESIGN"
        });

        // ---- Gider etiketleri ----
        b.Entity<ExpenseTag>().HasData(
            new ExpenseTag { Id = 1, Name = "Kira", SortOrder = 1 },
            new ExpenseTag { Id = 2, Name = "Fatura", SortOrder = 2 },
            new ExpenseTag { Id = 3, Name = "Malzeme", SortOrder = 3 },
            new ExpenseTag { Id = 4, Name = "Kargo", SortOrder = 4 },
            new ExpenseTag { Id = 5, Name = "Personel", SortOrder = 5 }
        );

        // ---- Müşteriler ----
        b.Entity<Customer>().HasData(
            new Customer { Id = 1, Name = "MEHMET YILMAZ", Code = "MY", Phone = "0532 111 22 33", Email = "mehmet@ornek.com", CreatedAt = T0 },
            new Customer { Id = 2, Name = "AYŞE KAYA", Code = "AK", Phone = "0533 444 55 66", CreatedAt = T0.AddDays(1) },
            new Customer { Id = 3, Name = "SELİM KUYUMCULUK", Code = "SK", Phone = "0212 555 00 11", Note = "Toptan çalışıyor, ay sonu ödeme yapar.", CreatedAt = T0.AddDays(2) },
            new Customer { Id = 4, Name = "ZEYNEP DEMİR", Code = "ZD", Phone = "0544 777 88 99", Email = "zeynep@ornek.com", CreatedAt = T0.AddDays(3) }
        );

        // ---- Siparişler ----
        // Altın çıkış = altın gr × milyem / 1000 (aşağı yuvarlanır); fiyat = parçalar + masraflar (üst tam dolar)
        b.Entity<OrderRecord>().HasData(
            Rec(1, 1, "MY-0001", "YÜZÜK A12", IslemTuru.Altin, new DateOnly(2026, 9, 5), 35m,
                mumGr: 2.100m, mumUsd: 3.15m, altinGr: 6.40m, milyem: 585m, cikis: 3.744m, altinUsd: 16.00m, cizim: 15.00m, usdTry: 41.80m),
            Rec(2, 1, "MY-0002", "KOLYE UCU K7", IslemTuru.Altin, new DateOnly(2026, 10, 12), 18m,
                mumGr: 1.500m, mumUsd: 2.25m, altinGr: 4.20m, milyem: 750m, cikis: 3.150m, altinUsd: 10.50m, usdTry: 42.15m,
                note: "Zincir müşteriden geldi."),
            Rec(3, 2, "AK-0001", "BİLEKLİK B3", IslemTuru.Kalip, new DateOnly(2026, 10, 2), 40m,
                mumGr: 3.000m, mumUsd: 4.50m, gumusGr: 12.500m, gumusUsd: 15.00m, cizim: 20.00m, usdTry: 42.05m),
            Rec(4, 2, "AK-0002", "KÜPE S2", IslemTuru.Kalip, new DateOnly(2026, 11, 3), 27m,
                mumGr: 0.800m, mumUsd: 1.20m, cizim: 25.00m, usdTry: 42.30m),
            new OrderRecord
            {
                Id = 5, CustomerId = 3, Code = "SK-Eski B.", Model = "Açılış (Eski) bakiyesi", Kind = null,
                Date = new DateOnly(2026, 9, 1), Price = 150m, IsDebt = true, IsOpening = true, CreatedAt = T0.AddDays(2)
            },
            Rec(6, 3, "SK-0001", "ALYANS A5", IslemTuru.Altin, new DateOnly(2026, 11, 10), 36m,
                mumGr: 2.400m, mumUsd: 3.60m, altinGr: 8.00m, milyem: 585m, cikis: 4.680m, altinUsd: 20.00m, usdTry: 42.40m),
            Rec(7, 4, "ZD-0001", "MADALYON M1", IslemTuru.Altin, new DateOnly(2026, 11, 15), 44m,
                altinGr: 5.50m, milyem: 916m, cikis: 5.038m, altinUsd: 13.75m, cizim: 30.00m, usdTry: 42.45m)
        );

        // ---- Sipariş masrafları ----
        b.Entity<OrderExpense>().HasData(
            new OrderExpense { Id = 1, OrderRecordId = 2, Description = "Cila", Amount = 5.00m },
            new OrderExpense { Id = 2, OrderRecordId = 6, Description = "Taş mıhlama", Amount = 12.00m }
        );

        // ---- Ödemeler ----
        b.Entity<Payment>().HasData(
            new Payment { Id = 1, CustomerId = 1, Date = new DateOnly(2026, 9, 20), Kind = IslemTuru.Altin, PayType = OdemeTuru.Usd, Method = "Nakit", Amount = 35m, Rate = 41.90m, Note = "Yüzük işçiliği", CreatedAt = T0.AddDays(19) },
            new Payment { Id = 2, CustomerId = 1, Date = new DateOnly(2026, 10, 20), Kind = IslemTuru.Altin, PayType = OdemeTuru.Gram, Method = "Nakit", Gram = 3.744m, GoldPrice = 105.00m, Amount = 393.12m, Note = "Has altın", CreatedAt = T0.AddDays(49) },
            new Payment { Id = 3, CustomerId = 2, Date = new DateOnly(2026, 10, 15), Kind = IslemTuru.Kalip, PayType = OdemeTuru.Yok, Method = "Havale / EFT", Amount = 40m, CreatedAt = T0.AddDays(44) },
            new Payment { Id = 4, CustomerId = 3, Date = new DateOnly(2026, 11, 12), Kind = IslemTuru.Altin, PayType = OdemeTuru.Tl, Method = "Nakit", Tl = 4250m, Rate = 42.50m, Amount = 100m, CreatedAt = T0.AddDays(72) },
            new Payment { Id = 5, CustomerId = 3, Date = new DateOnly(2026, 11, 12), Kind = IslemTuru.Altin, PayType = OdemeTuru.Gram, Method = "Hurda altın", HurdaGr = 6.00m, HurdaMil = 585m, HurdaHas = 3.510m, Gram = 3.510m, GoldPrice = 105.00m, Amount = 368.55m, CreatedAt = T0.AddDays(72).AddMinutes(5) },
            new Payment { Id = 6, CustomerId = 4, Date = new DateOnly(2026, 11, 18), Kind = IslemTuru.Altin, PayType = OdemeTuru.Usd, Method = "Havale / EFT", Amount = 20m, Rate = 42.45m, CreatedAt = T0.AddDays(78) }
        );

        // ---- Giderler (₺) ----
        b.Entity<Expense>().HasData(
            new Expense { Id = 1, ExpenseTagId = 1, TagName = "Kira", Amount = 25000m, Rate = 41.80m, Date = new DateOnly(2026, 9, 1), CreatedAt = T0 },
            new Expense { Id = 2, ExpenseTagId = 2, TagName = "Fatura", Note = "Elektrik", Amount = 3200m, Rate = 41.95m, Date = new DateOnly(2026, 9, 15), CreatedAt = T0.AddDays(14) },
            new Expense { Id = 3, ExpenseTagId = 1, TagName = "Kira", Amount = 25000m, Rate = 42.20m, Date = new DateOnly(2026, 10, 1), CreatedAt = T0.AddDays(30) },
            new Expense { Id = 4, ExpenseTagId = 3, TagName = "Malzeme", Note = "Döküm mumu", Amount = 5400m, Rate = 42.10m, Date = new DateOnly(2026, 10, 8), CreatedAt = T0.AddDays(37) },
            new Expense { Id = 5, ExpenseTagId = 1, TagName = "Kira", Amount = 25000m, Rate = 42.40m, Date = new DateOnly(2026, 11, 1), CreatedAt = T0.AddDays(61) },
            new Expense { Id = 6, ExpenseTagId = 4, TagName = "Kargo", Amount = 850m, Rate = 42.35m, Date = new DateOnly(2026, 11, 5), CreatedAt = T0.AddDays(65) }
        );
    }

    static OrderRecord Rec(int id, int custId, string code, string model, IslemTuru kind, DateOnly date, decimal price,
        decimal? mumGr = null, decimal? mumUsd = null, decimal? gumusGr = null, decimal? gumusUsd = null,
        decimal? altinGr = null, decimal? milyem = null, decimal? cikis = null, decimal? altinUsd = null,
        decimal? cizim = null, decimal? usdTry = null, string? note = null) => new()
    {
        Id = id,
        CustomerId = custId,
        Code = code,
        Model = model,
        Kind = kind,
        Date = date,
        Price = price,
        MumGram = mumGr,
        MumIscilik = mumUsd,
        GumusGram = gumusGr,
        GumusUsd = gumusUsd,
        AltinGram = altinGr,
        AltinMilyem = milyem,
        AltinCikis = cikis,
        AltinIscilik = altinUsd,
        Cizim = cizim,
        Note = note,
        SnapMumGrFiyat = 1.50m,
        SnapGumusGrFiyat = 1.20m,
        SnapAltinGrFiyat = 2.50m,
        SnapUsdTry = usdTry,
        SnapDate = date,
        CreatedAt = date.ToDateTime(new TimeOnly(10, 0), DateTimeKind.Utc)
    };
}
