using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MusteriTakip.Data;
using MusteriTakip.Models;
using MusteriTakip.Models.ViewModels;
using MusteriTakip.Services;

namespace MusteriTakip.Controllers;

public class SettingsController : Controller
{
    private readonly AppDbContext _db;
    private readonly SettingsService _settings;
    private readonly IPasswordHasher<AppUser> _hasher = new PasswordHasher<AppUser>();

    public SettingsController(AppDbContext db, SettingsService settings) { _db = db; _settings = settings; }

    public async Task<IActionResult> Index()
    {
        var s = await _settings.GetAsync();
        return View(new SettingsVm
        {
            MumGrFiyat = s.MumGrFiyat,
            GumusGrFiyat = s.GumusGrFiyat,
            AltinGrFiyat = s.AltinGrFiyat,
            ShopName = s.ShopName,
            WatermarkBrand = s.WatermarkBrand,
            Tags = await _db.ExpenseTags.OrderBy(t => t.SortOrder).ThenBy(t => t.Name).ToListAsync(),
            CustomerCount = await _db.Customers.CountAsync(),
            RecordCount = await _db.OrderRecords.CountAsync(),
            PaymentCount = await _db.Payments.CountAsync(),
            ExpenseCount = await _db.Expenses.CountAsync()
        });
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> SavePrices(decimal? mumGrFiyat, decimal? gumusGrFiyat, decimal? altinGrFiyat)
    {
        var s = await _settings.GetAsync();
        s.MumGrFiyat = mumGrFiyat;
        s.GumusGrFiyat = gumusGrFiyat;
        s.AltinGrFiyat = altinGrFiyat;
        await _db.SaveChangesAsync();
        TempData["Ok"] = "✓ Fiyatlar kaydedildi.";
        return RedirectToAction(nameof(Index));
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> SaveShop(string? shopName, string? watermarkBrand)
    {
        var s = await _settings.GetAsync();
        s.ShopName = string.IsNullOrWhiteSpace(shopName) ? null : shopName.Trim()[..Math.Min(60, shopName.Trim().Length)];
        s.WatermarkBrand = string.IsNullOrWhiteSpace(watermarkBrand) ? "ARTE DESIGN" : watermarkBrand.Trim()[..Math.Min(40, watermarkBrand.Trim().Length)];
        await _db.SaveChangesAsync();
        TempData["Ok"] = "✓ Kaydedildi.";
        return RedirectToAction(nameof(Index));
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> AddTag(string? name)
    {
        name = (name ?? "").Trim();
        if (name == "") return RedirectToAction(nameof(Index));
        if (await _db.ExpenseTags.AnyAsync(t => t.Name == name)) TempData["Error"] = $"“{name}” etiketi zaten var.";
        else
        {
            _db.ExpenseTags.Add(new ExpenseTag { Name = name.Length > 60 ? name[..60] : name, SortOrder = await _db.ExpenseTags.CountAsync() + 1 });
            await _db.SaveChangesAsync();
        }
        return RedirectToAction(nameof(Index));
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> DeleteTag(int id)
    {
        var t = await _db.ExpenseTags.FindAsync(id);
        if (t != null)
        {
            // Giderlerde etiket adı TagName olarak kalır
            _db.ExpenseTags.Remove(t);
            await _db.SaveChangesAsync();
        }
        return RedirectToAction(nameof(Index));
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> ChangePassword(string? current, string? next)
    {
        var id = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");
        var user = await _db.Users.FindAsync(id);
        if (user == null) return RedirectToAction("Login", "Account");
        if (_hasher.VerifyHashedPassword(user, user.PasswordHash, current ?? "") == PasswordVerificationResult.Failed)
            TempData["Error"] = "Mevcut şifre yanlış.";
        else if (string.IsNullOrWhiteSpace(next) || next.Length < 4)
            TempData["Error"] = "Yeni şifre en az 4 karakter olmalı.";
        else
        {
            user.PasswordHash = _hasher.HashPassword(user, next);
            await _db.SaveChangesAsync();
            TempData["Ok"] = "Şifre değiştirildi.";
        }
        return RedirectToAction(nameof(Index));
    }
}
