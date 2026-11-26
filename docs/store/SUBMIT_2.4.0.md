# CineVocab 2.4.0: Chrome Web Store'a yükleme rehberi

Her şey `dev/out/release-2.4.0/` içinde (git'e girmez). Yüklemeyi proje sahibi yapar.

| Dosya | Mağazadaki yeri |
|---|---|
| `cinevocab-2.4.0.zip` | Package → Upload new package |
| `screenshots/01..05-*.png` (1280x800) | Store listing → Screenshots (sırayla; eskileri sil) |
| `promo-small-440x280.png` | Small promo tile |
| `promo-marquee-1400x560.png` | Marquee promo tile |
| `store-icon-128.png` | Store icon |
| `tr/` altındakiler | Türkçe mağaza listesi |

Yeniden üretmek: `cd dev && node harness/store-art.mjs 2.4.0` ve `node harness/store-art.mjs 2.4.0 tr`.

## Bu sürümde ne değişti
- Yeni görsel kimlik ve simge (popup, video üstü kutu, karşılama sayfası). **Simge ve ad değiştiği için yeniden inceleme olur.**
- Popup'ta kelime eşleştirme oyunu (cihazdaki kelimelerle, 60 sn; 6 kelimeden azsa sitedeki oyunu açar).
- Tutulan kelimeye not (video üstünde "+ Not", popup listesinde düzenleme). Hesapsızken yalnızca cihazda; giriş yapılmışsa hesaba da kaydedilir, sitedeki kelime listesinde de görünür ve düzenlenir. Altyazı cümleleri hesaba hâlâ gönderilmez.
- Mağaza adı ve kısa açıklama değişti (paketin içinde, `_locales`): ad 16 dilde, kısa açıklama İngilizce ve Türkçe.
- **İzinler aynı:** `storage, scripting, activeTab, identity`; host izni ve dört site değişmedi. Yeni izin uyarısı çıkmamalı.

## Adım adım
1. Dashboard → CineVocab → **Package** → *Upload new package* → `cinevocab-2.4.0.zip`. Sürüm 2.4.0 görünmeli.
2. **Store listing** → *English*: aşağıdaki "Description (EN)". *Turkish*: "Açıklama (TR)". Ad ve kısa açıklama paketten gelir, elle yazılmaz.
3. Görselleri tablodaki gibi değiştir (EN ve TR ayrı).
4. **Privacy practices** → yalnızca `storage` gerekçesini aşağıdaki metinle değiştir. Veri kullanımı kutuları ve "Remote code: No" aynı kalır.
5. **Test instructions**: aşağıdaki "Notes for the reviewer".
6. *Submit for review*. İstersen *Defer publishing* seç, onaydan sonra kendin yayınla.

## Ad ve kısa açıklama (paketten gelir; kontrol için)
- EN ad: `CineVocab: Subtitle Translator & Vocabulary Builder`
- TR ad: `CineVocab: Altyazı Çevirisi ve Kelime Defteri`
- EN kısa: `Learn the words from what you watch. Word-by-word subtitle translation, a free vocabulary list and spaced repetition practice.` (126)
- TR kısa: `İzlediğin dizinin kelimelerini öğren. Kelime kelime altyazı çevirisi, ücretsiz kelime defteri ve aralıklı tekrar.` (113)
- Diğer 14 dilde ad çevrildi (gözden geçirilmedi), kısa açıklama 2.3.x'teki gibi kaldı.
- "Dual subtitles" ve "flashcards" bilerek YOK: ürün iki tam altyazı satırı göstermez (kelime kelime çeviri gösterir), çevrilen kart da yoktur.

## Description (EN)
```
CineVocab is a subtitle translator for language learning: on YouTube, Prime Video, Netflix and Udemy, every subtitle word gets its translation right on the video while you watch.

Learn the words from what you watch. Click a word to keep it and build your own vocabulary list. Keeping words is free and needs no sign-up: the list stays on your device. Later, practise with spaced repetition, in the line you heard each word in.

HOW IT LOOKS
The line appears in a box on the video, with the translation under each word and, when available, a translation of the whole line below. Move the box, resize it and set its transparency.

NEW IN 2.4
- Word match: a 60-second game in the popup. Pair the words you kept with their translations. It needs 6 kept words that have a translation; with fewer, it opens the web version with common words. It is only a game and does not change your review schedule.
- Notes: after you keep a word, press "+ Note" on the video to add a short note of your own (up to 140 characters), or edit it in the popup list. Without an account, notes are stored only on your device. If you are signed in, a note is also saved to your account, so it shows in your word list on the website and on your other devices.
- New look and icon. No new permissions.

TRY IT IN A MINUTE
1. Install CineVocab. A welcome page opens.
2. Check the two languages and press the button. This switches CineVocab on and opens a search for videos with captions.
3. Open a video. Press CC in the player if captions are off.
4. Click a word to keep it.

OFF UNTIL YOU TURN IT ON
After install, CineVocab translates nothing and sends no subtitle text until you turn it on. It starts when you press the welcome page button, "Start translating" on a video, or the switch in the toolbar popup. You can switch it off any time from the toolbar icon.

WHILE YOU WATCH
- 16 languages, in any pair: Turkish, English, French, Italian, German, Spanish, Portuguese, Russian, Arabic, Romanian, Japanese, Hindi, Indonesian, Polish, Dutch and Korean
- Language guard: translation pauses when the captions are not in the language you chose
- Kept words are highlighted on the video
- Words you have seen before show up instantly, from a small cache on your device
- Other sites: press "Turn on for this site" in the popup; permission is asked for that site and its video player only

PRACTISE WHAT YOU KEPT (no sign-up)
- Quick rounds in the popup: multiple choice first, typing later
- Fill-in-the-blank questions in the line the word came from, and a sentence builder
- Spaced repetition: a correct answer moves the word to a longer gap (1, 3, 7, 14, 30, 60 days); a miss brings it back to the start
- The toolbar icon shows how many are ready to review

WITH A FREE ACCOUNT
- The words you kept and your notes are copied to your account. The list on your device is not deleted, and the subtitle lines the words came from are not sent.
- While you are signed in, the words you meet while watching are also saved to your account, with the video title.
- Live duels, leaderboards, friend leagues and a daily challenge on the CineVocab website

PRIVACY
While CineVocab is on, it sends the subtitle line on screen, its words, the video title and (once per title) the thumbnail address to our server, which passes the text to Google Translate. This happens with or without an account. While it is off, no subtitle text is sent. Without an account, the words you keep, the lines they came from, your notes, your review progress and the translation cache stay on your device. If you sign in, the words and your notes are also saved to your account; the lines are not. We never sell your data. Full policy: https://cinevocab.up.railway.app/privacy

CineVocab is an independent project. It is not affiliated with or endorsed by any of the sites or services it works with.
```
Marka anması: 5 (YouTube, Prime Video, Netflix, Udemy, Google Translate).

## Açıklama (TR)
```
CineVocab, dil öğrenmek için bir altyazı çeviri eklentisidir: YouTube, Prime Video, Netflix ve Udemy'de izlerken her altyazı kelimesinin çevirisi videonun üstünde görünür.

İzlediğin dizinin kelimelerini öğren. Bir kelimeye tıkla, kaydedilsin; kendi kelime defterin oluşsun. Kelime kaydetmek ücretsizdir ve üyelik istemez: defter cihazında durur. Sonra aralıklı tekrarla, kelimeyi duyduğun cümlenin içinde çalış.

NASIL GÖRÜNÜR
Satır videonun üstündeki bir kutuda çıkar: her kelimenin altında çevirisi, en altta da (varsa) cümlenin çevirisi. Kutuyu taşıyabilir, boyutunu ve saydamlığını ayarlayabilirsin.

2.4 İLE GELENLER
- Kelime eşleştirme: açılır pencerede 60 saniyelik oyun. Kaydettiğin kelimeleri çevirileriyle eşleştir. Çevirisi olan 6 kelime ister; daha azı varsa oyunun web sürümü ortak kelimelerle açılır. Yalnızca oyundur, tekrar takvimini değiştirmez.
- Not: bir kelimeyi kaydettikten sonra videonun üstündeki "+ Not" düğmesiyle kendi kısa notunu yaz (en çok 140 karakter) ya da açılır penceredeki listede düzenle. Hesabın yoksa notlar yalnızca cihazında saklanır. Giriş yaptıysan not hesabına da kaydedilir; sitedeki kelime listende ve diğer cihazlarında da görünür.
- Yeni görünüm ve simge. Yeni izin yok.

BİR DAKİKADA DENE
1. CineVocab'ı kur. Karşılama sayfası açılır.
2. İki dili kontrol et ve düğmeye bas. CineVocab açılır ve altyazılı videolar için bir arama gelir.
3. Bir video aç. Altyazı kapalıysa oynatıcıda CC'ye bas.
4. Bir kelimeye tıkla, kaydedilsin.

SEN AÇMADIKÇA KAPALI
Kurulumdan sonra, sen açana kadar hiçbir şey çevrilmez ve altyazı metni gönderilmez. Karşılama sayfasındaki düğmeye, videodaki "Çeviriyi başlat" düğmesine ya da araç çubuğu penceresindeki anahtara basınca başlar. İstediğin an araç çubuğundaki simgeden kapatabilirsin.

İZLERKEN
- 16 dil, her çiftte: Türkçe, İngilizce, Fransızca, İtalyanca, Almanca, İspanyolca, Portekizce, Rusça, Arapça, Rumence, Japonca, Hintçe, Endonezce, Lehçe, Felemenkçe ve Korece
- Dil koruması: altyazı seçtiğin dilde değilse çeviri durur
- Kaydettiğin kelimeler videoda vurgulu görünür
- Daha önce gördüğün kelimeler, cihazındaki küçük bir önbellekten anında çıkar
- Başka siteler: açılır pencerede "Bu sitede aç"a bas; izin yalnızca o site ve video oynatıcısı için istenir

KAYDETTİKLERİNLE ÇALIŞ (üyelik gerekmez)
- Açılır pencerede hızlı turlar: önce seçmeli, sonra yazarak
- Kelimenin geçtiği cümlede boşluk doldurma ve cümle kurma
- Aralıklı tekrar: doğru cevap kelimeyi daha uzun bir aralığa taşır (1, 3, 7, 14, 30, 60 gün); yanlış cevap başa döndürür
- Araç çubuğu simgesi kaç kelimenin tekrar beklediğini gösterir

ÜCRETSİZ HESAPLA
- Kaydettiğin kelimeler ve notların hesabına kopyalanır. Cihazdaki defter silinmez; kelimelerin geçtiği altyazı cümleleri gönderilmez.
- Giriş yaptıktan sonra izlerken karşılaştığın kelimeler de video adıyla hesabına kaydedilir.
- CineVocab sitesinde canlı düello, sıralama, arkadaş ligleri ve günlük meydan okuma

GİZLİLİK
CineVocab açıkken ekrandaki altyazı satırını, kelimelerini, videonun adını ve (her video için bir kez) küçük resim adresini sunucumuza gönderir; sunucu metni Google Translate'e iletir. Bu, hesabın olsa da olmasa da böyledir. Kapalıyken altyazı metni gönderilmez. Hesabın yoksa kaydettiğin kelimeler, geçtikleri cümleler, notların, tekrar ilerlemen ve çeviri önbelleği cihazında kalır. Giriş yaparsan kelimelerin ve notların hesabına da kaydedilir; cümleler kaydedilmez. Verilerini asla satmayız. Tam metin: https://cinevocab.up.railway.app/privacy

CineVocab bağımsız bir projedir. Çalıştığı sitelerin ve hizmetlerin hiçbiriyle bağlantılı değildir ve onlar tarafından onaylanmamıştır.
```

## Privacy practices: `storage` gerekçesi (yalnızca bu değişir)
```
storage: Saves the on/off switch, the chosen language pair, the subtitle box settings, the words the user keeps on their device (with the subtitle line they came from and the user's own short note), review progress, the best score of the word match game, a small cache of already translated words so they show up faster, the optional sign-in key, and small interface flags (such as which hints were already shown, the starred-word list and a cached account summary).
```

## Notes for the reviewer
```
Translation is off after install and works without an account. On the welcome page (opens at install), keep Spanish to English selected and press "Find Spanish videos with captions". This switches the extension on and opens search results filtered for captions. Open a video with Spanish captions, press CC if needed: each subtitle word appears with its translation in a box on the video. Click a word to keep it; it is listed in the toolbar popup under Words, without signing in. New in 2.4: after keeping a word, press "+ Note" in the box header, type a note and press "Save"; the note shows under the word in the popup list and is stored on the device. If you sign in (optional), the note is also saved to the account and appears in the word list on the website. Keep 6 words, open the popup's Practice tab and press "Word match" for the 60-second game (with fewer than 6 it opens the web version). For fill-in-the-blank questions: keep 4 words, press "Start" and finish one round (multiple choice), then press "Practise anyway". The welcome page preselects Spanish to English when the browser language is English; otherwise pick them in the two lists.
```

## Yayından sonra gerçek Chrome'da dene
- Araç çubuğunda yeni simge; popup yeni renklerde.
- Bir videoda kelime tut → "+ Not" → yaz. **Yazarken oynatıcı kısayolları (boşluk, k, f) tetiklenmemeli.** Bu yalnızca sahte sayfada test edildi.
- Giriş yapılmışken (site yayında olmalı) videoda not yaz → popup Kelimeler'de ve sitede Kelimeler sekmesinde kartın altında görünmeli; sitede düzenleyince popup'ta da gelmeli. Giriş yokken sunucuya not isteği gitmemeli (DevTools → Network, service worker).
- 6 kelime tutup popup → Pratik → Kelime eşleştirme.
- Eklenti kapalıyken video aç: soru çıkmamalı, sunucuya istek gitmemeli (2.3.1 davranışı).

## Bilinen sınırlar
- Popup oyunu ve not, gerçek Chrome eklenti penceresinde elle denenmedi (sahte chrome API'li düzenek ve gerçek eklentiyle çalışan e2e testleri geçti).
- Hesaba not yazma (arka plan → `/api/note`, giriş sonrası toplu taşıma `/api/notes/import`) gerçek sunucuda denenmedi; yalnızca geçici Postgres'li testler ve sahte sunucu var. Site yayınlanmadan paket yüklenirse uçlar 404 verir: popup notu yalnızca cihaza yazar, hata göstermez.
- Chrome Web Store "Privacy practices" veri kutuları (toplanan veri türleri): kullanıcının yazdığı kısa notlar artık sunucuda duruyor. Kelime listesiyle aynı kategoride sayılması gerekir mi, formu yüklerken gözden geçir; bu belgede değiştirilmedi.
- 14 dildeki ad çevirileri ve 9 dildeki yeni arayüz metinleri ana dil konuşanına gösterilmedi.
- Mağaza görsellerindeki arayüzler çizimdir; gerçek ekranla küçük farkları vardır (gölge, kesik çerçeve, örnek not).
