# Dağıtım metinleri (Show HN, Product Hunt, Shorts, mağaza önerileri)

Her cümle `docs/store/FORUM_DOGRULANMIS_OZELLIKLER.md` ve koddan doğrulanmış özelliklere dayanır. Yayında olan sürüm: 2.3.1 (mağaza sayfasında görüldü, 2026-11-23). Metinleri atan sen olacaksın; ben hiçbir yere gönderi atmam, giriş yapmam.

## 1. Show HN

Kurallar (`news.ycombinator.com/showhn.html`, 2026-11-23): denenebilen, kendi yaptığın bir şey; kayıt duvarı olmadan denenebilmeli; hazır olmalı; landing page ya da kayıt sayfası olmaz; "yeni sürüm çıktı" tarzı yazılar olmaz; **arkadaşlarından oy ya da yorum isteme yasak**.

- **Gönderilecek adres:** mağaza sayfasını doğrudan ver (`https://chromewebstore.google.com/detail/cinevocab/glhogfbfbjifiihgffjpjgijkjplebkl`). Takip yönlendirmesi (`up.railway.app`) HN okuyucusuna şüpheli görünür ve "landing page" sayılma riski taşır. Takibi mağaza panelinden yaparsın.
- **Başlık (en çok 80 karakter, "Show HN" ile başlar, abartı yok):**
  1. `Show HN: A Chrome extension that turns subtitles into vocabulary practice` (önerim)
  2. `Show HN: CineVocab – translate every subtitle word live on YouTube and Netflix`
  3. `Show HN: Click a subtitle word, get quizzed on it later in the same sentence`
- **Zamanlama:** hafta içi, ABD sabahı genelde tavsiye edilir (Türkiye saatiyle öğleden sonra). Kesin bir kural değil.
- **Hemen ardından yazacağın ilk yorum:** HN "neden ve nasıl yaptığını" ister. İlk paragrafı **kendi gerçek nedeninle doldur**, ben uyduramam.

```
Hi HN, I'm the developer.

[WRITE YOUR OWN REASON HERE, 2-3 sentences: why you built it and what you wanted from it.]

CineVocab is a Chrome extension that shows a translation under every word of the subtitles while you watch (YouTube videos with captions, Prime Video, Netflix, Udemy). Click a word to keep it. It's stored on your device together with the sentence you heard it in. Later it comes back as a fill-in-the-blank question in that same sentence, on spaced intervals (1, 3, 7, 14, 30, 60 days); a word counts as learned once it reaches the third box.

You don't need an account to try it: translation, keeping words and the practice all work without one. A free account adds friend duels, leagues and a daily challenge on the website.

How it works and what to know: it's a Manifest V3 extension in plain JavaScript. The subtitle line currently on screen is sent to my server for translation. Nothing is sent while the extension is off, which is the default after install. The words and sentences you keep stay on your device; if you sign in, the words (not the sentences) are copied to your account. Translation quality depends on the translation services behind it. It's desktop Chrome only, and there's no furigana for Japanese yet.

I'd love honest feedback: do the word translations feel useful in context, and what would make you use something like this every day? Happy to answer questions about how any of it works.
```

## 2. Product Hunt
Sınırlar kayıt ekranında kontrol et (başlık, tanım uzunlukları değişebilir).
- **Ad:** CineVocab
- **Slogan (≤60):** `Translate every subtitle word as you watch. Free.`
- **Açıklama (≤260):** `CineVocab translates every subtitle word on YouTube, Netflix, Prime Video and Udemy as it appears. Keep a word and it comes back as a quiz in the line you heard it. Free Chrome extension, 16 languages, no account to start.`
- **Konular:** Chrome Extensions, Education, Language Learning
- **Galeri:** `dev/out/release-2.3.0/screenshots/01-05`, `promo-small-440x280.png`, YouTube demo linki (`https://www.youtube.com/watch?v=gchGbtjCycM`).
- **İlk yorum:** Show HN ilk yorumunun kısaltılmış hâli, geliştirici olduğunu ve gerçek nedenini yaz. Oy isteme.

## 3. Shorts, Reels, TikTok
**İngilizce** (başlık): `Every subtitle word translated the moment it appears (free Chrome extension)`
```
Pause a show to look up one word? Not anymore. Click a word to keep it and it comes back as a quiz in the line you heard it. Free, 16 languages. Desktop Chrome.
https://cinevocab.up.railway.app/get?src=yt-short-en
#languagelearning #learnspanish #subtitles #chromeextension #vocabulary
```
**Türkçe** (başlık): `Dizi izlerken kelime aramaya son: her altyazı kelimesi anında çevrilir (ücretsiz)`
```
Bir kelime için diziyi durdurmak yok. Kelimeye tıkla, kaydet, sonra duyduğun cümlede soru olarak karşına çıksın. Ücretsiz, 16 dil. Bilgisayarda Chrome'dan.
https://cinevocab.up.railway.app/get?src=yt-short-tr&hl=tr
#ingilizceöğren #dizi #netflix #youtube #kelimeöğren #chromeeklentisi
```
TikTok ve Reels için etiketler `tiktok-tr`, `ig-tr`.

## 4. Arkadaşlara mesaj (mağaza yorumu için)
> Kanka CineVocab'ı dene, bilgisayarda Chrome'dan: [mağaza linki]. İşine yararsa mağaza sayfasında dürüst bir yorum yaz, yaramadıysa da neyin kötü olduğunu yaz, ikisi de işime yarar.

Şart koşma, karşılığında bir şey verme, sahte yorum isteme.

## 5. Mağaza açıklaması için arama kelimesi önerileri
Mağaza açıklaması şu an iyi, ama insanların aradığı bazı doğal ifadeler hiç geçmiyor: **"language learning"**, **"subtitle translator"**, **"vocabulary"**, **"flashcards / spaced repetition"**. Hepsi doğru ve ürünle uyumlu. Önerim, ilk paragrafa bir cümle:

> Stop pausing to look up words. CineVocab is a subtitle translator for language learners: watch your show and every subtitle word is translated live on the video, so you learn vocabulary from what you already watch.

Dikkat:
- **Marka sayısı** (adda ve özette 0, açıklamada en çok 5) aynı kalmalı. Yeni marka ekleme.
- **Anahtar kelime doldurma yapma** (aynı sözcüğü tekrar tekrar sıralamak mağaza politikasında spam sayılır).
- Mağaza metni değişikliği yeni bir gönderim ve inceleme demek. Küçük bir değişiklik için acele etme, bir sonraki sürümle birlikte yaparsın.
