---
name: chrome-extensions
description: CineVocab Chrome eklentisi (Manifest V3, düz JS) üzerinde çalışırken: servis çalışanı, içerik betiği, mesajlaşma, depolama, popup arayüzü, ve Chrome Web Store'a göndermeden önce inceleme kontrol listesi, mağaza metni, gizlilik politikası. Referans dosyaları Google Chrome ekibinin rehberinden alınmıştır.
---

# CineVocab için Chrome eklentisi rehberi

Bu klasördeki `references/` dosyaları **Google Chrome ekibinin `modern-web-guidance` deposundan** alınmış, **değiştirilmemiş** kopyalardır (Apache-2.0, bkz. `LICENSE` ve `.claude/THIRD_PARTY.md`). Bu `SKILL.md` Google'ın değil, bu projenin metnidir.

## Proje kuralları (referanslarla çeliştiğinde bunlar geçer)
1. **İzinler sabit:** yalnızca `storage`, `scripting`, `activeTab`, `identity` ve isteğe bağlı site izinleri. Referanslar `tabs`, `<all_urls>`, `userScripts`, `sidePanel` gibi izinler önerebilir; **yeni izin eklemeden önce proje sahibine sor** ve nedenini yaz.
2. **`CHROMEWEBSTORE.md` oluşturma.** Referanslar (özellikle `store-listing.md`) proje köküne böyle bir dosya açıp güncellemeni söyleyebilir. Yapma. Mağaza metninin tek kaynağı `docs/store/LISTING_EN.md` ve `LISTING_TR.md`'dir.
3. **Mağaza başlığında ve kısa açıklamada üçüncü taraf marka adı yok** (YouTube, Netflix, Prime Video, Udemy). Daha önce reddedildi (git `23a3778`). Marka adları yalnızca uzun açıklamada, tanımlayıcı olarak geçer.
4. **Uzak kod, `eval`, `innerHTML` yok** (içerik betiklerinde YouTube Trusted Types ister). DOM `createElement` ile kurulur.
5. Mağaza metni ve gizlilik politikası **gerçek davranışla birebir** aynı olmalı. Varsayılan davranış ve altyazının nereye gittiği değişirse ikisi de güncellenir (`yayin-kontrol` ajanı denetler).
6. Site dosyalarına (`main.py`, `accounts.py` vb.) dokunmadan önce sor; push = site canlıda yeniden yayınlanır.
7. Zip yalnızca `extension/` içeriğidir, `manifest.json` zip'in kökünde. `dev/`, `.claude/`, `docs/` pakete girmez.

## Hangi referans ne zaman
| Konu | Dosya |
|---|---|
| Servis çalışanı yaşam döngüsü, olay dinleyicileri, uyku | `references/service-worker.md` |
| İçerik betiği ile servis çalışanı arasında mesajlaşma | `references/message-passing.md` |
| İçerik betikleri, izole dünya, enjeksiyon | `references/content-scripts.md` |
| `chrome.storage` kullanımı ve sınırları | `references/storage.md` |
| Popup arayüzü kuralları | `references/popup-ui.md` |
| Mağazaya göndermeden önce kontrol listesi | `references/review-checklist.md` |
| Mağaza metni alanları ve reddedilme nedenleri | `references/store-listing.md` |
| Gizlilik politikası ve veri beyanı | `references/privacy-policy.md` |

Konu dışı olduğu için kopyalanmayan referanslar (yan panel, kullanıcı betikleri, devtools, omnibox, ekran yakalama, sekme yönetimi, ağ kuralları, izin rehberi) kaynakta durur: https://github.com/GoogleChrome/modern-web-guidance
