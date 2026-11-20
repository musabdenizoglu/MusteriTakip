using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using MusteriTakip.Data;
using MusteriTakip.Helpers;

namespace MusteriTakip.Services;

/// <summary>Müşteri kodu (2-3 harf) ve model kodu (KOD-0001) üretimi.</summary>
public class CodeService
{
    private readonly AppDbContext _db;
    public CodeService(AppDbContext db) { _db = db; }

    const string Alpha = "ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ";
    static readonly Regex CodeRe = new("^[A-ZÇĞİÖŞÜ]{2,3}$");

    public static string LettersOnly(string? s) =>
        new string(Fmt.Upper(s).Where(ch => Alpha.Contains(ch) || (ch >= 'A' && ch <= 'Z')).ToArray());

    async Task<HashSet<string>> TakenAsync(int? selfId) =>
        (await _db.Customers.IgnoreQueryFilters()
            .Where(c => c.DeletedAt == null && c.Code != null && (selfId == null || c.Id != selfId))
            .Select(c => c.Code!).ToListAsync())
        .Select(Fmt.Upper).ToHashSet();

    /// <summary>Addan benzersiz kod: kelimelerin baş harfleri (tek kelimede ilk 3 harf).</summary>
    public async Task<string> UniqueCodeAsync(string name, int? selfId = null)
    {
        var taken = await TakenAsync(selfId);
        var words = Fmt.Upper(name).Split(' ', StringSplitOptions.RemoveEmptyEntries).Select(LettersOnly).Where(w => w.Length > 0).ToList();
        var cands = new List<string>();
        if (words.Count >= 3) cands.Add(string.Concat(words.Take(3).Select(w => w[0])));
        if (words.Count >= 2)
        {
            cands.Add("" + words[0][0] + words[^1][0]);
            if (words[^1].Length > 1) cands.Add("" + words[0][0] + words[^1][0] + words[^1][1]);
            if (words[0].Length > 1) cands.Add("" + words[0][0] + words[0][1] + words[^1][0]);
        }
        if (words.Count >= 1)
        {
            var w = words[0];
            if (w.Length >= 3) cands.Add(w[..3]);
            if (w.Length >= 2) cands.Add(w[..2]);
        }
        foreach (var c in cands) if (CodeRe.IsMatch(c) && !taken.Contains(c)) return c;
        var first = words.Count > 0 ? words[0][0].ToString() : "M";
        foreach (var b in Alpha) foreach (var d in Alpha)
        {
            var c = first + b + d;
            if (!taken.Contains(c)) return c;
        }
        return "MXX";
    }

    /// <summary>Girilen kodu doğrular; boşsa addan üretir. Hata varsa (null, mesaj).</summary>
    public async Task<(string? code, string? error)> MakeCustomerCodeAsync(string? input, string name, int? selfId)
    {
        var raw = (input ?? "").Trim();
        if (raw == "") return (await UniqueCodeAsync(name, selfId), null);
        var v = LettersOnly(raw);
        if (!CodeRe.IsMatch(v) || raw.Any(char.IsDigit) || raw.Contains('-'))
            return (null, "Müşteri kodu 2 veya 3 harften oluşmalı (örn. KY veya MRT).");
        var owner = await _db.Customers.Where(c => c.Code == v && (selfId == null || c.Id != selfId)).Select(c => c.Name).FirstOrDefaultAsync();
        if (owner != null) return (null, $"“{v}” kodu başka bir müşteride kayıtlı ({owner}). Farklı bir kod yazın ya da boş bırakın.");
        return (v, null);
    }

    /// <summary>Müşterinin sıradaki model numarası (0001, 0002 …).</summary>
    public async Task<string> NextModelNoAsync(int customerId, string custCode)
    {
        var codes = await _db.OrderRecords.IgnoreQueryFilters()
            .Where(r => r.CustomerId == customerId && r.Code != null)
            .Select(r => r.Code!).ToListAsync();
        int max = 0;
        var re = new Regex("^" + Regex.Escape(custCode) + @"-(\d+)$", RegexOptions.IgnoreCase);
        foreach (var c in codes)
        {
            var m = re.Match(c);
            if (m.Success && int.TryParse(m.Groups[1].Value, out var n) && n > max) max = n;
        }
        return (max + 1).ToString("D4");
    }

    public async Task<bool> ModelCodeTakenAsync(int customerId, string code, int? exceptRecordId)
    {
        var up = code.ToUpperInvariant();
        var codes = await _db.OrderRecords.Where(r => r.CustomerId == customerId && r.Code != null && (exceptRecordId == null || r.Id != exceptRecordId))
            .Select(r => r.Code!).ToListAsync();
        return codes.Any(c => c.ToUpperInvariant() == up);
    }
}
