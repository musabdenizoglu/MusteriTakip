using System.Globalization;

namespace MusteriTakip.Helpers;

public static class Dates
{
    public static DateOnly Today => DateOnly.FromDateTime(DateTime.Now);

    /// <summary>"yyyy-MM-dd" → DateOnly; boş ya da hatalıysa bugün.</summary>
    public static DateOnly ParseOrToday(string? s) => TryParse(s) ?? Today;

    public static DateOnly? TryParse(string? s) =>
        DateOnly.TryParseExact((s ?? "").Trim(), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var d) ? d : null;

    /// <summary>Dönem filtresi: m0 bu ay, m1 geçen ay, y0 bu yıl, y1 geçen yıl.</summary>
    public static (DateOnly from, DateOnly to)? Period(string? p)
    {
        var t = Today;
        var m0 = new DateOnly(t.Year, t.Month, 1);
        return p switch
        {
            "m0" => (m0, m0.AddMonths(1).AddDays(-1)),
            "m1" => (m0.AddMonths(-1), m0.AddDays(-1)),
            "y0" => (new DateOnly(t.Year, 1, 1), new DateOnly(t.Year, 12, 31)),
            "y1" => (new DateOnly(t.Year - 1, 1, 1), new DateOnly(t.Year - 1, 12, 31)),
            _ => null
        };
    }
}
