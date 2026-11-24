using System.Globalization;
using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using MusteriTakip.Data;
using MusteriTakip.Helpers;
using MusteriTakip.Models;

namespace MusteriTakip.Services;

public class ImportResult
{
    public int Customers { get; set; }
    public int Records { get; set; }
    public int Payments { get; set; }
    public int Expenses { get; set; }
    public int Users { get; set; }
    public int Images { get; set; }
}

/// <summary>
/// HTML sürümünün yedek dosyasıyla (app: "musteri-takip", version: 1) uyumlu içe/dışa aktarma.
/// Böylece tarayıcıdaki mevcut kayıtlarınızı "Yedek Al" ile indirip bu uygulamaya yükleyebilirsiniz.
/// </summary>
public class BackupService
{
    private readonly AppDbContext _db;
    private readonly ImageService _img;
    private readonly IPasswordHasher<AppUser> _hasher = new PasswordHasher<AppUser>();

    public BackupService(AppDbContext db, ImageService img) { _db = db; _img = img; }

    // ======================= İÇE AKTARMA =======================

    public async Task<ImportResult> ImportHtmlBackupAsync(Stream json, bool replaceAll)
    {
        using var doc = await JsonDocument.ParseAsync(json, new JsonDocumentOptions { AllowTrailingCommas = true });
        var root = doc.RootElement;
        if (root.ValueKind != JsonValueKind.Object || !root.TryGetProperty("customers", out var custs) || custs.ValueKind != JsonValueKind.Array)
            throw new InvalidDataException("Bu dosya bir Müşteri Takip yedeği değil (customers listesi yok).");

        var res = new ImportResult();
        await using var tx = await _db.Database.BeginTransactionAsync();

        if (replaceAll)
        {
            var oldPaths = await _db.Customers.IgnoreQueryFilters().Select(c => c.ImagePath).ToListAsync();
            oldPaths.AddRange(await _db.OrderRecords.IgnoreQueryFilters().Select(r => r.ImagePath).ToListAsync());
            _db.OrderExpenses.RemoveRange(await _db.OrderExpenses.ToListAsync());
            _db.OrderRecords.RemoveRange(await _db.OrderRecords.IgnoreQueryFilters().ToListAsync());
            _db.Payments.RemoveRange(await _db.Payments.IgnoreQueryFilters().ToListAsync());
            _db.Customers.RemoveRange(await _db.Customers.IgnoreQueryFilters().ToListAsync());
            _db.Expenses.RemoveRange(await _db.Expenses.IgnoreQueryFilters().ToListAsync());
            await _db.SaveChangesAsync();
            foreach (var p in oldPaths) _img.Delete(p);
        }

        // ---- Ayarlar ve gider etiketleri ----
        var settings = await _db.Settings.FirstOrDefaultAsync(x => x.Id == 1);
        if (settings == null) { settings = new AppSetting { Id = 1, WatermarkBrand = "ARTE DESIGN" }; _db.Settings.Add(settings); }
        var tags = await _db.ExpenseTags.ToListAsync();
        if (root.TryGetProperty("settings", out var st) && st.ValueKind == JsonValueKind.Object)
        {
            settings.MumGrFiyat = Dec(st, "mumGrFiyat") ?? settings.MumGrFiyat;
            settings.GumusGrFiyat = Dec(st, "gumusGrFiyat") ?? settings.GumusGrFiyat;
            settings.AltinGrFiyat = Dec(st, "altinGrFiyat") ?? settings.AltinGrFiyat;
            var shop = Str(st, "shopName");
            if (!string.IsNullOrWhiteSpace(shop)) settings.ShopName = Cut(shop, 60);
            if (st.TryGetProperty("expTags", out var et) && et.ValueKind == JsonValueKind.Array)
                foreach (var t in et.EnumerateArray())
                    EnsureTag(tags, t.ValueKind == JsonValueKind.String ? t.GetString() : null);
        }

        // ---- Kullanıcılar (HTML'de { "kullanıcı": "şifre" }) ----
        if (root.TryGetProperty("users", out var us) && us.ValueKind == JsonValueKind.Object)
        {
            var existing = (await _db.Users.Select(u => u.UserName).ToListAsync()).ToHashSet(StringComparer.OrdinalIgnoreCase);
            foreach (var u in us.EnumerateObject())
            {
                var uname = Cut(u.Name.Trim(), 60)!;
                // Aynı ad yedekte iki kez (ör. "Ali" / "ali") geçse de benzersiz indeks bozulmasın
                if (uname == "" || u.Value.ValueKind != JsonValueKind.String || !existing.Add(uname)) continue;
                var user = new AppUser { UserName = uname, DisplayName = Cut(u.Name.Trim(), 80), CreatedAt = DateTime.UtcNow };
                user.PasswordHash = _hasher.HashPassword(user, u.Value.GetString() ?? "");
                _db.Users.Add(user);
                res.Users++;
            }
        }
        await _db.SaveChangesAsync();

        // ---- Müşteriler, siparişler, ödemeler ----
        foreach (var c in custs.EnumerateArray())
        {
            var name = Fmt.Upper(Str(c, "name"));
            if (name == "") continue;
            var cust = new Customer
            {
                Name = Cut(name, 120),
                Phone = Cut(Str(c, "phone"), 40),
                Email = Cut(Str(c, "email"), 120),
                Code = Cut(CodeService.LettersOnly(Str(c, "code")), 3) is { Length: >= 2 } cc ? cc : null,
                Note = Cut(Str(c, "note"), 2000),
                LegacyId = Cut(Str(c, "id"), 40),
                CreatedAt = FromLegacyId(Str(c, "id")) ?? DateTime.UtcNow
            };
            var cimg = Str(c, "image");
            if (!string.IsNullOrEmpty(cimg)) { cust.ImagePath = await _img.SaveDataUrlAsync(cimg, "customers"); if (cust.ImagePath != null) res.Images++; }

            if (c.TryGetProperty("records", out var recs) && recs.ValueKind == JsonValueKind.Array)
            {
                foreach (var r in recs.EnumerateArray())
                {
                    var rec = new OrderRecord
                    {
                        Code = Cut(Str(r, "code"), 24),
                        Model = Cut(Str(r, "model") is { Length: > 0 } m ? m : "—", 160),
                        Kind = ParseKind(Str(r, "kind")),
                        Date = ParseDate(Str(r, "date")),
                        Price = Dec(r, "price"),
                        IsDebt = Bool(r, "debt"),
                        IsOpening = Bool(r, "opening"),
                        MumGram = Dec(r, "mumGram"),
                        MumIscilik = Dec(r, "mumIscilik"),
                        GumusGram = Dec(r, "gumusGram"),
                        GumusUsd = Dec(r, "gumusUsd"),
                        AltinGram = Dec(r, "altinGram"),
                        AltinMilyem = Dec(r, "altinMilyem"),
                        AltinCikis = Dec(r, "altinCikis"),
                        AltinIscilik = Dec(r, "altinIscilik"),
                        Cizim = Dec(r, "cizim"),
                        Note = Cut(Str(r, "note"), 2000),
                        EditNote = Cut(Str(r, "editNote"), 2000),
                        ArchDevirYear = (int?)Dec(r, "archDevir"),
                        LegacyId = Cut(Str(r, "id"), 40),
                        CreatedAt = FromLegacyId(Str(r, "id")) ?? DateTime.UtcNow,
                        EditedAt = FromMs(Dec(r, "editedAt")),
                        UpdatedAt = FromMs(Dec(r, "updatedAt"))
                    };
                    if (r.TryGetProperty("calc", out var calc) && calc.ValueKind == JsonValueKind.Object)
                    {
                        rec.SnapMumGrFiyat = Dec(calc, "mumGrFiyat");
                        rec.SnapGumusGrFiyat = Dec(calc, "gumusGrFiyat");
                        rec.SnapAltinGrFiyat = Dec(calc, "altinGrFiyat");
                        rec.SnapUsdTry = Dec(calc, "usdTry");
                        rec.SnapGramAltinTl = Dec(calc, "gramAltinTl");
                        var t = Str(calc, "tarih");
                        if (!string.IsNullOrEmpty(t)) rec.SnapDate = ParseDate(t);
                    }
                    if (r.TryGetProperty("expenses", out var exs) && exs.ValueKind == JsonValueKind.Array)
                        foreach (var e in exs.EnumerateArray())
                            rec.Expenses.Add(new OrderExpense { Description = Cut(Str(e, "desc"), 160) ?? "", Amount = Dec(e, "amount") ?? 0m });
                    var rimg = Str(r, "image");
                    if (!string.IsNullOrEmpty(rimg)) { rec.ImagePath = await _img.SaveDataUrlAsync(rimg, "orders"); if (rec.ImagePath != null) res.Images++; }
                    cust.Records.Add(rec);
                    res.Records++;
                }
            }

            if (c.TryGetProperty("payments", out var pays) && pays.ValueKind == JsonValueKind.Array)
            {
                foreach (var p in pays.EnumerateArray())
                {
                    var pt = Str(p, "payType");
                    var pay = new Payment
                    {
                        Date = ParseDate(Str(p, "date")),
                        Amount = Dec(p, "amount") ?? 0m,
                        Kind = ParseKind(Str(p, "kind")) ?? IslemTuru.Altin,
                        PayType = pt switch { "gr" => OdemeTuru.Gram, "hurda" => OdemeTuru.Gram, "tl" => OdemeTuru.Tl, "usd" => OdemeTuru.Usd, _ => OdemeTuru.Yok },
                        Method = Cut(Str(p, "method") is { Length: > 0 } me ? me : "Nakit", 40),
                        Gram = Dec(p, "gram"),
                        GoldPrice = Dec(p, "goldPrice"),
                        Tl = Dec(p, "tl"),
                        Rate = Dec(p, "rate"),
                        HurdaGr = Dec(p, "hurdaGr"),
                        HurdaMil = Dec(p, "hurdaMil"),
                        HurdaHas = Dec(p, "hurdaHas"),
                        GoldEq = Dec(p, "goldEq"),
                        GoldEqPrice = Dec(p, "goldEqPrice"),
                        Note = Cut(Str(p, "note"), 1000),
                        ArchDevirYear = (int?)Dec(p, "archDevir"),
                        LegacyId = Cut(Str(p, "id"), 40),
                        CreatedAt = FromLegacyId(Str(p, "id")) ?? DateTime.UtcNow
                    };
                    if (pt == "hurda") pay.Method = "Hurda altın";
                    cust.Payments.Add(pay);
                    res.Payments++;
                }
            }

            _db.Customers.Add(cust);
            res.Customers++;
        }
        await _db.SaveChangesAsync();

        // ---- Giderler ----
        if (root.TryGetProperty("expenses", out var exps) && exps.ValueKind == JsonValueKind.Array)
        {
            foreach (var e in exps.EnumerateArray())
            {
                var tagName = Str(e, "tag");
                var tag = EnsureTag(tags, tagName);
                _db.Expenses.Add(new Expense
                {
                    Tag = tag,
                    TagName = tag?.Name,
                    Name = Cut(Str(e, "name"), 160),
                    Note = Cut(Str(e, "note"), 500),
                    Amount = Dec(e, "amount") ?? 0m,
                    Rate = Dec(e, "rate"),
                    Date = ParseDate(Str(e, "date")),
                    LegacyId = Cut(Str(e, "id"), 40),
                    CreatedAt = FromLegacyId(Str(e, "id")) ?? DateTime.UtcNow
                });
                res.Expenses++;
            }
        }
        await _db.SaveChangesAsync();
        await tx.CommitAsync();
        return res;
    }

