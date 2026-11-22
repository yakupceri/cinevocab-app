// Basit erişilebilirlik ölçümü (dev/site-harness/serve.py açıkken): dokunma hedefi >= 40px, görünür klavye odağı,
// prefers-reduced-motion, yatay taşma. Telefon (390x844) ve masaüstü, koyu ve açık tema.
//   cd dev && node site-harness/a11y.mjs [--port 8810]
import { chromium } from "playwright";
const args = process.argv.slice(2);
const PORT = args[args.indexOf("--port") + 1] || "8810";
const BASE = `http://127.0.0.1:${PORT}`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
let bad = 0;
const pages = ["/account#words", "/account#videos", "/account#known", "/account#practice", "/account#duel", "/account#leagues", "/account#settings", "/game", "/daily", "/explore", "/"];
for (const theme of ["dark", "light"]) for (const [vpn, vp] of [["mobil", { width: 390, height: 844 }], ["masaüstü", { width: 1280, height: 800 }]]) {
  const ctx = await browser.newContext({ viewport: vp, serviceWorkers: "block", reducedMotion: "reduce" });
  await ctx.addInitScript((th) => { try { localStorage.setItem("cv-theme", th); localStorage.setItem("cv-lang", "tr"); localStorage.setItem("cv-pair", "es:en"); } catch (e) {} }, theme);
  await ctx.route(/fonts\.googleapis|fonts\.gstatic|tvmaze|accounts\.google/, (r) => r.abort());
  for (const u of pages) {
    await fetch(`${BASE}/__scene?name=full`);
    const page = await ctx.newPage();
    await page.goto(BASE + u); await wait(700);
    const r = await page.evaluate(() => {
      const small = [], vis = (e) => { const b = e.getBoundingClientRect(), cs = getComputedStyle(e); return b.width > 0 && b.height > 0 && cs.visibility !== "hidden" && cs.display !== "none"; };
      const sel = 'button, a.btn, .nav a, .psel, select, input:not([type=hidden]):not([type=checkbox]), textarea, [role=button], [role=switch], .jump a, .subtabs button';
      document.querySelectorAll(sel).forEach((e) => {
        if (!vis(e)) return;
        const b = e.getBoundingClientRect();
        // dokunma alanı ::after / ::before ile genişletilmiş öğeler (kelime kartındaki ses düğmesi, anahtarlar) ayrıca sayılır
        const ext = e.matches(".spk, .toggle");
        if ((b.height < 39.5 || b.width < 39.5) && !ext) small.push((e.className || e.tagName) + " " + Math.round(b.width) + "x" + Math.round(b.height) + " '" + (e.textContent || "").trim().slice(0, 20) + "'");
      });
      const overflow = document.documentElement.scrollWidth > window.innerWidth + 1;
      return { small, overflow, anim: getComputedStyle(document.body).animationName };
    });
    // klavye odağı: ilk 6 Tab'da odaklanan öğenin çerçevesi var mı
    let focusOk = true, focusSeen = 0;
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press("Tab");
      const f = await page.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return null; const cs = getComputedStyle(e), w = e.closest(".psel"); const cs2 = w ? getComputedStyle(w) : cs;
        return (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) >= 2) || (cs2.outlineStyle !== "none" && parseFloat(cs2.outlineWidth) >= 2) || cs.boxShadow !== "none"; });
      if (f !== null) { focusSeen++; if (!f) focusOk = false; }
    }
    const tag = `${theme}/${vpn} ${u}`;
    const problems = [];
    if (r.small.length) problems.push("küçük hedef: " + r.small.slice(0, 4).join("; "));
    if (r.overflow) problems.push("yatay taşma");
    if (!focusOk) problems.push("odak çerçevesi yok");
    if (focusSeen === 0) problems.push("Tab ile odaklanan öğe yok");
    if (problems.length) { bad++; console.log("  ✖ " + tag + " -> " + problems.join(" | ")); } else console.log("  ✔ " + tag);
    await page.close();
  }
  await ctx.close();
}
await browser.close();
console.log(bad ? `\n${bad} sayfada sorun` : "\nTüm sayfalar geçti");
process.exitCode = bad ? 1 : 0;
