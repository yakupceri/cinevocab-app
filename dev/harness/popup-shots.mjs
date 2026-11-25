// Popup ekran görüntüleri (380x584, 2x): sahte chrome API'li dev/harness/serve.py üzerinden. Gerçek hesap ya da kişisel veri yok.
// Çıktı: dev/out/popup/*.png.  Kullanım: cd dev && node harness/popup-shots.mjs [ui=tr]
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "out", "popup");
mkdirSync(OUT, { recursive: true });
const PORT = 8818, BASE = `http://127.0.0.1:${PORT}`;
const UI = process.argv[2] || "tr";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const srv = spawn("python3", [join(HERE, "serve.py"), "--port", String(PORT)], { stdio: "ignore" });
const b = await chromium.launch({ channel: "chromium", headless: true });
const problems = [];
try {
  for (let i = 0; i < 40; i++) { try { if ((await fetch(BASE + "/popup.html")).ok) break; } catch (e) {} await wait(150); }
  const open = async (scene, ui = UI) => {
    const ctx = await b.newContext({ viewport: { width: 380, height: 584 }, deviceScaleFactor: 2, colorScheme: "dark" });
    const p = await ctx.newPage();
    p.on("pageerror", (e) => problems.push(`${scene}: ${e}`));
    p.on("console", (m) => { if (m.type() === "error") problems.push(`${scene}: ${m.text()}`); });
    await p.goto(`${BASE}/popup.html?scene=${scene}&ui=${ui}&tab=yt`);
    await wait(700);
    return p;
  };
  const shot = (p, name) => p.screenshot({ path: join(OUT, `${name}.png`) });
  let p = await open("new"); await shot(p, "izle-yeni"); await p.context().close();
  p = await open("on"); await shot(p, "izle-acik");
  for (const t of ["words", "practice", "me"]) { await p.locator(`#tabs [data-tab=${t}]`).click(); await wait(500); await shot(p, `sekme-${t}-hesapsiz`); }
  await p.context().close();
  p = await open("bank");
  for (const t of ["words", "practice"]) { await p.locator(`#tabs [data-tab=${t}]`).click(); await wait(500); await shot(p, `sekme-${t}-kelimeli`); }
  // alıştırmayı başlat: ilk büyük düğme, sonra bir soru ve cevap
  const start = p.locator("#view-practice .btn, .view:not([hidden]) .btn").first();
  if (await start.count()) { await start.click().catch(() => {}); await wait(600); await shot(p, "pratik-soru"); }
  const ans = p.locator(".ans").first();
  if (await ans.count()) { await ans.click().catch(() => {}); await wait(500); await shot(p, "pratik-cevap"); }
  await p.context().close();
  // taşma: 380 px genişliğinde yatay kaydırma olmamalı; Almanca ve Rusça uzun metinler
  for (const ui of ["de", "ru"]) {
    p = await open("bank", ui);
    const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    console.log(`taşma (${ui}):`, over > 1 ? over + "px ⚠" : "yok");
    await shot(p, `izle-${ui}`); await p.context().close();
  }
} finally { await b.close(); srv.kill(); }
console.log(problems.length ? "SORUN:\n" + [...new Set(problems)].join("\n") : "konsol hatası yok", "→", OUT);