    ExpenseTag? EnsureTag(List<ExpenseTag> tags, string? name)
    {
        name = Cut((name ?? "").Trim(), 60)!.TrimEnd();
        if (name == "") return null;
        // SQL Server harmanlaması "Kira" ile "KİRA"yı aynı sayar; uygulama kültürü invariant olduğu için
        // karşılaştırmayı Türkçe büyük harfe çevirip (İ/I farkını da yok sayarak) yapıyoruz.
        var key = TagKey(name);
        var t = tags.FirstOrDefault(x => TagKey(x.Name) == key);
        if (t != null) return t;
        t = new ExpenseTag { Name = Cut(name, 60)!, SortOrder = tags.Count + 1 };
        tags.Add(t);
        _db.ExpenseTags.Add(t);
        return t;
    }

    static readonly CultureInfo TrCulture = CultureInfo.GetCultureInfo("tr-TR");
    static string TagKey(string s) => s.Trim().ToUpper(TrCulture).Replace('İ', 'I');

    // ======================= DIŞA AKTARMA =======================

    /// <summary>HTML sürümünün de açabileceği biçimde tam yedek (resimler data URL olarak gömülür).</summary>
    public async Task<byte[]> ExportAsync(bool includeImages)
    {
        var customers = await _db.Customers
            .Include(c => c.Records).ThenInclude(r => r.Expenses)
            .Include(c => c.Payments)
            .AsSplitQuery().AsNoTracking().ToListAsync();
        var expenses = await _db.Expenses.AsNoTracking().ToListAsync();
        var settings = await _db.Settings.AsNoTracking().FirstOrDefaultAsync() ?? new AppSetting();
        var tags = await _db.ExpenseTags.AsNoTracking().OrderBy(t => t.SortOrder).Select(t => t.Name).ToListAsync();

        var outCustomers = new List<object>();
        foreach (var c in customers)
        {
            var recs = new List<object>();
            foreach (var r in c.Records.OrderByDescending(r => r.Date))
            {
                recs.Add(new Dictionary<string, object?>
                {
                    ["id"] = r.LegacyId ?? "r_" + r.Id,
                    ["image"] = includeImages ? await _img.ReadAsDataUrlAsync(r.ImagePath) : null,
                    ["code"] = r.Code,
                    ["model"] = r.Model,
                    ["kind"] = r.Kind == null ? null : Fmt.KindText(r.Kind),
                    ["date"] = Fmt.InputDate(r.Date),
                    ["price"] = r.Price,
                    ["debt"] = r.IsDebt ? true : null,
                    ["opening"] = r.IsOpening ? true : null,
                    ["mumGram"] = r.MumGram,
                    ["mumIscilik"] = r.MumIscilik,
                    ["gumusGram"] = r.GumusGram,
                    ["gumusUsd"] = r.GumusUsd,
                    ["altinGram"] = r.AltinGram,
                    ["altinMilyem"] = r.AltinMilyem,
                    ["altinCikis"] = r.AltinCikis,
                    ["altinIscilik"] = r.AltinIscilik,
                    ["cizim"] = r.Cizim,
                    ["note"] = r.Note,
                    ["editNote"] = r.EditNote,
                    ["archDevir"] = r.ArchDevirYear,
                    ["expenses"] = r.Expenses.Select(e => new { desc = e.Description, amount = e.Amount }).ToList(),
                    ["calc"] = new
                    {
                        mumGrFiyat = r.SnapMumGrFiyat,
                        gumusGrFiyat = r.SnapGumusGrFiyat,
                        altinGrFiyat = r.SnapAltinGrFiyat,
                        tarih = Fmt.InputDate(r.SnapDate),
                        usdTry = r.SnapUsdTry,
                        gramAltinTl = r.SnapGramAltinTl
                    }
                });
            }
            var pays = c.Payments.OrderByDescending(p => p.Date).Select(p => new Dictionary<string, object?>
            {
                ["id"] = p.LegacyId ?? "p_" + new DateTimeOffset(DateTime.SpecifyKind(p.CreatedAt, DateTimeKind.Utc)).ToUnixTimeMilliseconds(),
                ["amount"] = p.Amount,
                ["date"] = Fmt.InputDate(p.Date),
                ["kind"] = Fmt.KindText(p.Kind),
                ["note"] = p.Note ?? "",
                ["method"] = p.Method,
                ["payType"] = p.PayType switch { OdemeTuru.Gram => "gr", OdemeTuru.Tl => "tl", OdemeTuru.Usd => "usd", _ => null },
                ["gram"] = p.Gram,
                ["tl"] = p.Tl,
                ["rate"] = p.Rate,
                ["goldPrice"] = p.GoldPrice,
                ["hurdaGr"] = p.HurdaGr,
                ["hurdaMil"] = p.HurdaMil,
                ["hurdaHas"] = p.HurdaHas,
                ["goldEq"] = p.GoldEq,
                ["goldEqPrice"] = p.GoldEqPrice,
                ["archDevir"] = p.ArchDevirYear
            }).ToList();
            outCustomers.Add(new Dictionary<string, object?>
            {
                ["id"] = c.LegacyId ?? "c_" + c.Id,
                ["name"] = c.Name,
                ["phone"] = c.Phone ?? "",
                ["email"] = c.Email ?? "",
                ["code"] = c.Code,
                ["note"] = c.Note,
                ["image"] = includeImages ? await _img.ReadAsDataUrlAsync(c.ImagePath) : null,
                ["records"] = recs,
                ["payments"] = pays
            });
        }

        var data = new Dictionary<string, object?>
        {
            ["app"] = "musteri-takip",
            ["version"] = 1,
            ["exportedAt"] = DateTime.UtcNow.ToString("o"),
            ["customers"] = outCustomers,
            ["expenses"] = expenses.Select(e => new
            {
                id = e.LegacyId ?? "e_" + e.Id,
                name = e.Name ?? "",
                note = e.Note ?? "",
                tag = e.TagName ?? "",
                amount = e.Amount,
                rate = e.Rate,
                date = Fmt.InputDate(e.Date)
            }).ToList(),
            ["settings"] = new
            {
                mumGrFiyat = settings.MumGrFiyat,
                gumusGrFiyat = settings.GumusGrFiyat,
                altinGrFiyat = settings.AltinGrFiyat,
                shopName = settings.ShopName,
                expTags = tags
            }
        };
        return JsonSerializer.SerializeToUtf8Bytes(data, new JsonSerializerOptions { WriteIndented = false });
    }

