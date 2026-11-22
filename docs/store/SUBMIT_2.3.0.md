# CineVocab 2.3.0: Chrome Web Store'a yükleme rehberi

Her şey `dev/out/release-2.3.0/` klasöründe hazır (git'e girmez, yeniden üretmek için aşağıdaki komutlar):

| Dosya | Mağazadaki yeri |
|---|---|
| `cinevocab-2.3.0.zip` | Package → Upload new package |
| `screenshots/01..05-*.png` (1280x800) | Store listing → Screenshots (sırayla) |
| `promo-small-440x280.png` | Small promo tile |
| `promo-marquee-1400x560.png` | Marquee promo tile |
| `store-icon-128.png` | Store icon (zaten paketteki icon128 ile aynı) |
| `cinevocab-promo-video-16x9.mp4` | Önce YouTube'a yükle, linkini "Global promo video"ya yapıştır |
| `cinevocab-shorts-9x16.mp4` | Shorts, Reels, TikTok için (mağazaya girmez) |

Yeniden üretmek: `cd dev && node harness/store-art.mjs 2.3.0` (görseller), `node harness/ad3.mjs wide video` ve `node harness/ad3.mjs tall video short` (videolar), paket: `cd extension && zip -q -r -X ../dev/out/release-2.3.0/cinevocab-2.3.0.zip . -x "*.DS_Store"`.

## Adım adım (Developer Dashboard)
1. Dashboard → CineVocab → **Package** → *Upload new package* → `cinevocab-2.3.0.zip`. Sürüm 2.3.0 görünmeli. İzin listesi mağazadaki 2.0.3 ile aynı (yeni izin uyarısı yok).
2. **Store listing**
   - *English (default)*: Description, kısa özet ve diğer alanlar `LISTING_EN.md`'den; *Turkish*: `LISTING_TR.md`'den.
   - Graphic assets: yukarıdaki tablo. Screenshot'ları 01 → 05 sırasıyla ekle.
   - Global promo video: YouTube linki (aşağıdaki başlık/açıklama ile yükle, "Unlisted" ya da "Public" olabilir; mağaza her ikisini de gösterir).
3. **Privacy practices**: single purpose, izin gerekçeleri, "Remote code: No", data usage ve politika adresi `LISTING_EN.md`'nin "Privacy tab" bölümünden aynen. Storage gerekçesini bütünüyle yeni metinle yapıştır: 2.0.3'e göre yeni olan şeyler cihazdaki kelime ve altyazı satırı, tekrar ilerlemesi ve çeviri önbelleğidir. Data usage'ta "Personally identifiable information (kullanıcı adı)" kutusunu Dashboard'daki tanıma bakarak işaretle.
4. **Test instructions** alanını `LISTING_EN.md`'deki "Notes for the reviewer" paragrafıyla doldur (cümle alıştırmasını nasıl göreceği de yazılı).
5. *Distribution*: Public. *Publishing options*: **Defer publishing** önerilir; onaydan sonra istediğin an "Publish" dersin (site önbellek düzeltmesiyle zamanlamak için).
6. **Submit for review**.

## Göndermeden ÖNCE (bağımsız denetimin bulgusu)
Paket temiz ve olduğu gibi yüklenebilir. Ama **gizlilik sayfası (`/privacy`) eklentinin ve mağaza metninin söylediğiyle uyuşmuyor**; mağaza politikası bu durumda eklentiyi kaldırabilir. `accounts.py`'daki metne şunlar eklenmeli (sunucu dosyası, push ile yeniden dağıtılır):
1. Cihaz türü ve işletim sistemi, günlük ziyaretçi kaydıyla saklanır; hesaba bağlanmaz.
2. Yerel depolama paragrafı: eklenti cihazda anahtarını ve ayarlarını, tuttuğun kelimeleri (geçtiği altyazı satırı ve çevirisiyle), tekrar ilerlemeni ve çeviri önbelleğini saklar. Hesap açınca kelimeler (satırlar olmadan) hesabına kopyalanır.
3. Limited Use cümlesi: "The use of information received from Google APIs will adhere to the Chrome Web Store User Data Policy, including the Limited Use requirements."
4. "Son güncelleme" tarihi.

## Dikkat edilecekler
- Ad ve kısa özette üçüncü taraf marka adı geçmemeli (2.0.x bu yüzden bir kez reddedilmişti). Mevcut metinler temiz.
- Mağaza metni davranışla birebir: kurulumdan sonra KAPALI, açınca altyazı satırı sunucuya gider, tutulan kelime ve cümle cihazda kalır, hesaba giderken cümle gitmez.
- İnceleme genelde birkaç gün sürer. Reddedilirse sebep e-postayla gelir; paketi değiştirmeden metni düzeltmek çoğu zaman yeterli olur.

## Tanıtım videosu için YouTube bilgileri
**Başlık:** Learn a language from what you watch | CineVocab (free Chrome extension)

**Açıklama:**
```
CineVocab is a free Chrome extension that translates every subtitle word live while you watch, lets you keep the words you like, and brings them back as fill-in-the-blank questions in the line you heard them in. Spaced review, streaks, live duels and leaderboards (free account).

Works on YouTube, Prime Video, Netflix and Udemy. Free. No account to start.

0:00 Every subtitle word, translated live
0:12 Click a word to keep it
0:17 The box is yours
0:22 Practise what you kept
0:37 Keep the streak
0:41 Duel friends, climb the leaderboard
0:53 16 languages, free to start

https://cinevocab.up.railway.app
```
**Etiketler:** learn spanish, language learning, chrome extension, subtitles, vocabulary, flashcards, spaced repetition, learn english

Not: videodaki müzik kodla üretilmiş özgün bir parçadır (telif sorunu yoktur). Kendi şarkını eklemek için: `node harness/ad3.mjs wide audio audio=/yol/sarki.mp3`.
