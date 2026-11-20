using System.Globalization;
using MusteriTakip.Models;

namespace MusteriTakip.Helpers;

/// <summary>Ekranda Türkçe biçim: 1.234,56 $ · 1.234,56 ₺ · 3,744 gr · 20.11.2026</summary>
public static class Fmt
{
    public static readonly CultureInfo Tr = CultureInfo.GetCultureInfo("tr-TR");

    public static string Usd(decimal? v) => (v ?? 0m).ToString("N2", Tr) + " $";
    public static string Tl(decimal? v) => (v ?? 0m).ToString("N2", Tr) + " ₺";
    public static string Gr(decimal? v) => (v ?? 0m).ToString("N3", Tr) + " gr";
    public static string Gr2(decimal? v) => (v ?? 0m).ToString("N2", Tr) + " gr";
    public static string Num(decimal? v, int digits = 2) => v.HasValue ? v.Value.ToString("N" + digits, Tr) : "—";
    public static string Rate(decimal? v) => v.HasValue && v > 0 ? v.Value.ToString("0.####", Tr) + " ₺" : "—";
    public static string Date(DateOnly d) => d.ToString("dd.MM.yyyy", Tr);
    public static string Date(DateOnly? d) => d.HasValue ? Date(d.Value) : "—";
    public static string Month(int year, int month) => new DateTime(year, month, 1).ToString("MMMM yyyy", Tr);
    public static string MonthShort(int month) => new DateTime(2000, month, 1).ToString("MMM", Tr);

    /// <summary>input value="" için: nokta ondalıklı, boşsa "".</summary>
    public static string Input(decimal? v) => v.HasValue ? v.Value.ToString(CultureInfo.InvariantCulture) : "";
    public static string InputDate(DateOnly? d) => d.HasValue ? d.Value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) : "";

    public static string Upper(string? s) => (s ?? "").Trim().ToUpper(Tr);

    public static string KindText(IslemTuru? k) => k switch
    {
        IslemTuru.Altin => "Altın",
        IslemTuru.Kalip => "Kalıp",
        _ => ""
    };

    public static string Initials(string? name)
    {
        var parts = (name ?? "").Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length == 0) return "?";
        if (parts.Length == 1) return parts[0][..Math.Min(2, parts[0].Length)].ToUpper(Tr);
        return (parts[0][..1] + parts[^1][..1]).ToUpper(Tr);
    }

    /// <summary>İsimden sabit bir avatar rengi.</summary>
    public static string AvatarColor(string? name)
    {
        string[] colors = { "#2A78D6", "#1BAF7A", "#6250D6", "#D64545", "#E8862A", "#0F5A47", "#C98A2B", "#7A1F2B" };
        int h = 0;
        foreach (var ch in name ?? "") h = (h * 31 + ch) & 0x7fffffff;
        return colors[h % colors.Length];
    }

    /// <summary>0532 111 22 33 → 905321112233 (WhatsApp bağlantısı için).</summary>
    public static string WaPhone(string? raw)
    {
        var d = new string((raw ?? "").Where(char.IsDigit).ToArray());
        if (d.StartsWith("00")) d = d[2..];
        if (d.StartsWith("0")) d = "90" + d[1..];
        else if (d.Length == 10 && d.StartsWith("5")) d = "90" + d;
        return d;
    }
}
