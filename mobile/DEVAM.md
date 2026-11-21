# CineVocab mobil: kaldığımız yer (14 Kasım 2026, gece)

Yeni bir sohbette bu dosyayı yapıştır ya da "~/cinevocab-mobile/DEVAM.md dosyasını oku, kaldığımız yerden devam edelim" de.

## Çalışma kuralları
- Türkçe ve sade anlat, bana "kanka" de. Komutları kendi Terminal'imde ben çalıştırırım.
- Chrome eklentisine (`cinevocab-app/extension/`) ve sitenin koduna bana sormadan dokunma.
- Bana sormadan commit ya da push yapma. Parola, ödeme, API anahtarı girme.
- Arayüz basit kalsın.

## Proje
- Mobil: `~/cinevocab-mobile` (Capacitor 8.6.2, appId `com.cinevocab.app`), GitHub: `yakupceri/cinevocab-mobile`.
- Sunucu: https://cinevocab.up.railway.app (FastAPI, repo `yakupceri/cinevocab-app`, şu an herkese açık).
- Mac M5, Node 26, Android Studio Rabbit 2, emülatör "Medium Phone API 37.0". Gradle JDK 21 olmalı.
- Akış: `www/` içini değiştir → `npx cap sync` → Android Studio'da Run.

## Yazılanlar (hepsi `www/` içinde, sürüm 2: 14 Kasım gecesi baştan tasarlandı)
- Dosyalar: `index.html`, `app.css`, `app.js` (bütün mantık), `yt.js` (altyazı okuma), `config.js` (sunucu adresi, gizli bilgi yok), `lang.js` ve `logo.png` (eklentiden kopya).
- Alt menü: Ana sayfa, Kelimeler, + (videodan ekle), Oyna, Ben.
- Ana sayfa: hikaye halkaları (Günlük, Tekrar, Düello, Lig, Paketler), günlük XP hedefi halkası, günün 3 görevi, tek ana düğme, seviye çubuğu, video akışı (kapak görselli).
- Ekle: YouTube linkinden kelime çıkarma (`/api/import/plan` + `/translate-words`) ve hazır paketler (`/api/packs`, `/api/pack-add`).
- Oyna: günlük meydan okuma (`/api/daily*`), pratik (`/api/srs/*`), canlı düello (`wss://.../ws`), ligler (`/api/leagues*`). Hepsi uygulamanın içinde, tarayıcı açılmıyor.
- Ben: profil (kelime, seri, düello galibiyeti), günlük hedef seçimi, uygulama dili (İngilizce / Türkçe), çıkış.
- Giriş: parola, e-posta kodlu kayıt, Google (`@capgo/capacitor-social-login` 8.7.11, `MainActivity.java` düzenlendi).
- Kutlamalar: konfeti (hedef, seviye atlama, iyi sonuç, düello galibiyeti), titreşim, sayı sayma. Telefonun geri tuşu bir önceki ekrana döner.
- Sunucuda yapılan tek değişiklik: düello WebSocket'i oturum anahtarını mesajdan da kabul ediyor (`cinevocab-app` commit `fc89a12`, yayında). Site ve eklenti etkilenmez.

## Güvenlik (yapılanlar ve test sonuçları)
- Kodda API anahtarı, parola ya da gizli değer yok (iki repo ve git geçmişi tarandı).
- Sunucudan ya da YouTube'dan gelen hiçbir metin HTML olarak yazılmıyor (`innerHTML`, `eval` yok). Saldırı metinleriyle test edildi: hiçbiri çalışmadı.
- İçerik güvenlik politikası (CSP): uygulama yalnızca kendi dosyalarını çalıştırır, yalnızca CineVocab sunucusuna ve YouTube'a bağlanır.
- Android: yedekleme kapalı (`allowBackup=false`), şifresiz bağlantı kapalı, ekran dikey.
- Oturum anahtarı adres satırına hiç yazılmıyor; düelloda mesajın içinde, şifreli bağlantıyla gidiyor.
- Yapılmayan: sunucuya sızma testi, yayın sürümünde kod küçültme, anahtarın Android Keystore'da saklanması (şu an uygulamanın kendi deposunda).
- Test betiği bu sohbetin geçici klasöründeydi; yeniden yazılması gerekirse: sahte sunucu + Playwright ile bütün akışlar ve XSS denemesi.

