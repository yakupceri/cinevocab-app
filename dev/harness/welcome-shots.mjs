// Karşılama sayfası görüntüleri: koyu ve açık, farklı tarayıcı dilleriyle (yazı metni navigator.language'a göre seçilir).
// Çıktı: dev/out/welcome/*.png.  Kullanım: cd dev && node harness/welcome-shots.mjs
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const HERE = dirname(fileURLToPath(import.meta.url)), OUT = join(HERE, "..", "out", "welcome");
mkdirSync(OUT, { recursive: true });
const PORT = 8821, BASE = `http://127.0.0.1:${PORT}`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const srv = spawn("python3", [join(HERE, "serve.py"), "--port", String(PORT)], { stdio: "ignore" });
const b = await chromium.launch({ channel: "chromium", headless: true });
const problems = [];
try {
  for (let i = 0; i < 40; i++) { try { if ((await fetch(BASE + "/welcome.html")).ok) break; } catch (e) {} await wait(150); }
  for (const [loc, schemes, vp] of [["tr-TR", ["dark", "light"], { width: 900, height: 760 }], ["en-US", ["dark"], { width: 900, height: 760 }],
      ["de-DE", ["dark"], { width: 900, height: 760 }], ["hi-IN", ["dark"], { width: 900, height: 760 }], ["ar-SA", ["dark"], { width: 900, height: 760 }],
      ["tr-TR", ["dark"], { width: 390, height: 844 }]]) {
    for (const cs of schemes) {
      const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 2, colorScheme: cs, locale: loc });
      const p = await ctx.newPage();
      p.on("pageerror", (e) => problems.push(`${loc}: ${e}`));
      await p.goto(`${BASE}/welcome.html`); await wait(700);
      const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      const title = await p.locator("#title").innerText();
      console.log(loc, cs, vp.width, "taşma:", over > 1 ? over + "px ⚠" : "yok", "· başlık:", title);
      await p.screenshot({ path: join(OUT, `${loc}.${cs}.${vp.width}.png`), fullPage: true });
      await ctx.close();
    }
  }
} finally { await b.close(); srv.kill(); }
console.log(problems.length ? "SORUN:\n" + problems.join("\n") : "konsol hatası yok", "→", OUT);
