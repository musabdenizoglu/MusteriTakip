using System.Globalization;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Localization;
using Microsoft.AspNetCore.Mvc.Authorization;
using Microsoft.EntityFrameworkCore;
using MusteriTakip.Data;
using MusteriTakip.Services;

var builder = WebApplication.CreateBuilder(args);

// ---- Veritabanı: appsettings.json → "DatabaseProvider": "Sqlite" (varsayılan) ya da "SqlServer" ----
var provider = builder.Configuration["DatabaseProvider"] ?? "Sqlite";
builder.Services.AddDbContext<AppDbContext>(opt =>
{
    if (provider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase))
        opt.UseSqlServer(builder.Configuration.GetConnectionString("SqlServer"));
    else
        opt.UseSqlite(builder.Configuration.GetConnectionString("Sqlite"));
});

builder.Services.AddScoped<LedgerService>();
builder.Services.AddScoped<CodeService>();
builder.Services.AddScoped<ImageService>();
builder.Services.AddScoped<BackupService>();
builder.Services.AddScoped<SettingsService>();

// ---- Giriş (çerez) ----
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(o =>
    {
        o.LoginPath = "/Account/Login";
        o.LogoutPath = "/Account/Logout";
        o.ExpireTimeSpan = TimeSpan.FromDays(14);
        o.SlidingExpiration = true;
    });

builder.Services.AddControllersWithViews(o =>
{
    // Tüm sayfalar giriş ister; AccountController [AllowAnonymous]
    o.Filters.Add(new AuthorizeFilter(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build()));
});

// Büyük resimli yedek dosyaları için istek boyutu sınırı
builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(o => o.MultipartBodyLengthLimit = 512L * 1024 * 1024);
builder.WebHost.ConfigureKestrel(k => k.Limits.MaxRequestBodySize = 512L * 1024 * 1024);

var app = builder.Build();

// ---- Veritabanını oluştur ve başlangıç verilerini (seed) yaz ----
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    if (db.Database.GetMigrations().Any())
        db.Database.Migrate();      // "dotnet ef migrations add ..." ile migration eklediyseniz
    else
    {
        db.Database.EnsureCreated(); // migration yoksa şemayı modelden oluşturur (seed dahil)
        // Sonradan eklenen sütunlar: eski veritabanına elle eklenir
        // Mevcut sıralama korunsun: eskiden Kasa düzenleme anına göre sıralanıyordu
        db.Database.ExecuteSqlRaw(@"
IF COL_LENGTH('OrderRecords', 'UpdatedAt') IS NULL
BEGIN
    ALTER TABLE OrderRecords ADD UpdatedAt datetime2 NULL;
    EXEC('UPDATE OrderRecords SET UpdatedAt = EditedAt');
END
IF COL_LENGTH('OrderRecords', 'EditNote') IS NULL
    ALTER TABLE OrderRecords ADD EditNote nvarchar(2000) NULL;");
    }
}

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

// Sayılar formdan nokta ile gelir (input type=number); ekranda Türkçe biçim Fmt sınıfıyla yapılır.
var invariant = CultureInfo.InvariantCulture;
app.UseRequestLocalization(new RequestLocalizationOptions
{
    DefaultRequestCulture = new RequestCulture(invariant),
    SupportedCultures = new[] { invariant },
    SupportedUICultures = new[] { invariant }
});

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllerRoute(name: "default", pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();
