using System.Text.RegularExpressions;

namespace MusteriTakip.Services;

/// <summary>
/// Tarayıcıda sıkıştırılıp (gerekirse filigranlanıp) data URL olarak gelen resimleri
/// wwwroot/uploads altına dosya olarak kaydeder; veritabanında yalnızca yol tutulur.
/// </summary>
public class ImageService
{
    private readonly IWebHostEnvironment _env;
    static readonly Regex DataUrlRe = new(@"^data:image/(png|jpe?g|webp|gif|bmp);base64,(.+)$", RegexOptions.IgnoreCase | RegexOptions.Singleline);

    public ImageService(IWebHostEnvironment env) { _env = env; }

    public async Task<string?> SaveDataUrlAsync(string? dataUrl, string folder)
    {
        if (string.IsNullOrWhiteSpace(dataUrl)) return null;
        var m = DataUrlRe.Match(dataUrl.Trim());
        if (!m.Success) return null;
        byte[] bytes;
        try { bytes = Convert.FromBase64String(m.Groups[2].Value); }
        catch (FormatException) { return null; }
        var ext = m.Groups[1].Value.ToLowerInvariant() switch
        {
            "jpeg" or "jpg" => "jpg",
            var x => x
        };
        var dir = Path.Combine(_env.WebRootPath, "uploads", folder);
        Directory.CreateDirectory(dir);
        var name = $"{DateTime.UtcNow:yyyyMMddHHmmssfff}_{Guid.NewGuid():N}"[..30] + "." + ext;
        await File.WriteAllBytesAsync(Path.Combine(dir, name), bytes);
        return $"/uploads/{folder}/{name}";
    }

    public void Delete(string? path)
    {
        if (string.IsNullOrWhiteSpace(path) || !path.StartsWith("/uploads/")) return;
        var full = Path.Combine(_env.WebRootPath, path.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
        try { if (File.Exists(full)) File.Delete(full); } catch { /* yoksay */ }
    }

    /// <summary>Kayıtlı resmi data URL olarak okur (yedek dosyası için).</summary>
    public async Task<string?> ReadAsDataUrlAsync(string? path)
    {
        if (string.IsNullOrWhiteSpace(path) || !path.StartsWith("/uploads/")) return null;
        var full = Path.Combine(_env.WebRootPath, path.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
        if (!File.Exists(full)) return null;
        var ext = Path.GetExtension(full).TrimStart('.').ToLowerInvariant();
        var mime = ext == "jpg" ? "jpeg" : ext;
        return $"data:image/{mime};base64,{Convert.ToBase64String(await File.ReadAllBytesAsync(full))}";
    }
}
