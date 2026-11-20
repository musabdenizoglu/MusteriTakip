using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MusteriTakip.Data;
using MusteriTakip.Models;
using MusteriTakip.Models.ViewModels;

namespace MusteriTakip.Controllers;

[AllowAnonymous]
public class AccountController : Controller
{
    private readonly AppDbContext _db;
    private readonly IPasswordHasher<AppUser> _hasher = new PasswordHasher<AppUser>();

    public AccountController(AppDbContext db) { _db = db; }

    [HttpGet]
    public IActionResult Login(string? returnUrl = null)
    {
        if (User.Identity?.IsAuthenticated == true) return RedirectToAction("Index", "Home");
        return View(new LoginVm { ReturnUrl = returnUrl });
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Login(LoginVm vm)
    {
        if (!ModelState.IsValid) return View(vm);
        var name = vm.UserName.Trim();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.UserName == name);
        if (user == null || _hasher.VerifyHashedPassword(user, user.PasswordHash, vm.Password) == PasswordVerificationResult.Failed)
        {
            ModelState.AddModelError("", "Kullanıcı adı veya şifre yanlış. Tekrar deneyin.");
            return View(vm);
        }
        await SignInAsync(user);
        if (!string.IsNullOrEmpty(vm.ReturnUrl) && Url.IsLocalUrl(vm.ReturnUrl)) return Redirect(vm.ReturnUrl);
        return RedirectToAction("Index", "Home");
    }

    [HttpGet]
    public IActionResult Register() => View(new RegisterVm());

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Register(RegisterVm vm)
    {
        if (!ModelState.IsValid) return View(vm);
        var name = vm.UserName.Trim();
        if (await _db.Users.AnyAsync(u => u.UserName == name))
        {
            ModelState.AddModelError(nameof(vm.UserName), "Bu kullanıcı adı kullanılıyor. Başka bir ad deneyin.");
            return View(vm);
        }
        var user = new AppUser { UserName = name, DisplayName = name, CreatedAt = DateTime.UtcNow };
        user.PasswordHash = _hasher.HashPassword(user, vm.Password);
        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        await SignInAsync(user);
        return RedirectToAction("Index", "Home");
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return RedirectToAction(nameof(Login));
    }

    private async Task SignInAsync(AppUser user)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.UserName),
            new("DisplayName", user.DisplayName ?? user.UserName)
        };
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme));
        await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal,
            new AuthenticationProperties { IsPersistent = true });
    }
}
