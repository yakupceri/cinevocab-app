// Açılış sayfasındaki etkileşimli film karesi: tıklayınca kelime kaydedilir (sarı), not değişir, klavye çalışır, dönme durur.
// Çıktı: dev/out/site/landing-demo.*.png.  Kullanım: cd dev && node site-harness/landing-demo.mjs
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const HERE = dirname(fileURLToPath(import.meta.url)), OUT = join(HERE, "..", "out", "site");
mkdirSync(OUT, { recursive: true });
const PORT = 8822, BASE = `http://127.0.0.1:${PORT}`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const srv = spawn("python3", [join(HERE, "serve.py"), "--port", String(PORT)], { stdio: "ignore" });
const b = await chromium.launch({ channel: "chromium", headless: true });
const problems = [], ok = (c, m) => { console.log((c ? "  ✔ " : "  ✘ ") + m); if (!c) problems.push(m); };
try {
  for (let i = 0; i < 40; i++) { try { if ((await fetch(BASE + "/")).ok) break; } catch (e) {} await wait(150); }
  for (const [theme, vp, tag] of [["dark", { width: 1280, height: 800 }, "desktop.dark"], ["light", { width: 1280, height: 800 }, "desktop.light"], ["dark", { width: 390, height: 844 }, "mobile.dark"]]) {
    const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 2 });
    await ctx.addInitScript(([th]) => { try { localStorage.setItem("cv-theme", th); localStorage.setItem("cv-lang", "tr"); } catch (e) {} }, [theme]);
    const p = await ctx.newPage();
    p.on("pageerror", (e) => problems.push(`${tag}: ${e}`));
    p.on("console", (m) => { if (m.type() === "error") problems.push(`${tag}: ${m.text()}`); });
    await p.goto(BASE + "/"); await p.locator("#demoWs .w").first().waitFor(); await wait(400);
    console.log(tag);
    await p.screenshot({ path: join(OUT, `landing-demo.${tag}.before.png`) });
    ok(await p.locator("#demoHint").innerText() === "Bir kelimeye tıkla, kaydet.", "yönlendirme metni (TR)");
    const first = p.locator("#demoWs .w").first();
    await first.click(); await wait(200);
    ok(await first.evaluate((e) => e.classList.contains("star") && e.getAttribute("aria-pressed") === "true"), "tıklanan kelime sarı ve aria-pressed=true");
    ok((await p.locator("#demoHint").innerText()).startsWith("Kaydedildi."), "not 'Kaydedildi' oldu");
    await p.screenshot({ path: join(OUT, `landing-demo.${tag}.after.png`) });
    await first.click(); await wait(100);
    ok(await first.evaluate((e) => !e.classList.contains("star")) && (await p.locator("#demoHint").innerText()).startsWith("Bir kelimeye"), "ikinci tık kaydı geri alır, not eski haline döner");
    if (tag === "desktop.dark") {
      await p.locator("#demoWs .w").nth(1).focus(); await p.keyboard.press("Enter"); await wait(100);
      ok(await p.locator("#demoWs .w").nth(1).evaluate((e) => e.classList.contains("star")), "klavye (Enter) ile kaydedilir");
      const line = await p.locator("#demoWs").innerText(); await wait(8500);
      ok(line === (await p.locator("#demoWs").innerText()), "kaydedilmiş kelime varken cümle değişmez");
      await p.locator("#demoWs .w").nth(1).click(); await p.evaluate(() => document.activeElement && document.activeElement.blur()); await p.mouse.move(5, 5); await wait(8500);   // kayıt geri alındı, odak ve fare uzakta
      ok(line !== (await p.locator("#demoWs").innerText()), "kayıt yokken cümle 7 sn sonra değişir");
    }
    const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(over <= 1, "yatay taşma yok");
    await ctx.close();
  }
  // dil değişince not yeni dilde
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => { try { localStorage.setItem("cv-lang", "de"); } catch (e) {} });
  const p = await ctx.newPage(); await p.goto(BASE + "/"); await p.locator("#demoWs .w").first().waitFor();
  console.log("de");
  ok((await p.locator("h1").innerText()) === "Lerne die Wörter aus dem, was du schaust.", "Almanca başlık");
  await p.locator("#demoWs .w").first().click(); await wait(150);
  ok((await p.locator("#demoHint").innerText()).startsWith("Behalten."), "Almanca not");
  await ctx.close();
} finally { await b.close(); srv.kill(); }
console.log(problems.length ? "SORUN:\n" + problems.join("\n") : "hepsi geçti", "→", OUT);
process.exit(problems.length ? 1 : 0);