## HENÜZ GERÇEK TELEFONDA DENENMEDİ (ilk iş bunlar)
Bilgisayarda sahte sunucuyla hepsi çalıştı, ama emülatörde şunların sonucu bilinmiyor:
1. **YouTube'dan altyazı çekme.** En kritik kısım. "Altyazı yok" ya da "YouTube'a ulaşılamadı" çıkarsa `yt.js` düzeltilmeli (YouTube telefona farklı sayfa veriyor ya da altyazı adresi boş dönüyor olabilir).
2. **Google ile giriş.** Hata çıkarsa parantez içindeki metne bak. Sık sebepler: Cloud Console'da Android istemcisi yok ya da başka projede, SHA-1 yanlış, emülatörde Google hesabı yok.
   - Test imzası SHA-1: `1B:4E:E5:97:C2:6E:82:FB:38:73:5F:ED:59:33:6F:34:04:34:56:D5`
3. **Düello ve ligler.** Oda kur, başka bir cihazdan (site ya da ikinci telefon) koda katıl, oyunu bitir. Lig kur, sıralamayı aç.
4. **Ana sayfa.** Hikayeler, hedef halkası, görevler, video akışı doğru görünüyor mu? Günlük meydan okuma ve hazır paketler çalışıyor mu?
4. Parolayla giriş, kelime listesi, pratik.

## Mac'te duran ama GitHub'a gitmemiş değişiklikler
Google girişi, düello, `.gitignore` (imza anahtarları), `DEVAM.md`. Testler geçince:
```
cd ~/cinevocab-mobile && git add . && git commit -m "Google girisi, duello, notlar" && git push
```

