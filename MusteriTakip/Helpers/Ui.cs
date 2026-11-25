using MusteriTakip.Models;
using MusteriTakip.Services;

namespace MusteriTakip.Helpers;

/// <summary>
/// Referans HTML (musteritakip.html) ile birebir aynı görünüm için küçük yardımcılar:
/// müşteri kodu, ödeme kodu/rozeti, avatar rengi vb. HTML'deki JS fonksiyonlarının C# karşılıkları.
/// </summary>
public static class Ui
{
    // HTML: AV_COLORS + avColor()
    static readonly string[] AvColors = { "#2E6F5E", "#C98A2B", "#3A6EA5", "#9B4F96", "#C0563B", "#4F8A3C", "#6250D6", "#B23B6B", "#2B8A99", "#8A6D3B" };

    public static string AvColor(string? name)
    {
        uint h = 0;
        foreach (var ch in name ?? "") h = unchecked(h * 31 + ch);
        return AvColors[h % (uint)AvColors.Length];
    }

    /// <summary>HTML: initialsOf() — ilk kelimenin ve son kelimenin baş harfi.</summary>
    public static string Initials(string? name)
    {
        var p = (name ?? "").Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var s = (p.Length > 0 ? p[0][..1] : "?") + (p.Length > 1 ? p[^1][..1] : "");
        return s.ToUpper(Fmt.Tr);
    }

    /// <summary>HTML: custCodeOf() — kayıtlı kodun harfleri (2-3), yoksa addan türetilen harfler.</summary>
    public static string CustCode(Customer c)
    {
        var l = CodeService.LettersOnly((c.Code ?? "").Split('-')[0]);
        if (l.Length >= 2) return l[..Math.Min(3, l.Length)];
        return CodeLetters(c.Name);
    }

    /// <summary>HTML: codeLetters() — addan 3 harf.</summary>
    public static string CodeLetters(string? name)
    {
        var w = Fmt.Upper(name).Split(' ', StringSplitOptions.RemoveEmptyEntries).Select(CodeService.LettersOnly).Where(x => x.Length > 0).ToList();
        if (w.Count == 0) return "MKT";
        var o = w.Count >= 3 ? string.Concat(w.Take(3).Select(x => x[0])) : string.Concat(w.Select(x => x[0]));
        if (o.Length < 3) o += w[0][1..] + (w.Count > 1 ? w[1][1..] : "");
        return (o + "XXX")[..3];
    }

    public static bool IsHurda(Payment p) => p.PayType == OdemeTuru.Gram && p.Method == "Hurda altın";

    /// <summary>HTML: payCodeOf() — MÜŞTERİKODU-Hurda / -Has / -₺ / -$</summary>
    public static string PayCode(Payment p, Customer c)
    {
        var cc = CustCode(c);
        if (cc == "") return "";
        var t = IsHurda(p) ? "Hurda" : p.PayType switch { OdemeTuru.Gram => "Has", OdemeTuru.Tl => "₺", OdemeTuru.Eur => "€", _ => "$" };
        return cc + "-" + t;
    }

    /// <summary>HTML: rzCode() — ödeme rozetindeki kısa yazı.</summary>
    public static string PayBadge(Payment p) => p.PayType switch
    {
        OdemeTuru.Tl => "₺",
        OdemeTuru.Eur => "€",
        OdemeTuru.Gram => "Au",
        _ => p.Method == "Havale / EFT" ? "H" : "$"
    };

    /// <summary>HTML: rzCls() — ödeme kodunun renk sınıfı.</summary>
    public static string PayCls(Payment p) => p.PayType switch
    {
        OdemeTuru.Tl => "k-purple",
        OdemeTuru.Eur => "k-eur",
        OdemeTuru.Gram => "k-orange",
        _ => p.Method == "Havale / EFT" ? "k-blue" : "k-green"
    };

    /// <summary>HTML: payDescParts().main — ödemenin ana açıklaması.</summary>
    public static string PayMain(Payment p)
    {
        var note = (p.Note ?? "").Trim();
        if (p.Kind == IslemTuru.Kalip || p.PayType == OdemeTuru.Yok) return note != "" ? note : "ÖDEME";
        if (IsHurda(p)) return note != "" ? note : "HURDA ÖDEME";
        if (p.PayType == OdemeTuru.Gram) return note != "" ? note : "HAS ÖDEME";
        var cur = p.PayType == OdemeTuru.Tl && (p.Tl ?? 0) > 0 ? "TL" : (p.PayType == OdemeTuru.Eur && (p.Eur ?? 0) > 0 ? "€" : "$");
        if ((p.GoldEq ?? 0) > 0 && (p.GoldEqPrice ?? 0) > 0) return note != "" ? note : "ALTIN BORCU NAKİT ÖDEME " + cur;
        return note != "" ? note : "NAKİT ÖDEME " + cur;
    }

