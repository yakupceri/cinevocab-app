# CineVocab: Kurulum + Chrome Web Store Rehberi

## 1) Railway'e eklenecek değişkenler (Variables)

| Değişken | Değer | Neden |
|---|---|---|
| `ADMIN_USER` | senin seçtiğin ad | Admin paneli girişi (`/admin`) |
| `ADMIN_PASSWORD` | en az 12 karakter, benzersiz | Admin paneli parolası |
| `ADMIN_SECRET` | rastgele uzun metin (ör. 40 karakter) | Oturum imzası |
| `GOOGLE_TRANSLATE_API_KEY` | Google Cloud > Cloud Translation API (v2) anahtarı | YouTube'daki `?` sorununu çözer |
| `CONTACT_EMAIL` | destek e-postan | Gizlilik sayfasında görünür |

* `ADMIN_USER` / `ADMIN_PASSWORD` tanımlı değilse `/admin` adresi tamamen kapalıdır (404).
* Admin hesabı veritabanında değil ortam değişkenindedir; kullanıcı tablosundan kimse admin olamaz.
* Panel: `https://cinevocab.up.railway.app/admin`

### Google Cloud Translation anahtarı
1. console.cloud.google.com > yeni proje > "Cloud Translation API"yi etkinleştir.
2. API ve Hizmetler > Kimlik bilgileri > API anahtarı oluştur.
3. Anahtarı kısıtla: "API kısıtlaması" = sadece Cloud Translation API.
4. Faturalandırma bağla. Ayda ilk 500.000 karakter ücretsiz; her kelime veritabanına kaydolduğu için bir kez çevrilir, maliyet pratikte ~0.
5. Bütçe uyarısı koy (ör. 5 $).

## 2) Dağıtım
```
git rm -r --cached __pycache__ .DS_Store "*.bak" "*.bak5" extension.zip   # çöp dosyaları git'ten çıkar
git add -A && git commit -m "admin panel, udemy, youtube fix" && git push
```
Railway otomatik yeniden dağıtır. Sonra `/admin` > Sistem sekmesinde "Resmi Google Cloud Translation anahtarı tanımlı ✔" yazmalı.

## 3) Chrome Web Store başvurusu
1. chrome.google.com/webstore/devconsole > geliştirici hesabı (tek seferlik 5 $, hesapta 2 adımlı doğrulama şart).
2. "Yeni öğe" > `cinevocab-extension-1.6.0.zip` dosyasını yükle (manifest.json zip'in kökünde olmalı; öyle hazırlandı).
3. **Mağaza kaydı:** kategori Eğitim, dil Türkçe (+ İngilizce açıklama), en az 1 ekran görüntüsü (1280x800), küçük tanıtım görseli 440x280, ikon 128x128 (var).
4. **Gizlilik sekmesi:**
   * Tek amaç: *"Videolardaki altyazı kelimelerinin (seçilen dil çiftinde) çevirisini göstermek ve kullanıcının kelime listesine kaydetmek. Eklenti yalnızca kullanıcı açtığında çalışır."*
   * `storage` gerekçesi: *"Kullanıcının eklenti anahtarını tarayıcıda saklamak için."*
   * Host izni (`cinevocab.up.railway.app`) gerekçesi: *"Çeviri ve kelime listesi sunucusuyla iletişim."*
   * İçerik betiği siteleri (Prime Video, YouTube, Udemy) gerekçesi: *"Sadece ekrandaki altyazı metnini okuyup kelime kartlarını göstermek için."*
   * Uzak kod kullanımı: **Hayır.**
   * Toplanan veri: *Kimlik doğrulama bilgisi* (eklenti anahtarı) ve *Web sitesi içeriği* (altyazı metni, çeviri için). Verinin satılmadığı, amaç dışı kullanılmadığı onay kutularını işaretle.
   * Gizlilik politikası URL'si: `https://cinevocab.up.railway.app/privacy`
5. **İnceleme için test talimatı** (hakem Prime hesabı kullanamaz, YouTube ile test ettir):
   *"Eklenti penceresinde anahtarı aç ve dil çiftini seç (ör. Fransızca → İngilizce). youtube.com'da Fransızca altyazılı bir video aç, CC'yi aç. Sol üstte kelimelerin çevirileri görünür. Hesap girişi zorunlu değildir."*
6. Gönder. İlk inceleme genelde birkaç gün sürer.

### Mağazada reddedilmemek için
* Açıklamaya şunu ekle: *"CineVocab, Amazon, Prime Video, Google, YouTube ve Udemy ile bağlantılı değildir."* (Gizlilik sayfasında da var.)
* Prime/YouTube/Udemy logolarını görsellerde kullanma; ekran görüntülerinde yalnızca altyazı + kelime kartlarını göster.
* `cinevocab.up.railway.app` adresi manifest içinde sabit. Yayından önce kendi alan adını al (ör. cinevocab.app) ve Railway'e bağla; sonradan adres değişirse yeni sürüm yayınlayıp yeniden incelemeden geçmen gerekir.

## 4) Admin panelinde neler var
* **Özet:** toplam/yeni/çevrimiçi kullanıcı, kelime ve oyun sayıları, 14 günlük kayıt grafiği, en çok kelime toplanan içerikler.
* **Kullanıcılar:** arama, durum, son görülme; kullanıcıya tıklayınca detay.
  * Hesabı banla (1 saat / 1 gün / 7 gün / 30 gün / süresiz + sebep). Banlanınca oturumları ve eklenti anahtarı düşer, oyundan atılır, girişte sebebi görür.
  * Oyun yasağı (hesap açık kalır, düelloya giremez).
  * Puanları sıfırla, kelime listesini temizle, tüm oturumları kapat, parola sıfırla, hesabı kalıcı sil.
  * Kullanıcının son kelimeleri, izlediği içerikler, son oyunları.
* **Odalar:** açık düello odaları, oyuncular; odayı kapat.
* **Kelimeler:** yanlış çevirileri düzelt/sil.
* **Sistem:** çeviri servislerinin engel durumu, "Engelleri sıfırla".
* **Günlük:** her admin işlemi (ve başarısız giriş denemeleri) IP'siyle kayıt altında.
