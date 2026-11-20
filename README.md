# Müşteri Takip — ASP.NET Core MVC + Entity Framework Core

Bu proje, tarayıcıda çalışan **Müşteri Takip** HTML uygulamasının .NET (MVC) sürümüdür.
Veriler artık tarayıcının hafızasında değil, **Entity Framework Core** ile yönetilen bir veritabanında tutulur.

## Gereksinimler
- **.NET 10 SDK** (https://dotnet.microsoft.com/download)
- Visual Studio 2026 / VS Code / Rider (isteğe bağlı)

> .NET 8 veya 9 kullanıyorsanız: `MusteriTakip.csproj` içinde `net10.0` yerine `net8.0` / `net9.0` yazın,
> EF Core paketlerinin sürümünü de `8.0.x` / `9.0.x` yapın.

## Çalıştırma
```bash
cd "MusteriTakip"
dotnet restore
dotnet run
```
Tarayıcıda `https://localhost:7180` açılır.

**İlk giriş:** kullanıcı adı `admin`, şifre `admin123` (Ayarlar → Şifre değiştir).
Giriş ekranındaki "Hesap oluştur" ile yeni kullanıcı da açabilirsiniz.

Visual Studio ile: `MusteriTakip.sln` dosyasını açıp **F5**'e basın.

## Veritabanı
`appsettings.json`:
```json
"DatabaseProvider": "Sqlite",              // ya da "SqlServer"
"ConnectionStrings": {
  "Sqlite":    "Data Source=musteritakip.db",
  "SqlServer": "Server=(localdb)\\MSSQLLocalDB;Database=MusteriTakip;Trusted_Connection=True;TrustServerCertificate=True"
}
```
- **SQLite (varsayılan):** kurulum gerekmez; proje klasöründe `musteritakip.db` dosyası oluşur.
- **SQL Server / LocalDB:** `DatabaseProvider` değerini `SqlServer` yapın.

Uygulama ilk açılışta veritabanını modelden oluşturur (`EnsureCreated`) ve başlangıç verilerini (seed) yazar.

### Migration ile çalışmak isterseniz
```bash
dotnet tool install --global dotnet-ef
dotnet ef migrations add Ilk
dotnet ef database update
```
Migration eklendikten sonra uygulama açılışta `Migrate()` kullanır. (Daha önce `EnsureCreated` ile
oluşmuş bir veritabanı varsa önce onu silin: `musteritakip.db`.)

### Başlangıç verileri (Data/SeedData.cs)
- Kullanıcı: `admin` / `admin123`
- Ayarlar: mum 1,50 $/gr · gümüş 1,20 $/gr · altın işçilik 2,50 $/gr · filigran "ARTE DESIGN"
- Gider etiketleri: Kira, Fatura, Malzeme, Kargo, Personel
- 4 örnek müşteri, 7 sipariş/borç (Altın ve Kalıp, masraflı), 6 ödeme (dolar, TL, has, hurda), 6 gider

Örnek veriler olmadan başlamak için `SeedData.cs` içinde müşteri/sipariş/ödeme/gider bloklarını silin
ve veritabanı dosyasını silip uygulamayı yeniden çalıştırın.

## Veritabanı modeli
| Tablo | Açıklama |
|---|---|
| `Users` | Kullanıcılar (şifreler PasswordHasher ile şifrelenir) |
| `Customers` | Müşteri: ad, telefon, e-posta, 2-3 harfli kod, profil resmi, not |
| `OrderRecords` | Sipariş ya da eski borç: model kodu (KY-0001), tür (Altın/Kalıp), mum/gümüş/altın gr ve $, milyem, altın çıkış, çizim, fiyat, not, resim, kayıt anındaki fiyatlar |
| `OrderExpenses` | Siparişin masraf satırları (cila, kaplama, taş mıhlama…) |
| `Payments` | Ödeme: tür (Altın/Kalıp), ödeme türü (has gr / hurda / dolar / TL), kur, altın fiyatı, hurda gr × milyem, altın borcuna sayılan kısım |
| `Expenses` | Gider (₺) ve dolar kuru |
| `ExpenseTags` | Gider etiketleri |
| `Settings` | Mum/gümüş/altın fiyatları, işyeri adı, filigran yazısı |

Silinen müşteri, sipariş, ödeme ve gider **çöp kutusuna** gider (`DeletedAt`), 30 gün sonra kalıcı silinir.
Resimler `wwwroot/uploads` klasörüne kaydedilir; veritabanında yolu tutulur.

## HTML sürümündeki verilerinizi aktarma
1. Tarayıcıdaki Müşteri Takip programında **⬇ Yedek Al**'a basın (`musteri-takip-….json` iner).
2. Bu uygulamada **Ayarlar → ⬆ Yedeği yükle** sayfasında dosyayı seçin.
3. "Mevcut kayıtları sil, yedektekilerle değiştir" işaretliyse örnek verilerin yerine sizin verileriniz gelir.

Müşteriler, siparişler, ödemeler, giderler, gider etiketleri, fiyat ayarları, kullanıcılar ve resimler aktarılır.
Bu uygulamadan alınan yedek de aynı biçimdedir.

## Hesap kuralları (HTML ile aynı)
- **İki ayrı hesap:** dolar (işçilik) hesabı ve altın (gr) hesabı.
- Altın çıkış = altın gr × milyem ÷ 1000 (binde bire aşağı yuvarlanır) → müşterinin altın borcu.
- Siparişte fiyat = mum $ + gümüş $ + altın $ + çizim + masraflar, **bir üst tam dolara** yuvarlanır.
- Altın gr ve milyem girilmişse sipariş "Altın", değilse "Kalıp" olur.
- Has/hurda altın ödemesi altın hesabından düşer; dolar/TL ödemesi dolar hesabından düşer
  (istenirse "altın borcuna say" ile altına çevrilir).
- Genel Kasa bakiyesi = tahsilat − gider ($). Gider $ = gider ₺ ÷ kur.

## Sayfalar
Ana Sayfa (bu ay özeti, alacaklar, zaman çizgisi) · Yeni Sipariş · Müşteri Kaydı · Müşteriler ·
Müşteri sayfası (sipariş geçmişi, hesap hareketleri, WhatsApp özeti, ekstre/PDF) · Genel Kasa (filtre, Excel'e aktar) ·
Giderler · Raporlar (aylık ciro/kâr/tahsilat/gider, gider türleri, en iyi müşteriler) · Ayarlar · Çöp Kutusu · Yedekleme.

Canlı dolar / gram altın fiyatları ve fotoğraf filigranı (marka + model kodu) tarayıcıda, HTML sürümündeki gibi çalışır.
