// Yazı tipi düşüşü: Big Shoulders ve Instrument Sans yalnızca Latin (ve Latin Extended) içerir. Kiril, Yunan, Arapça, Japonca, Korece,
// Hintçe metinlerin sistem yazı tipine düşüp düşmediğini ve düzenin bozulmadığını sitenin kendi CSS'iyle gösterir.
//   (dev/site-harness/serve.py açıkken)  cd dev && node site-harness/fonts-fallback.mjs [--port 8810]
// Çıktı: dev/out/site/yazitipi-dusus.{dark,light}.png
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const PORT = args[args.indexOf("--port") + 1] || "8810";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "out", "site");
mkdirSync(OUT, { recursive: true });
const SAMPLES = [
  ["tr", "Her altyazıyı kelime dağarcığına çevir", "Kelimeler · Pratik · Düello"],
  ["ru", "Превратите каждый субтитр в словарный запас", "Слова · Практика · Дуэль"],
  ["ar", "حوّل كل ترجمة إلى مفردات", "الكلمات · التدريب · المبارزة"],
  ["ja", "字幕のすべての単語を語彙に変える", "単語 · 練習 · 対戦"],
  ["ko", "모든 자막을 어휘로 바꿔 보세요", "단어 · 연습 · 대결"],
  ["hi", "हर सबटाइटल को शब्दावली में बदलें", "शब्द · अभ्यास · द्वंद्व"],
  ["de", "Verwandle jeden Untertitel in Vokabeln", "Wörter · Üben · Duell"],
];
const b = await chromium.launch();
for (const theme of ["dark", "light"]) {
  const ctx = await b.newContext({ viewport: { width: 1000, height: 760 }, serviceWorkers: "block" });
  await ctx.addInitScript((th) => { try { localStorage.setItem("cv-theme", th); localStorage.setItem("cv-lang", "tr"); } catch (e) {} }, theme);
  const p = await ctx.newPage();
  await p.goto(`http://127.0.0.1:${PORT}/explore`);
  await p.evaluate((rows) => {
    document.body.replaceChildren();
    const wrap = document.createElement("main"); wrap.className = "wrap";
    for (const [lang, h, sub] of rows) {
      const row = document.createElement("section"); row.className = "card"; row.style.marginBottom = "10px"; row.lang = lang;
      if (lang === "ar") row.dir = "rtl";
      const t = document.createElement("h1"); t.textContent = h; t.style.fontSize = "34px";
      const s = document.createElement("div"); s.style.cssText = "display:flex;gap:12px;align-items:center;margin-top:8px";
      const btn = document.createElement("button"); btn.className = "primary"; btn.textContent = sub.split(" · ")[0];
      const tab = document.createElement("button"); tab.textContent = sub.split(" · ")[1];
      const note = document.createElement("span"); note.className = "dim"; note.textContent = lang + " · " + sub;
      s.append(btn, tab, note); row.append(t, s); wrap.append(row);
    }
    document.body.append(wrap);
  }, SAMPLES);
  await p.evaluate("document.fonts.ready");
  await p.waitForTimeout(400);
  await p.screenshot({ path: join(OUT, `yazitipi-dusus.${theme}.png`), fullPage: true });
  await ctx.close();
}
await b.close();
console.log("tamam:", OUT);
