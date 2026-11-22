# Seçilen görsel yön: A, Gece Seansı

Sahibi: proje sahibi (varsayılan olarak benim önerimle seçildi, yazılı onay bekliyor).
Mockup: `design-directions.html` (geçici klasörde). Değişiklik istenirse bu dosya güncellenir.

## Fikir
Sinema salonu gibi koyu, sessiz. Arayüz bir altyazı akışı gibi okunur. Tek vurgu: altyazı sarısı.

## Token'lar (popup `:root`, video kutusu, welcome)
| Ad | Değer | Kullanım |
|---|---|---|
| zemin | `#0B0B0A` | popup, welcome |
| levha | `#151513` | kart, liste, video kutusu |
| levha 2 | `#1D1D1A` | hover, seçili |
| çizgi | `#EDE8DA` %12 / %22 | ayırıcı, kenar |
| yazı | `#EDE8DA` | ana metin |
| soluk | `#8C877A` | ikincil metin, etiket |
| vurgu | `#F0CB4A` | tek vurgu: çeviri, tutulan kelime, ana düğme, seçili sekme |
| düğme üstü | `#1A1500` | vurgu zemininde yazı |
| iyi | `#86C79A` | yalnızca "tamam/hazır" durumu (vurgu değil) |
| hata | `#FF8F80` | hata |

## Yazı
- Başlık ve düğme: Inter Display (`fonts/d700`, `d800`), başlıkta hafif sıkı harf aralığı.
- Metin: Inter (`fonts/t500`, `t600`).
- Etiket ve zaman damgası: sistem mono (`ui-monospace, Menlo, Consolas`), küçük, soluk.
- Yeni yazı tipi dosyası eklenmedi (yerel ve OFL lisanslı olanlar kullanıldı).

## Kurallar
- Gradyan yok, emoji işaretçi yok, kart gölgesi yalnızca yüzen öğede (video kutusu, toast).
- Video kutusunda çeviri kelimenin altında; tutulan kelime vurgu renginde alt çizgi alır (yerleşimi değiştirmez). Kutu başlığı kısa: "Spanish → English", sayaç, Değiştir.
- Zaman damgası gerçek: kelimenin tutulduğu andaki videonun saniyesi. Adım numaraları gerçek sıra (uydurma süre yok).
- Ödül ve ilerleme öğrenmeye bağlı. Çocuksal, kalabalık, sürekli hareket eden öğe yok. Hareket `prefers-reduced-motion` altında kapanır.
- Açık tema: popup şimdilik yalnızca koyu (önceki sürümle aynı). Welcome her iki temada.
