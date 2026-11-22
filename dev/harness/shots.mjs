// Mağaza ekran görüntüleri (1280x800): dev/harness sunucusundaki slide.html'i Playwright ile PNG'ye çevirir.
// Çıktı: dev/out/store/*.png (git'e ve eklenti paketine girmez).  Kullanım: (sunucu açıkken) node harness/shots.mjs [port]
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = process.argv[2] || "8800";
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "out", "store");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, colorScheme: "dark" });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const slides = [
  { n: 1, name: "01-every-word", run: async (f) => { await f.locator(".chip").first().waitFor(); await wait(500); } },
  { n: 2, name: "02-keep-a-word", run: async (f, page) => {
      await f.locator(".chip").first().waitFor();
      await f.locator('.chip[data-w="amor"]').click(); await wait(250);
      await f.locator('.chip[data-w="vida"]').click();
      await page.mouse.move(1150, 300); await wait(1500); // fare iframe İÇİNDE ama kutudan uzakta: araç çubuğu ve kesikli çerçeve kapanır
  } },
  { n: 3, name: "03-your-words", run: async (f) => { await f.locator('#tabs button[data-tab="words"]').click(); await f.locator(".wl li").first().waitFor(); await wait(300); } },
  { n: 4, name: "04-practise-in-the-line", run: async (f, page) => { await page.locator("img#f").waitFor(); await wait(400); } },
  { n: 5, name: "05-off-until-on", run: async (f) => { await f.locator("#state").waitFor(); await wait(400); } },
];

for (const s of slides) {
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`${BASE}/store/slide.html?n=${s.n}`);
  const frame = page.frameLocator("#f");
  await s.run(frame, page);
  const file = join(OUT, `${s.name}.png`);
  await page.screenshot({ path: file, type: "png" });
  const buf = readFileSync(file);
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  console.log(`${s.name}.png  ${w}x${h}  ${errors.length ? "HATA: " + errors.join(" | ") : "sayfa hatası yok"}`);
  await page.close();
}
await browser.close();
