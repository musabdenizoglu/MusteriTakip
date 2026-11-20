using Microsoft.AspNetCore.Mvc;
using MusteriTakip.Services;

namespace MusteriTakip.Controllers;

/// <summary>Yedek al / yedeği yükle (HTML sürümünün yedek dosyalarıyla uyumlu).</summary>
public class BackupController : Controller
{
    private readonly BackupService _backup;
    public BackupController(BackupService backup) { _backup = backup; }

    public IActionResult Index() => View();

    public async Task<IActionResult> Export(bool images = true)
    {
        var bytes = await _backup.ExportAsync(images);
        return File(bytes, "application/json", $"musteri-takip-yedek-{DateTime.Now:yyyy-MM-dd_HH-mm}.json");
    }

    [HttpPost, ValidateAntiForgeryToken]
    [RequestSizeLimit(512L * 1024 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = 512L * 1024 * 1024)]
    public async Task<IActionResult> Import(IFormFile? file, bool replaceAll = false)
    {
        if (file == null || file.Length == 0)
        {
            TempData["Error"] = "Lütfen bir yedek dosyası (.json) seçin.";
            return RedirectToAction(nameof(Index));
        }
        try
        {
            await using var s = file.OpenReadStream();
            var r = await _backup.ImportHtmlBackupAsync(s, replaceAll);
            TempData["Ok"] = $"Yedek yüklendi: {r.Customers} müşteri, {r.Records} sipariş/borç, {r.Payments} ödeme, {r.Expenses} gider, {r.Images} resim" +
                             (r.Users > 0 ? $", {r.Users} kullanıcı" : "") + ".";
        }
        catch (Exception ex)
        {
            TempData["Error"] = "Yedek yüklenemedi: " + ex.Message;
        }
        return RedirectToAction(nameof(Index));
    }
}