    /// <summary>HTML: payDescParts().sub — ödemenin ikinci satırı (hurda hesabı, altın borcu nakit ödeme).</summary>
    public static string? PaySub(Payment p)
    {
        if (p.Kind == IslemTuru.Kalip) return null;
        if (IsHurda(p))
            return (p.HurdaGr ?? 0) > 0 ? $"Hurda {(p.HurdaGr ?? 0).ToString("0.##", Fmt.Tr)} gr x {(p.HurdaMil ?? 0).ToString("0", Fmt.Tr)} → {(p.Gram ?? 0).ToString("0.###", Fmt.Tr)} gr has" : null;
        if (p.PayType is OdemeTuru.Usd or OdemeTuru.Tl or OdemeTuru.Eur && (p.GoldEq ?? 0) > 0 && (p.GoldEqPrice ?? 0) > 0)
        {
            var isTl = p.PayType == OdemeTuru.Tl && (p.Tl ?? 0) > 0;
            var rate = p.Rate ?? 0;
            var isEur = p.PayType == OdemeTuru.Eur && (p.Eur ?? 0) > 0;
            var er = p.EurRate ?? 0;
            var paid = isTl ? Fmt.Tl(p.Tl) : (isEur ? Fmt.Eur(p.Eur) : Fmt.Usd(p.Amount));
            var price = isTl && rate > 0 ? Fmt.Tl(p.GoldEqPrice * rate) : (isEur && er > 0 ? Fmt.Eur(p.GoldEqPrice / er) : Fmt.Usd(p.GoldEqPrice));
            var u = LedgerService.PayUsd(p);
            return $"{paid} / {price} → {Fmt.Gr(p.GoldEq)}" + (u > 0.005m ? " · artan " + (isTl && rate > 0 ? Fmt.Tl(u * rate) : (isEur && er > 0 ? Fmt.Eur(u / er) : Fmt.Usd(u))) + " nakit borcuna" : "");
        }
        return null;
    }

    /// <summary>Kalıp (ya da türsüz) ödemenin açıklaması: not, yoksa ödeme şekli.</summary>
    public static string PayPlainDesc(Payment p)
    {
        var note = (p.Note ?? "").Trim();
        if (note != "") return note;
        if (p.Method == "Hurda altın" && (p.HurdaGr ?? 0) > 0) return $"Hurda altın {(p.HurdaGr ?? 0).ToString("0.##", Fmt.Tr)} gr" + ((p.HurdaMil ?? 0) > 0 ? " · " + (p.HurdaMil ?? 0).ToString("0", Fmt.Tr) : "");
        return string.IsNullOrEmpty(p.Method) ? "Ödeme" : p.Method;
    }

    /// <summary>HTML: payAcctLine() — "altın hesabına" satırı.</summary>
    public static string? PayAcct(Payment p)
    {
        if (p.PayType == OdemeTuru.Gram) return "altın hesabına";
        if ((p.GoldEq ?? 0) > 0)
        {
            var u = LedgerService.PayUsd(p);
            return Fmt.Gr(p.GoldEq) + " altın hesabına" + (u > 0.005m ? " · " + Fmt.Usd(u) + " işçiliğe" : "");
        }
        return null;
    }

    /// <summary>HTML: goldCalcLine() — "4,20 gr × 750 = 3,150 gr".</summary>
    public static string? GoldCalc(OrderRecord r)
    {
        var g = r.AltinGram ?? 0; var m = r.AltinMilyem ?? 0;
        if (!(g > 0) || !(m > 0)) return null;
        return $"{g.ToString("N2", Fmt.Tr)} gr × {m.ToString("0", Fmt.Tr)} = {Fmt.Gr(LedgerService.RecGoldOut(r))}";
    }

    /// <summary>HTML: fmtRate() — kur, 2-4 ondalık.</summary>
    public static string Rate(decimal v) => v.ToString("#,##0.00##", Fmt.Tr);

    /// <summary>Ödeme satırındaki "kur 42,45" notu (has/hurda ödemede yok).</summary>
    public static decimal? PayRate(Payment p) => p.PayType == OdemeTuru.Eur ? ((p.EurRate ?? 0) > 0 ? p.EurRate : null) : (p.PayType != OdemeTuru.Gram && (p.Rate ?? 0) > 0 ? p.Rate : null);

    /// <summary>Sipariş/borç satırındaki tür etiketi (Altın, Kalıp, Eski borç, Eski bakiye).</summary>
    public static string RecKind(OrderRecord r) => r.IsDebt ? (r.IsOpening ? "Eski bakiye" : "Eski borç") : Fmt.KindText(r.Kind);

    public static string RecKindCls(OrderRecord r) => r.IsDebt ? " k-debt" : (r.Kind == IslemTuru.Kalip ? " k-kalip" : (r.Kind == IslemTuru.Altin ? " k-altin" : ""));

    public static string Time(DateTime utcOrLocal) =>
        (utcOrLocal.Kind == DateTimeKind.Utc ? utcOrLocal.ToLocalTime() : utcOrLocal).ToString("HH:mm", Fmt.Tr);

    /// <summary>Saate göre selam (HTML: helloTitle).</summary>
    public static string Greeting()
    {
        var h = DateTime.Now.Hour;
        return h < 5 ? "İyi geceler" : h < 12 ? "Günaydın" : h < 18 ? "İyi günler" : h < 23 ? "İyi akşamlar" : "İyi geceler";
    }

    /// <summary>"musab" → "Musab" (HTML: userName()).</summary>
    public static string Cap(string? s) => string.IsNullOrEmpty(s) ? "" : s[..1].ToUpper(Fmt.Tr) + s[1..];

    /// <summary>Halka (yüzük) yer tutucu ikon — HTML: phRing().</summary>
    public const string PhRing = "<span class=\"ph-ring\" aria-hidden=\"true\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\"><path d=\"M9 2.5h6l2 3-5 4-5-4z\"/><circle cx=\"12\" cy=\"15.5\" r=\"6\"/><circle cx=\"12\" cy=\"15.5\" r=\"3.8\"/></svg></span>";
}
