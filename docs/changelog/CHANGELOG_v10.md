# CineVocab v10 (v9 üzerine)

**Eklenti değişti: 1.8.4 → 1.8.5** (mağazaya yeniden yüklenecek, yeniden incelemeye girer). Site tarafı ayrıca deploy edilir.

## Eklenti (1.8.5)
- **YouTube altyazı gecikmesi azaldı.** Eskiden metin 500 ms aralıkla iki kez aynı okunana kadar bekleniyordu (0,5-1 sn). Şimdi 150 ms yoklama + metin 300 ms değişmeyince işleme. Ölçüm (sahte YouTube sayfası, 3 deneme): v9 ≈ 570-980 ms, v10 ≈ 420-450 ms.
- Not: çeviri sunucudan geç gelirse (Google sınırı / 429 bekleme süreleri) bu düzeltme onu hızlandırmaz. Asıl çözüm resmi Google Çeviri anahtarı (GKEY).

## Site
1. **Akıllı tekrar** (`srs.py`): Leitner kutuları (0,1,3,7,14,30,60 gün). Pratik sayfasında "Akıllı tekrar" kartı: bugün vadesi gelen / yeni / öğreniliyor / ustalaşılan sayıları ve "Tekrarı başlat". Pratik ve çoktan seçmeli düello sonuçları otomatik raporlanır.
2. **Zor kelimelerim**: sürekli yanlış yapılan kelimelerin tablosu (✗/✓ sayıları, 🔊) ve "zor kelimelerle çalış".
3. **Arkadaş ligleri** (`leagues.py`, yeni "Ligler" sekmesi): lig kur, 6 haneli kodla ya da davet linkiyle (`/join/KOD`) katıl, haftalık (Pazartesi UTC sıfırlanır) ve tüm zamanlar sıralaması, 👑 lider / 🐢 son, kurucu üye çıkarabilir, lig silebilir. En çok 20 üye, kişi başı 5 lig. Puan = düello + günlük meydan okuma + pratik XP (günde en çok 600 XP).
4. **Büyük ekran (Kahoot tarzı) modu**: oda kurarken "Büyük ekran". Kurucunun ekranı projektöre/TV'ye yansıtılır (dev oda kodu, renkli A-D şıklar, kaç kişi cevapladı, cevap dağılımı, ilk 5, podyum). Oyuncular telefondan `/game` + kodla katılır. Sorular kurucunun kelime listesinden gelir. Ekran kapanırsa oyuncular eve döner.
5. i18n: 6 dilde tüm yeni metinler ve hata mesajları. Mobil alt çubuk 7 sekmeye ayarlandı.
6. Hesap silinince `word_stats`, `xp_log`, lig üyelikleri de silinir (sahip ayrılırsa lig en eski üyeye geçer).

- **Ses kalitesi:** sesli okuma artık tarayıcının ilk sesini değil, en iyi sesi seçer (Natural/Neural/Google/Premium ve bilinen iyi sesler önde; macOS'taki Albert, Fred, Zarvox gibi robot sesler en sonda). Hız 0,95, perde 1,05. Ayarlar'da "Sesli okuma sesi" kartından elle ses seçilip denenebilir (tercih tarayıcıda saklanır).

## Yeni tablolar (açılışta otomatik)
`word_stats`, `xp_log`, `leagues`, `league_members` (+ v9'dan `daily_sets`, `daily_play`)

## Test edilenler
- Python birim: Leitner durumu, oturum seçimi (vadesi gelen önce, yeni, en yakın), hafta başı, kod temizleme/üretme
- Tarayıcı (Playwright, sahte API): akıllı tekrar kartı + oturum + rapor (öğe/yanlış sayısı doğru), zor kelimeler, lig oluştur/listele/aç/davet linki, davet sayfası → otomatik katılma → Ligler sekmesi, büyük ekran lobi/soru/cevap dağılımı/bitiş/kapanma, oyuncu telefonunun normal akışı, mobil 390px, YouTube gecikme ölçümü, v9 özelliklerinin regresyonu
## Test EDİLEMEYENLER
- Postgres + FastAPI ile uçtan uca (SQL ve WebSocket sunum yolu yalnızca kod incelemesiyle doğrulandı; deploy sonrası elle dene)
- Gerçek YouTube (ölçüm sahte sayfada), gerçek telefon + projektör, gerçek mikrofon
- Not: büyük ekran modunda oyuncuların hesabı olmak zorunda (giriş şart); sınıfta öğrenciler önce kayıt olmalı.