## Play Store'a kadar kalanlar (sırayla)
1. Yukarıdaki testleri geçir, hataları düzelt.
2. Uygulama simgesi ve açılış ekranı (şu an Capacitor'un varsayılanı).
3. Geri tuşu, klavye açılınca ekranın kayması, bağlantı yokken davranış gibi telefon ayrıntıları.
4. Play Console hesabı (25 dolar, kimlik doğrulaması; ödemeyi ben yaparım).
5. Yayın imza anahtarı (`.jks`) oluştur, güvenli yerde yedekle, asla GitHub'a koyma.
6. Google Cloud'da yayın imzasının SHA-1'i için ikinci bir Android istemcisi (Play uygulama imzasının SHA-1'i de gerekir).
7. Gizlilik politikası sayfası ve mağaza metinleri, ekran görüntüleri.
8. `.aab` derle, kapalı test: yeni kişisel hesaplarda 12 test kullanıcısı ve 14 gün isteniyordu (kural değişmiş olabilir, Play Console'da kontrol et).

## Açık kararlar ve küçük işler
- Ana repoda eklentiye yanlışlıkla eklenen YouTube içe aktarma kodu (commit `d912628`, `extension/` altında) duruyor. Mağazadaki eklenti etkilenmiyor. Geri alınsın mı? Not: mobil uygulama o commit'teki `importer.py` (`/api/import/plan`) ucunu kullanıyor, o kalmalı.
- Sitedeki `quickRoom`, `roomOpts`, `setAll` ham yazı hatası için `static/sw.js` düzeltildi ve yayına gitti (commit `745cd79`). Düello sayfasını Cmd+Shift+R ile yenileyip düzeldi mi bak.
- Ana repo (`cinevocab-app`) herkese açık. İçinde gizli anahtar yok. Kopyalanmasın isteniyorsa Private yapılabilir.
- Mağazaya `cinevocab_extension_v2.0.0.zip`, yeni açıklamalar ve tanıtım videosu hâlâ yüklenmedi.

## Tanıtım (Reddit ve diğerleri)
- Reddit hesabı 11 günlük ve karması düşük. r/SideProject postu Reddit filtresine takıldı. Birkaç gün yeni ürün postu atma, günde 3-5 faydalı yorumla karma biriktir.
- r/SideProject moderatörlerine onay mesajı atıldı mı, cevap geldi mi bak. r/IMadeThis postu gizli sekmede görünüyor mu bak.
- r/languagelearning: sadece "Share Your Resources" sabit başlığına yorum, link `https://cinevocab.up.railway.app/get?src=rll` (başlık her ayın 4'ünde yenileniyor).
- Link etiketleri: `imt`, `sp2`, `rll`, `yt-en`, `yt-tr`, `tt`, `li`. Tıklamalar admin panelindeki "Link tıklamaları" kutusunda.
- TikTok, Shorts, Reels: demo videodan 15-25 saniyelik dikey klipler, ilk 2 saniyede kanca.

## 14 Kasım öğleden sonra: sürüm 3 (Play şartları + bulmaca + paylaşma)
- Uygulamaya eklendi: günün bulmacası (karışık harfleri diz, herkese aynı 5 kelime), kendi kelimeleriyle sınırsız bulmaca, sonucu paylaşma (bulmaca, günlük), düello ve lig daveti paylaşma, davet bağlantısı (`/?ref=kullanıcı`), akşam hatırlatma bildirimi, hesabı silme, gizlilik politikası ve "bildir" bağlantıları.
- Yeni eklentiler gerekli: `cd ~/cinevocab-mobile && npm install @capacitor/share @capacitor/local-notifications && npx cap sync`
- Sunucuda (cinevocab-app, HENÜZ PUSH EDİLMEDİ): `puzzle.py` (`/api/puzzle`, `/api/puzzle/done`), `/delete-account` sayfası, gizlilik metnine Android bölümü, `/api/ext/config` içine `contact`, hesap silmede `puzzle_play`, `ext_tickets`, `referrals` temizliği. Sunucu yayına girmeden bulmaca yalnızca "kendi kelimelerinle" modunda açılır.
- Play Console'a girilecek adresler: gizlilik `https://cinevocab.up.railway.app/privacy`, hesap silme `https://cinevocab.up.railway.app/delete-account`. Railway'de `CONTACT_EMAIL` ayarlı olmalı.
- Play Store'a çıkınca `www/config.js` içindeki `share` adresini mağaza adresiyle değiştir.
- Telefonda denenmedi: paylaşma penceresi, bildirim izni ve zamanı, `mailto:` bağlantısı.

## 15 Kasım akşamı: sürüm 4 (yeni görünüm + yeni mekanikler + Play Store paketi)
- Tasarım baştan kuruldu: altyazı sarısı zemin, siyah çizgi, beyaz bilet kartları, sert gölge, özel ikon seti (emoji yok), başlıklarda Adventor yazı tipi (`www/fonts/`, serbest lisans). Çevrilecek kelime "film karesindeki altyazı" olarak görünür.
- Ana sayfa: haftalık delgi kartı (oynanan her gün delinir), sıradaki iş bilet olarak, "Sırada ne var" listesi (biten işe TAMAM damgası), XP ve seviye çubuğu, videolar.
- Yeni oyun: Kartlar (çevir, bildiysen sağa, bilemediysen sola kaydır). Testte ve kartlarda kombo sayacı (2x, 3x...). Sesler (Ayarlar'dan kapatılır).
- Roller (Seyirci, Figüran, Dublör, Yardımcı oyuncu, Başrol, Yıldız, Yönetmen, Efsane) ve ödül rafı (12 ödül).
- İlk girişte "Hangi dili öğreniyorsun?" ekranı.
- Play Store paketi: `store/` klasörü (simge, kapak görseli, TR/EN ekran görüntüleri, mağaza metinleri, veri güvenliği cevapları: `store/PLAY-STORE.md`).
- Android simgesi ve açılış ekranı HENÜZ DEĞİŞTİRİLMEDİ. Hazır dosyalar `store/android-ana/` içinde, `android/app/src/main/res` altına konacak.
- Bilgisayarda sahte sunucuyla test edildi (akışlar, saldırı metinleri, güvenlik politikası). Telefonda denenmedi: kaydırma hissi, sesler, yazı tipi, yeni simge.

## v5 (16 Kasım 2026): YouTube linki kaldırıldı, "kendi metnini getir" geldi
- Neden: uygulamanın YouTube altyazısını resmi olmayan yoldan çekmesi YouTube kurallarına aykırıydı (Play Store'dan indirilme riski). Yakup kaldırılmasını seçti.
- `www/yt.js` silindi. Yerine `www/text.js`: yapıştırılan metinden ya da seçilen .srt/.vtt/.txt dosyasından kelime ayıklar. Metin telefondan çıkmaz, sunucuya yalnızca kelime listesi gider (`/api/import/plan`, aynı uç nokta).
- Güvenlik politikasından (CSP) youtube.com çıkarıldı. `script-src 'unsafe-inline'` DURMALI: Capacitor Android köprü kodunu sayfaya satır içi betik olarak koyar.
- Mağaza metinleri (`store/PLAY-STORE.md`) ve gizlilik metni (`cinevocab-app/accounts.py`, commit edilmedi) buna göre güncellendi. Mağaza ekran görüntülerinde eski "YouTube linki" ekranı varsa yeniden çekilmeli.
- Sırada (konuşuldu, yapılmadı): hesapsız deneme, Android "Paylaş" menüsünden metin alma, Sahneler (açık lisanslı kısa filmler), kalıp kaydetme, sesli okuma, baskısız seri, şikâyet et düğmesi, Firefox Android eklentisi.

## v6 (16 Kasım 2026): hesapsız deneme + kalıcı kelime sayacı
- Giriş ekranında "Hesap açmadan dene". Misafir modunda (`S.guest`, `cv-guest`) istekler sunucuya gitmez; `www/demo.js` içindeki elle yazılmış destelerle (İngilizce ve İspanyolca, 16'şar kelime; çeviriler tr/en/es/de/fr/pt) kartlar, soru-cevap ve kendi kelimelerinle bulmaca çalışır. İlerleme telefonda `cv-demo` içinde durur.
- Deneme destesi olmayan dil çifti seçilirse en yakın çifte geçer ve bunu söyler.
- Kelime ekleme, Ben, düello ve ligler misafire kayıt ekranını açar. Giriş yapılınca deneme verisi silinir, gerçek hesaba geçilir.
- Ana sayfada "X kelime kalıcı" satırı: sunucunun `mastered` değeri (aralıklı tekrarda 5. kutuya çıkan kelimeler).
- Test: `scratchpad/mobile/test_guest.js` (misafirken sunucuya istek gitmediğini de doğrular). Telefonda denenmedi.

## v7 (20 Kasım 2026, gece): kelime akışı ve açılış seçimi
- Yeni ilk açılış ekranı `v-how`: Hemen başla (kelime akışı) / Altyazıyı fotoğrafla (şimdilik kapalı, "yakında") / Metin yapıştır / Arkadaşlarınla düello (16 dil vurgusu). Dil seçiminden sonra bir kez çıkar (`cv-how` kaydı).
- Yeni `v-flow` (Oyna sekmesinde ilk fayans da): tek kelime, yukarı kaydır = bildim (+10 XP), aşağı = tekrar. Anlam 0,65 sn sonra kendiliğinden açılır. Telefonun kendi sesiyle seslendirme (SpeechSynthesis), sağ üstten açılıp kapanır. Üst üste sayacı, 5/10/25/50/100. kelimede konfeti. Her 10 cevapta ve çıkışta `/api/srs/report` ile XP sunucuya gider. Hesapsız denemede telefondaki deste kullanılır. Yeni hesapta kelime yoksa ilk paket kendiliğinden eklenir.
- Kartlara (flashcards) hoparlör düğmesi eklendi.
- Dokunulmayanlar: site, eklenti, sunucu. Yedek: önceki sürüm `www` kopyası bu oturumun geçici klasöründeydi.
- Sıradaki (v8): kamerayla altyazı okuma (ML Kit metin tanıma eklentisi, kurulumu Terminal'de), ana ekran "günün kelimesi" widget'ı (yerel Android kodu), Paylaş → CineVocab (Android share target).
- Test: Playwright ile sahte sunucuda geçti (TR ve EN), hata ve CSP ihlali yok. Gerçek telefonda denenmedi: seslendirme için telefonda Google metin okuma motoru kurulu olmalı.
- "+" sekmesi (v-add) artık seçim ekranı: Hemen başla / Altyazıyı fotoğrafla (yakında) / Metin ya da altyazı yapıştır / Düello; paket listesi altında. Yapıştırma formu "Metin yapıştır" arkasında, "Geri" ile döner.

## v8 (sade bonus kartı, "Altyazıyı tamamla", hafif kombo)
- Günlük hedef bitince konfeti yerine alttan kayan sade kart (`bonusCard`), 4 sn ya da dokununca kapanır.
- Oyna sekmesi: "Altyazıyı tamamla" (`startCloze`). Cümle `sentence` alanından gelir; deneme destesinde elle yazılmış cümleler var (demo.js SENT).
  Gerçek hesap için sunucunun `/api/vocab` cevabına `sentence` alanı eklenmeli (yapılmadı, onay bekliyor).
- Kombo: kartın etrafında ince çizgi (seri uzadıkça kalınlaşır), konfeti yalnızca 25/50/100.
