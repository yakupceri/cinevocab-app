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

**Türkçe sürüm** (`dev/out/release-2.3.0/tr/`): `screenshots/01..05-*.png` (Türkçe mağaza listesine, İngilizce altyazı → Türkçe çeviri örneğiyle), `promo-small-440x280.png`, `promo-marquee-1400x560.png`, `cinevocab-tanitim-videosu-16x9-tr.mp4` (YouTube'a), `cinevocab-shorts-9x16-tr.mp4`, `youtube-kapak-1280x720.png`. Dashboard'da *Turkish* dilini seçip bu görselleri yükle; İngilizce görselleri *English* altında bırak. YouTube kapakları: İngilizce `youtube-thumbnail-1280x720.png`.

Yeniden üretmek: `cd dev && node harness/store-art.mjs 2.3.0` (görseller; `tr` eklenirse Türkçe), `node harness/ad3.mjs wide video` ve `node harness/ad3.mjs tall video short` (videolar; `l=tr` eklenirse Türkçe, önce `node harness/ad2-assets.mjs tr`), paket: `cd extension && zip -q -r -X ../dev/out/release-2.3.0/cinevocab-2.3.0.zip . -x "*.DS_Store"`.

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

## İngilizce YouTube videosu
**Başlık:** Translate every YouTube subtitle word instantly | CineVocab (free Chrome extension)
(alternatif, marka adsız: Learn a language from what you watch | CineVocab (free Chrome extension))

**Açıklama:**
```
CineVocab is a free Chrome extension that translates every subtitle word live on YouTube (any video with captions), Prime Video, Netflix and Udemy. Click a word to keep it, then practise it as fill-in-the-blank questions in the line you heard it in, with spaced reviews, streaks, live duels and leaderboards (free account).

Free. No account to start.

0:00 Every subtitle word, translated live
0:12 Keep a word, make the box yours
0:22 Practise what you kept
0:37 Streaks, duels and leaderboards
0:53 16 languages, free to start

Install (free): https://cinevocab.up.railway.app/install?src=yt-en&hl=en
Website: https://cinevocab.up.railway.app

#learnspanish #chromeextension #languagelearning #learnenglish #subtitles #vocabulary #youtubesubtitles #spanishlearning #englishlearning #spacedrepetition #flashcards #languagelearningtips #learnwithnetflix #learnwithyoutube #freeextension
```
**Etiketler:** learn spanish, language learning, chrome extension, subtitles, vocabulary, spaced repetition, learn english, flashcards, youtube subtitles, youtube translator

Ayarlar: Education · Not made for kids · English · "Altered or synthetic content": No · Kapak: `youtube-thumbnail-1280x720.png`.

## Türkçe YouTube videosu
**Başlık:** Dizi ve YouTube izleyerek İngilizce öğren | CineVocab (ücretsiz Chrome eklentisi)
(kapak yazısı: "Dizi izleyerek İngilizce öğren"; 2 hafta sonra YouTube Studio → Traffic sources → YouTube search'e bakıp hangi kelime daha çok geliyorsa ona göre keskinleştir)

**Açıklama:**
```
CineVocab, YouTube'da (altyazısı olan her videoda), Prime Video'da, Netflix'te ve Udemy'de her altyazı kelimesini canlı olarak Türkçeye çeviren ücretsiz bir Chrome eklentisidir. Bir kelimeye tıkla, tutulsun; sonra duyduğun cümlenin içinde boşluk doldurma soruları olarak çalış. Aralıklı tekrar, seri, canlı düello ve sıralama da var (ücretsiz hesapla).

Ücretsiz. Başlamak için hesap gerekmez.

0:00 Her altyazı kelimesi canlı çevrilir
0:12 Kelimeyi tut, kutuyu özelleştir
0:22 Tuttuğun kelimeleri çalış
0:37 Seri, düello ve sıralama
0:53 16 dil, başlamak ücretsiz

Kur (ücretsiz): https://cinevocab.up.railway.app/install?src=yt-tr&hl=tr
Web sitesi: https://cinevocab.up.railway.app

#ingilizceöğren #chromeeklentisi #dilöğrenme #altyazı #kelimeöğrenme #diziizle #youtubealtyazı #ingilizcekelime #kelimeezberi #dizilerleingilizce #aralıklıtekrar #ingilizce #eklenti #ücretsiz #netflixingilizce
```
**Etiketler:** ingilizce öğren, dil öğrenme, chrome eklentisi, altyazı, kelime öğrenme, dizi izleyerek ingilizce, youtube altyazı çeviri, aralıklı tekrar

Ayarlar: Eğitim · Çocuklara özel değil · Türkçe · "Değiştirilmiş veya sentetik içerik": Hayır · Kapak: `tr/youtube-kapak-1280x720.png`.

## Sayaçlı kurulum bağlantıları
Sunucudaki `/install` (ve `/get`) adresi Chrome Web Store'a yönlendirir ve tıklamayı `?src=` etiketine göre sayar (gün + etiket + cihaz türü + ülke; IP ve çerez saklanmaz, botlar sayılmaz). Admin panelinde kaynak tablosunda etiket adıyla satır olarak görünür.

| Nerede | Bağlantı |
|---|---|
| İngilizce YouTube videosu | `https://cinevocab.up.railway.app/install?src=yt-en&hl=en` |
| Türkçe YouTube videosu | `https://cinevocab.up.railway.app/install?src=yt-tr&hl=tr` |
| Başka yer için | `...install?src=<etiket>` (en çok 24 karakter; harf, rakam, `-` ve `_`). Örn. `short-tr`, `reddit`, `insta` |

Sayaç **tıklamayı** sayar, kurulumu değil. Gerçek kurulum sayısı Chrome Web Store Dashboard'da görünür.
