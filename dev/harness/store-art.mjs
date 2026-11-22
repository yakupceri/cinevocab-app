// Chrome Web Store görselleri: dev/out/release-<sürüm>/ içine 5 ekran görüntüsü (1280x800), küçük tanıtım kutusu (440x280), büyük afiş (1400x560).
// Kullanım (dev/ klasöründen): node harness/store-art.mjs [sürüm=2.3.0] [tr]   ("tr": Türkçe sürüm, dev/out/release-<sürüm>/tr/ içine; önce  node harness/ad2-assets.mjs tr  çalışmış olmalı)
import { chromium } from "playwright";
import { mkdirSync, copyFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const VER = process.argv[2] || "2.3.0", TR = process.argv.includes("tr");
const OUT = resolve(HERE, "..", "out", `release-${VER}`, TR ? "tr" : "."), SHOTS = join(OUT, "screenshots");
mkdirSync(SHOTS, { recursive: true });
const URL_ = (q) => pathToFileURL(join(HERE, "store", "storeart.html")).href + "?" + q + (TR ? "&l=tr" : "");
const names = TR ? { 1: "01-canli-ceviri", 2: "02-tikla-tut", 3: "03-cumle-icinde-calis", 4: "04-aralikli-tekrar", 5: "05-duello-ve-siralama" } : { 1: "01-every-word-live", 2: "02-click-to-keep", 3: "03-practise-in-the-line", 4: "04-spaced-review", 5: "05-duel-and-leaderboard" };
const b = await chromium.launch();
const jobs = [
  ...[1, 2, 3, 4, 5].map((n) => ({ q: `k=shot&n=${n}`, w: 1280, h: 800, file: join(SHOTS, names[n] + ".png") })),
  { q: "k=tile", w: 440, h: 280, file: join(OUT, "promo-small-440x280.png") },
  { q: "k=marquee", w: 1400, h: 560, file: join(OUT, "promo-marquee-1400x560.png") },
  { q: "k=thumb", w: 1280, h: 720, file: join(OUT, TR ? "youtube-kapak-1280x720.png" : "youtube-thumbnail-1280x720.png") },
];
for (const j of jobs) {
  const ctx = await b.newContext({ viewport: { width: j.w, height: j.h }, deviceScaleFactor: 1 });
  const p = await ctx.newPage(); p.on("pageerror", (e) => console.log("SAYFA HATASI:", e.message));
  await p.goto(URL_(j.q)); await p.waitForFunction("document.title === 'ready'"); await p.evaluate("document.fonts.ready"); await new Promise((r) => setTimeout(r, 350));
  await p.screenshot({ path: j.file, type: "png" }); console.log("yazıldı:", j.file.replace(OUT + "/", ""));
  await ctx.close();
}
if (!TR) copyFileSync(resolve(HERE, "..", "..", "extension", "icons", "icon128.png"), join(OUT, "store-icon-128.png"));
await b.close();
