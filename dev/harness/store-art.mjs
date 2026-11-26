// Chrome Web Store görselleri ("Gece Seansı" kimliği): dev/out/release-<sürüm>/ içine 5 ekran görüntüsü (1280x800),
// küçük tanıtım kutusu (440x280), büyük afiş (1400x560), YouTube kapağı (1280x720) ve mağaza simgesi (128x128).
// Kullanım (dev/ klasöründen): node harness/store-art.mjs [sürüm=2.4.0] [tr]   ("tr": Türkçe sürüm, dev/out/release-<sürüm>/tr/ içine)
// Ön koşul YOK: arayüz dev/harness/store/storeart.html içinde çizilir (ad2-assets ekran görüntüleri artık gerekmez).
// Başlık metinleri storeart.html içindeki TITLES sözlüğünde. Yazı tipleri dev/harness/store/fonts, logo docs/marka içinden okunur.
// Her sayfada taşma denetimi çalışır; sorun varsa "UYARI" yazar ve betik 1 ile çıkar.
import { chromium } from "playwright";
import { mkdirSync, copyFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), TR = args.includes("tr"), VER = args.find((a) => a !== "tr") || "2.4.0";
const OUT = resolve(HERE, "..", "out", `release-${VER}`, TR ? "tr" : "."), SHOTS = join(OUT, "screenshots");
mkdirSync(SHOTS, { recursive: true });
const URL_ = (q) => pathToFileURL(join(HERE, "store", "storeart.html")).href + "?" + q + (TR ? "&l=tr" : "");
const names = TR
  ? { 1: "01-canli-ceviri", 2: "02-tikla-tut-not-yaz", 3: "03-cumle-icinde-calis", 4: "04-kelime-eslestirme", 5: "05-kapali-baslar" }
  : { 1: "01-every-word-live", 2: "02-click-keep-note", 3: "03-practise-in-the-line", 4: "04-word-match", 5: "05-off-until-you-switch-on" };
const b = await chromium.launch();
const jobs = [
  ...[1, 2, 3, 4, 5].map((n) => ({ q: `k=shot&n=${n}`, w: 1280, h: 800, file: join(SHOTS, names[n] + ".png") })),
  { q: "k=tile", w: 440, h: 280, file: join(OUT, "promo-small-440x280.png") },
  { q: "k=marquee", w: 1400, h: 560, file: join(OUT, "promo-marquee-1400x560.png") },
  { q: "k=thumb", w: 1280, h: 720, file: join(OUT, TR ? "youtube-kapak-1280x720.png" : "youtube-thumbnail-1280x720.png") },
];
let bad = 0;
for (const j of jobs) {
  const ctx = await b.newContext({ viewport: { width: j.w, height: j.h }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => { bad++; console.log("SAYFA HATASI:", e.message); });
  p.on("requestfailed", (r) => { bad++; console.log("YÜKLENEMEDİ:", r.url()); });
  p.on("request", (r) => { if (!r.url().startsWith("file:")) { bad++; console.log("HARİCİ İSTEK:", r.url()); } });
  await p.goto(URL_(j.q)); await p.waitForFunction("document.title === 'ready'"); await new Promise((r) => setTimeout(r, 200));
  for (const w of await p.evaluate("window.CHECK()")) { bad++; console.log("UYARI (" + j.q + "):", w); }
  await p.screenshot({ path: j.file, type: "png" }); console.log("yazıldı:", j.file.replace(OUT + "/", ""));
  await ctx.close();
}
if (!TR) { copyFileSync(resolve(HERE, "..", "..", "docs", "marka", "simge-128.png"), join(OUT, "store-icon-128.png")); console.log("yazıldı: store-icon-128.png (docs/marka/simge-128.png kopyası)"); }
await b.close();
if (bad) { console.log(bad + " sorun var, görsellere bakmadan kullanma."); process.exit(1); }
