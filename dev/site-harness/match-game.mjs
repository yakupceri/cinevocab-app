// Eşleştirme oyunu (/match) tarayıcı denemesi: hesapsız açılır, doğru eş patlar ve puan verir, yanlış eş kombo sıfırlar ve listeye girer,
// tahta hep çözülebilir kalır, süre bitince sonuç ekranı ve eklenti bağlantısı çıkar. Çıktı: dev/out/site/match.*.png
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const HERE = dirname(fileURLToPath(import.meta.url)), OUT = join(HERE, "..", "out", "site");
mkdirSync(OUT, { recursive: true });
const PORT = 8825, BASE = `http://127.0.0.1:${PORT}`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const srv = spawn("python3", [join(HERE, "serve.py"), "--port", String(PORT)], { stdio: "ignore" });
const b = await chromium.launch({ channel: "chromium", headless: true });
const problems = [], ok = (c, m) => { console.log((c ? "  ✔ " : "  ✘ ") + m); if (!c) problems.push(m); };
const tiles = (p) => p.evaluate(() => [...document.querySelectorAll(".tile:not(.pop)")].map((e) => ({ pair: e.dataset.pair, side: e.dataset.side })));
const solvable = (ts) => { const m = {}; ts.forEach((t) => (m[t.pair] = (m[t.pair] || 0) + 1)); return ts.length > 0 && Object.values(m).every((n) => n === 2); };
async function matchOne(p) {
  const id = await p.evaluate(() => document.querySelector(".tile:not(.pop)").dataset.pair);
  await p.locator(`.tile[data-pair="${id}"][data-side="src"]`).click(); await p.locator(`.tile[data-pair="${id}"][data-side="dst"]`).click(); await wait(330);
}
try {
  for (let i = 0; i < 40; i++) { try { if ((await fetch(BASE + "/")).ok) break; } catch (e) {} await wait(150); }
  await fetch(`${BASE}/__scene?name=loggedout`);
  for (const [theme, vp, tag] of [["dark", { width: 390, height: 844 }, "mobile.dark"], ["light", { width: 1280, height: 800 }, "desktop.light"]]) {
    const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 2, serviceWorkers: "block" });
    await ctx.addInitScript(([th]) => { try { if (!sessionStorage.getItem("i")) { localStorage.clear(); sessionStorage.setItem("i", "1"); } localStorage.setItem("cv-theme", th); localStorage.setItem("cv-lang", "tr"); localStorage.setItem("cv-sound", "0"); } catch (e) {} }, [theme]);
    const p = await ctx.newPage(); const errs = [];
    p.on("pageerror", (e) => errs.push(String(e))); p.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
    await p.goto(BASE + "/match"); await p.locator("#start").waitFor(); await wait(300);
    console.log(tag);
    ok((await p.locator("h1").innerText()) === "Kelime Eşleştirme", "hesapsız açıldı, başlık Türkçe");
    ok((await p.locator(".pairsel select").inputValue()) === "en:tr", "arayüz Türkçe: çevirisi Türkçe olan çift seçildi");
    await p.screenshot({ path: join(OUT, `match.${tag}.intro.png`) });
    await p.locator("#start").click(); await p.locator(".tile").first().waitFor(); await wait(400);
    let ts = await tiles(p);
    ok(ts.length === 16 && solvable(ts), "başlangıçta 16 taş, her taşın eşi tahtada");
    await matchOne(p);
    ok((await p.locator("#hScore").innerText()) === "10", "doğru eş: 10 puan");
    await matchOne(p); await matchOne(p);
    ok((await p.locator("#hScore").innerText()) === "60" && (await p.locator("#hCombo").innerText()) === "x3", "üç doğru üst üste: 10+20+30 = 60, kombo x3");
    ts = await tiles(p);
    ok(ts.length === 16 && solvable(ts), "patlayanların yerine yeni çiftler düştü, tahta çözülebilir");
    await p.screenshot({ path: join(OUT, `match.${tag}.play.png`) });
    const two = await p.evaluate(() => { const a = document.querySelector(".tile.src"), o = [...document.querySelectorAll(".tile.dst")].find((x) => x.dataset.pair !== a.dataset.pair); a.dataset.t = "a"; o.dataset.t = "b"; return a.textContent; });
    await p.locator('.tile[data-t="a"]').click(); await p.locator('.tile[data-t="b"]').click(); await wait(350);
    ok((await p.locator("#hCombo").innerText()) === "–" && (await p.locator("#hScore").innerText()) === "60", "yanlış eş: puan aynı, kombo sıfırlandı");
    ok((await tiles(p)).length === 16, "yanlış eşte taş kaybolmaz");
    const kb = p.locator(".tile:not(.pop)").first(); await kb.focus(); await p.keyboard.press("Enter");
    ok(await kb.evaluate((e) => e.classList.contains("sel") && e.getAttribute("aria-pressed") === "true"), "klavyeyle (Enter) taş seçilir");
    await p.keyboard.press("Enter");
    await p.evaluate(() => { G.left = 1; }); await p.locator(".over").waitFor({ timeout: 4000 }); await wait(900);
    ok((await p.locator(".over .big").innerText()) === "60", "süre bitti: sonuç ekranında 60");
    ok((await p.locator(".miss li").count()) === 2 && (await p.locator(".miss").innerText()).includes(two), "karıştırılan iki kelime listede");
    ok(((await p.locator(".getbox a").getAttribute("href")) || "").startsWith("/get?src=match"), "eklenti bağlantısı sayaçlı mağaza linki");
    ok((await p.evaluate(() => localStorage.getItem("cv-match-best:en:tr"))) === "60", "en iyi puan yalnızca tarayıcıda saklandı");
    await p.screenshot({ path: join(OUT, `match.${tag}.over.png`), fullPage: true });
    await p.locator("#again").click(); await p.locator(".tile").first().waitFor();
    ok((await p.locator("#hScore").innerText()) === "0", "tekrar oyna: yeni tur 0'dan");
    const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(over <= 1, "yatay taşma yok"); ok(errs.length === 0, "konsol hatası yok" + (errs.length ? ": " + errs.join(" | ") : ""));
    await ctx.close();
  }
} finally { await b.close(); srv.kill(); }
console.log(problems.length ? "SORUN:\n" + problems.join("\n") : "hepsi geçti");
process.exit(problems.length ? 1 : 0);
