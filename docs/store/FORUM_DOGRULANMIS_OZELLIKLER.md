# Forum ve soru-cevap yanıtlarında söylenebilecek özellikler

`firsat-avcisi` ajanı bu dosyayı okur. Amaç: mağazada **şu an yayında olan sürümün (2.3.0, inceleme onaylandı)** gerçek davranışını söylemek. Kanıtlar güncel `extension/` kodundandır (`manifest.json` sürümü 2.3.0). `docs/store/LISTING_*.md` dosyalarına dayanma; iddia bu dosyada yoksa kodda doğrula, doğrulayamazsan yazma.

Satır numaraları 2026-11-23 tarihli kod içindir. Kod değişirse numaralar kayar: şüphede dosyayı aç ve ifadeyi ara.

## Söylenebilir (2.3.0 kodundan doğrulandı)

### Çeviri
1. **Altyazı kelimeleri canlı çevrilir.** Siteler: YouTube, Prime Video, Netflix, Udemy. Kanıt: `manifest.json` içerik betikleri, `content_scripts[0].matches`.
2. **16 dil.** `popup.js:3` `LANGS` listesi (tr, en, fr, it, de, es, pt, ru, ar, ro, ja, hi, id, pl, nl, ko); arayüz metinleri `_locales/` altında 16 dil.
3. **Kurulumdan sonra kapalı başlar, kullanıcı açar.** Kurulumda hiçbir şey açılmaz: `background.js:85-100`. Açan eylemler yalnızca iki kullanıcı tıkıdır: karşılama sayfasındaki ana düğme (`welcome.js:45`) ve videonun üstündeki başlatma düğmesi (`content.js:875`). Kurulumda karşılama sayfası açılır (`background.js:100`).
4. **Kapalıyken sunucuya hiçbir istek gitmez.** `background.js:9`.
5. **Hesap gerekmeden çalışır.** Çeviri isteğine `Authorization` yalnızca giriş yapılmışsa eklenir: `background.js:12-18`.
6. **Açıkken sunucuya ne gider (gizlilik sorusu gelirse açıkça söyle):** çevrilecek kelimeler, o anki altyazı cümlesi, video başlığı ve (başlık başına bir kez) küçük resim: `content.js:642`, `content.js:576-577`. Sunucu çeviri servislerini kullanır.
7. **Çeviriler cihazda önbelleğe alınır** (tekrar eden kelimeler sunucuyu beklemez, en çok 3000 kelime): `content.js:551-565`.

### Kelime defteri ve alıştırma (hesap gerekmez)
8. **Kelime tutmak hesap gerektirmez ve sunucuya bir şey göndermez.** Kelimeler cihazdaki `chrome.storage.local` içinde "bank" anahtarında durur: `bank.js:2`, `content.js:246`, `content.js:257-258`.
9. **Kelimenin geçtiği cümle cihazda saklanır** (yalnızca cümle kelimeyi içeriyorsa): `content.js:257-258`, `content.js:572`. Cümle hesaba gönderilmez (madde 13).
10. **Hesapsız alıştırma, tamamen cihazda:** `popup.js:557-559` (`!st.key || useLocal` ise yerel alıştırma açılır). Soru türleri: boşluk doldurma, seçmeli (`clozePick`) ve yazarak (`clozeType`): `popup.js:399`; bonus olarak cümle kurma (kelimeleri sıraya dizme): `popup.js:406`, `popup.js:450`.
11. **Aralıklı tekrar.** Kutular arası bekleme 0, 1, 3, 7, 14, 30, 60 gün: `srs.js:7`. Yanlış cevap kelimeyi başa (kutu 0) döndürür, doğru cevap bir kutu ilerletir: `srs.js:21-24`. Kutu 3'e ulaşan kelime "öğrenildi" sayılır: `srs.js:10`, `srs.js:17`.
12. **Seri.** Hesapsızken cihazdaki tekrar serisi (`popup.js:241`, `popup.js:357`); hesapla sunucudaki seri, seviye ve XP (`popup.js:238-240`, `popup.js:643-647`, `popup.js:595-608`).
13. **Giriş yapınca cihazdaki liste hesaba KOPYALANIR, silinmez.** Yalnızca kelime ve bölüm adı gider, cümle gitmez (`sentence: ""`): `background.js:257-293`, gövde `background.js:282`. Yıldızlama için de yalnızca kelime gider: `background.js:301-306`.

