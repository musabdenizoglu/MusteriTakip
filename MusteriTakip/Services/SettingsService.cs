using Microsoft.EntityFrameworkCore;
using MusteriTakip.Data;
using MusteriTakip.Models;

namespace MusteriTakip.Services;

public class SettingsService
{
    private readonly AppDbContext _db;
    public SettingsService(AppDbContext db) { _db = db; }

    public async Task<AppSetting> GetAsync()
    {
        var s = await _db.Settings.FirstOrDefaultAsync(x => x.Id == 1);
        if (s == null)
        {
            s = new AppSetting { Id = 1, WatermarkBrand = "ARTE DESIGN" };
            _db.Settings.Add(s);
            await _db.SaveChangesAsync();
        }
        return s;
    }
}
