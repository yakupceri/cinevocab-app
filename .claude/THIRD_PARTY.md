# Üçüncü taraf skill ve ajanlar

`.claude/` altındaki aşağıdaki dosyalar başkalarının eseridir. Lisans metinleri `.claude/licenses/` altındadır. İndirmeden önce her dosya incelendi: hook, `allowed-tools`, çalıştırılabilir kod, ağ isteği ya da proje köküne dosya yazma talimatı **yok** (yalnızca `chrome-extensions` kaynağının `CHROMEWEBSTORE.md` yazdırma talimatı vardı, o kısım alınmadı). Kaynak commit'leri indirme sırasında alındı.

| Yol | Kaynak | Lisans | Telif | Değişiklik |
|---|---|---|---|---|
| `skills/onboarding/` | https://github.com/coreyhaines31/marketingskills (`skills/onboarding`), commit `5b2b400eec1e` | MIT | © 2025 Corey Haines | Yok (`evals/` klasörü alınmadı) |
| `skills/copywriting/` | https://github.com/coreyhaines31/marketingskills (`skills/copywriting`), commit `5b2b400eec1e` | MIT | © 2025 Corey Haines. İçerik, Profound'un MIT lisanslı skill'lerinden ve University of Manchester Academic Phrasebank'tan uyarlanmıştır (dosyalardaki atıf satırları korunmuştur) | Yok (`evals/` alınmadı) |
| `skills/before-you-build/` | https://github.com/wshobson/agents (`plugins/before-you-build`), commit `51b9ae3ac68d` | MIT | © 2024 Seth Hobson | Yok |
| `agents/ux-microcopy-reviewer.md` | https://github.com/VoltAgent/awesome-claude-code-subagents (`categories/08-business-product`), commit `ed74d115b7fb` | MIT | © 2025 VoltAgent. Dosyadaki not: içerik `claude-code-para-disenadores` eklentisi yazarından katkıdır | Yok |
| `skills/chrome-extensions/references/*.md` | https://github.com/GoogleChrome/modern-web-guidance (`skills/chrome-extensions/references`), commit `64a6d708f5a4` | Apache-2.0 (depo README'si `guides/` içeriği için CC BY 4.0 de der; bu dosyaların hangisine girdiği doğrulanamadı, bu yüzden atıf ve lisans birlikte verilir) | Google Chrome ekibi | 8 dosya seçildi, **içerikleri değiştirilmedi**. `SKILL.md` bu projeye ait yeni bir metindir, Google'ın değildir |

## Kullanım notları
- Bu skill'ler Claude Code'a talimat metni verir; kendi başlarına kod çalıştırmazlar.
- `copywriting` yalnızca İngilizce yazıyı düzenler. Mağaza başlığı/kısa açıklama kuralları (marka adı yok, 132 karakter) `yayin-kontrol` ajanında ve `chrome-extensions/SKILL.md`'dedir ve önceliklidir.
- `onboarding` ve `copywriting`, varsa `.agents/product-marketing.md` dosyasını **okur**; bu projede o dosya yoktur, bir şey yazmazlar.
- Almadıklarımız ve nedeni: `referrals` (SaaS/affiliate ağırlıklı, ürünle zayıf uyum), Remotion skill'leri (depoda lisans dosyası yok; video işi ayrıca karara bağlı), `web-design-guidelines` (depoda LICENSE dosyası yok).