### Ücretsiz hesapla
14. **Canlı düello ve sıralama** (haftalık, aylık, yıllık, tüm zamanlar; kişi ya da ülke): `templates/account.html:988-1001`, `accounts.py:674` (`/api/leaderboard`); eklentide kart: `popup.js:4`, `popup.js:569`.
15. **Günlük meydan okuma:** `daily.py:152-207` (`need_user`, yani giriş ister), sayfa `main.py:1523` (`/daily`); eklentide kart: `popup.js:4`, `popup.js:569`.
16. **Videodan kelime ekleme** (YouTube): giriş ister: `popup.js:211`.
17. **Konuşma düellosu** ("Say the word out loud (Chrome / Edge) or type it."): kelimeyi sesli söyleyerek ya da yazarak cevaplanır. Tarayıcının konuşma tanıması kullanılır; Chrome sesi Google'ın konuşma tanıma hizmetine gönderebilir, sunucumuz yalnızca tanınan metni alır, mikrofon yalnızca düğmeye basınca açılır: `static/i18n.js:430`, `templates/game.html:317`, `main.py:1359`, gizlilik `accounts.py:789`.
18. **Kelimeleri sesli okutma:** cihazın kendi sesleriyle, sunucuya bir şey gitmez: `accounts.py:789`, `templates/game.html:221`. (Ayrı bir "dinleme" modu ya da dinleme alıştırması YOK; yalnızca sesli okuma ve konuşma düellosu var.)
19. **"Büyük ekran (sınıf / grup)" oda modu:** kurucu (örneğin öğretmen) oyuncu değil, ekranı gösterir; sorular kurucunun kendi kelimelerinden gelir; diğerleri oda koduyla katılıp cevaplar, büyük ekranda "x/y yanıtladı" görünür. Soru sayısı 4-30, soru süresi 5-60 sn ayarlanır: `static/i18n.js:698`, `main.py:1194`, `main.py:1230`, `main.py:1353-1354`, `templates/game.html:392`.
20. **Ücretsiz.** Kodda ödeme, abonelik ya da premium izi yok (aranıp bulunamadı); ürün sahibi de ücretsiz olduğunu belirtti.

## Yazma (doğrulanmadı ya da kodda yok)
- **Sayılar:** çeviri hızı (ms), doğruluk yüzdesi, kullanıcı sayısı, "X kelime öğrendik". Kodda bu sayıların kanıtı yok.
- **"Her sitede çalışır."** Kodda isteğe bağlı site izni ve içerik betiği kaydı var (`manifest.json` `optional_host_permissions`, `background.js:125-146`) ama kullanıcıya nasıl sunulduğunu doğrulamadım. Yalnızca madde 1'deki dört siteyi say.
- **Öğretmen aracı gibi anlatma.** Öğretmen paneli, sınıf listesi, ödev, not verme, ilerleme raporu YOK. "Sınıf" yalnızca madde 19'daki büyük ekran oda modu ve davet kodlu özel ligler (madde 14 ile aynı lig sistemi: `leagues.py`). Öğretmenler için yönetim özelliği varmış gibi yazma.
- **"Dinleme (listening) modu" yazma.** Yok (madde 18).
- **Mobil uygulama.** Ayrı bir depoda; buradan doğrulanamaz. Özelliklerini ya da çıkış tarihini söyleme.
- **Başka ürünler:** kötüleme ve karşılaştırma yok, adlarını da anma (marka kuralı).
- **Zaman sözleri:** "hemen öğrenirsin", "30 günde akıcı" gibi sonuç vaatleri. Ödül yalnızca gerçek öğrenmeye bağlı anlatılır.

## Bu dosya ne zaman güncellenir
Yeni bir sürüm yayına çıkınca: değişen maddeleri `extension/` kodundan yeniden doğrula, satır numaralarını ve başlıktaki sürümü güncelle.