    // ======================= JSON yardımcıları =======================

    static string? Str(JsonElement el, string name)
    {
        if (!el.TryGetProperty(name, out var v)) return null;
        return v.ValueKind switch
        {
            JsonValueKind.String => v.GetString(),
            JsonValueKind.Number => v.GetRawText(),
            JsonValueKind.True => "true",
            _ => null
        };
    }

    static decimal? Dec(JsonElement el, string name)
    {
        if (!el.TryGetProperty(name, out var v)) return null;
        if (v.ValueKind == JsonValueKind.Number && v.TryGetDecimal(out var d)) return d;
        if (v.ValueKind == JsonValueKind.String)
        {
            var s = (v.GetString() ?? "").Trim();
            if (s == "") return null;
            if (decimal.TryParse(s, NumberStyles.Number, CultureInfo.InvariantCulture, out d)) return d;
            if (decimal.TryParse(s, NumberStyles.Number, Fmt.Tr, out d)) return d;
        }
        return null;
    }

    static bool Bool(JsonElement el, string name) =>
        el.TryGetProperty(name, out var v) && (v.ValueKind == JsonValueKind.True || (v.ValueKind == JsonValueKind.String && v.GetString() == "true"));

    static IslemTuru? ParseKind(string? k) => k switch
    {
        "Altın" or "Altin" => IslemTuru.Altin,
        "Kalıp" or "Kalip" => IslemTuru.Kalip,
        _ => null
    };

    static DateOnly ParseDate(string? s) =>
        DateOnly.TryParseExact((s ?? "").Trim(), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var d)
            ? d : DateOnly.FromDateTime(DateTime.Today);

    /// <summary>"r_1726580000000" → oluşturulma zamanı.</summary>
    static DateTime? FromLegacyId(string? id)
    {
        if (string.IsNullOrEmpty(id)) return null;
        var parts = id.Split('_');
        return parts.Length > 1 && long.TryParse(parts[1], out var ms) ? FromMs(ms) : null;
    }

    static DateTime? FromMs(decimal? ms)
    {
        if (ms == null || ms < 946684800000m || ms > 4102444800000m) return null;
        return DateTimeOffset.FromUnixTimeMilliseconds((long)ms.Value).UtcDateTime;
    }

    static string? Cut(string? s, int max) => s == null ? null : (s.Length > max ? s[..max] : s);
}
