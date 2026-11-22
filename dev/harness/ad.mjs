// 15 saniyelik 9:16 örnek reklam: gerçek eklenti arayüzü (deneme ortamında) + Playwright'ın kendi video kaydı (webm, ffmpeg gerekmez).
// Kullanım (deneme sunucusu açıkken): cd dev && node harness/ad.mjs [port] [kare]   (kare: yalnızca önizleme ekran görüntüleri, video yok)
import { chromium } from "playwright";
import { mkdirSync, renameSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = process.argv[2] || "8800", PREVIEW = process.argv[3] === "kare";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "out", "ad");
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1, colorScheme: "dark", ...(PREVIEW ? {} : { recordVideo: { dir: OUT, size: { width: 1080, height: 1920 } } }) });
const page = await ctx.newPage();
await page.goto(`http://127.0.0.1:${PORT}/store/ad.html`);
const fv = page.frameLocator("#fv"), fp = page.frameLocator("#fp");
await fv.locator(".chip").first().waitFor(); await fp.locator("#tabs").waitFor();
await sleep(400);
const at = (s) => sleep(Math.max(0, s * 1000 - (Date.now() - t0)));
const shot = async (s, name) => { await at(s); if (PREVIEW) await page.screenshot({ path: join(OUT, name) }); };
await page.evaluate(() => window.start());
const t0 = Date.now();

await shot(1.6, "f1-hook.png");
await shot(5.2, "f2-translate.png");
await at(6.7); await fv.locator('.chip[data-w="amor"]').click();
await at(7.6); await fv.locator('.chip[data-w="vida"]').click();
await page.mouse.move(900, 760); // fare iframe içinde ama kutudan uzakta: araç çubuğu kapanır
await shot(8.8, "f3-keep.png");
await at(9.3); await fp.locator('#tabs button[data-tab="words"]').click();
await shot(11.2, "f4-words.png");
await at(11.9); await fp.locator('#tabs button[data-tab="practice"]').click();
await shot(13.4, "f5-practice.png");
await shot(14.8, "f6-end.png");
await at(15.6);
const video = page.video();
await page.close(); await ctx.close(); await browser.close();
if (video) { const f = readdirSync(OUT).filter((x) => x.endsWith(".webm")).map((x) => join(OUT, x)); console.log("video:", f[f.length - 1]); }
