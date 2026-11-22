// Gerçek eklenti, gerçek popup: cümleli sorular (boşluk doldurma, cümle kurma bonusu). Ağ yok (hesapsız kullanıcı).
// Çıktı: adım adım rapor + dev/out/e2e/s*.png
import { chromium } from "playwright";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = resolve(HERE, "..", "..", "extension");
const OUT = resolve(HERE, "..", "out", "e2e");
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ok = (c, m) => console.log((c ? "  ✔ " : "  ✖ HATA: ") + m) || (c ? 0 : (process.exitCode = 1));

const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "cv-e2e-")), {
  channel: "chromium", headless: true, viewport: { width: 380, height: 584 }, locale: "en-US",
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, "--host-resolver-rules=MAP cinevocab.up.railway.app 127.0.0.1"],
});
await ctx.route("https://cinevocab.up.railway.app/**", (r) => r.fulfill({ status: 401, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: '{"detail":"yok"}' }));
const sw = ctx.serviceWorkers()[0] || (await ctx.waitForEvent("serviceworker", { timeout: 15000 }));
const extId = new URL(sw.url()).host;
for (const p of ctx.pages()) if (p.url().includes("welcome")) await p.close();

const day = await sw.evaluate(() => CVSrs.dayOf());
const S = (w, t, s, st, extra = {}) => ({ w, t, s, st, ts: 1, ep: "YouTube · Easy Spanish 344", vt: 42, ...extra });
// 1. kutu: boşluk doldurma (şıklı) · 2. kutu: boşluk doldurma (yazarak) · yeni: çeviri şıkkı · cümlesiz: normal
const bank = { "es>en": [
  S("vida", "life", "Todo en la vida es bonito.", "Everything in life is beautiful.", { box: 1, due: day - 1, right: 1, wrong: 0 }),
  S("sueño", "dream", "Tengo un sueño muy grande.", "I have a very big dream.", { box: 2, due: day, right: 2, wrong: 0 }),
  S("amigo", "friend", "Mi amigo vive en Madrid hoy.", "My friend lives in Madrid today."),
  { w: "mundo", t: "world", ts: 1 }, { w: "casa", t: "house", ts: 1 },
] };
await sw.evaluate((b) => chrome.storage.local.set({ src: "es", dst: "en", enabled: true, bank: b }), bank);
await sleep(500);

const popup = await ctx.newPage();
await popup.goto(`chrome-extension://${extId}/popup.html`);
await sleep(600);
await popup.locator('#tabs button[data-tab="practice"]').click();
await sleep(400);
const lp = (sel) => popup.locator("#v-practice " + sel);
await lp("button.btn.p").click();

const kinds = []; let shot = {};
const TR = { vida: "life", sueño: "dream", amigo: "friend", mundo: "world", casa: "house" };
for (let g = 0; g < 60; g++) {
  await sleep(200);
  if (await lp(".big").count()) break;
  const txt = (await popup.locator("#v-practice").innerText()).replace(/\s+/g, " ");
  const cont = lp("button:has-text('Continue')");
  if (await lp(".tk").count() && !(await lp(".fb-ok, .fb-no").count())) { // cümle kurma
    kinds.push("order");
    if (!shot.order) { shot.order = 1; await popup.screenshot({ path: join(OUT, "s4-order.png") }); }
    const want = (await lp(".cl-tr").first().innerText()).trim();
    const sent = { "I have a very big dream.": "Tengo un sueño muy grande.", "Everything in life is beautiful.": "Todo en la vida es bonito.", "My friend lives in Madrid today.": "Mi amigo vive en Madrid hoy." }[want];
    ok(!!sent, `cümle kurma, çeviriyi gösteriyor: "${want}"`);
    const poolTexts = await lp(".ord-pool .tk").allInnerTexts();
    ok(poolTexts.join(" ") !== sent, "kelimeler karışık gelmiş (doğru sırayla aynı değil)");
    await lp("button.btn.p").isDisabled().then((d) => ok(d, "hepsi yerleşmeden 'Check' kapalı"));
    for (const w of sent.split(" ")) await lp(`.ord-pool .tk:not(.used):text-is("${w}")`).first().click();
    ok(await lp("button.btn.p").isEnabled(), "hepsi yerleşince 'Check' açıldı");
    if (!shot.order2) { shot.order2 = 1; await popup.screenshot({ path: join(OUT, "s5-order-done.png") }); }
    await lp("button.btn.p").click(); await sleep(250);
    ok(await lp(".fb-ok").count() === 1, "doğru dizilen cümle 'Correct' gösterdi");
    await popup.screenshot({ path: join(OUT, "s6-order-ok.png") });
    await lp("button:has-text('Continue')").click(); continue;
  }
  if (await lp(".cl").count() && await cont.count() === 0 && !(await lp(".fb-ok").count())) { // boşluk doldurma
    const typed = await lp("input").count();
    const gapEmpty = (await lp(".cl-gap").first().innerText()).trim() === "";
    ok(gapEmpty, "boşluk boş görünüyor (cevap sızmıyor)");
    const sentence = (await lp(".cl").first().innerText()).replace(/\s+/g, " ").trim();
    const w = ["vida", "sueño"].find((x) => ({ vida: "Todo en la", sueño: "Tengo un" })[x] && sentence.startsWith(({ vida: "Todo en la", sueño: "Tengo un" })[x]));
    kinds.push((typed ? "clozeType:" : "clozePick:") + w);
    if (typed) { if (!shot.ct) { shot.ct = 1; await popup.screenshot({ path: join(OUT, "s2-cloze-type.png") }); } await lp("input").fill(w); await lp("button.btn.p").click(); }
    else {
      if (!shot.cp) { shot.cp = 1; await popup.screenshot({ path: join(OUT, "s1-cloze-pick.png") }); }
      const opts = await lp(".ans").allInnerTexts();
      ok(opts.includes(w) && opts.length === 4, `4 şık, doğru kelime içinde: ${opts.join(", ")}`);
      await lp(`.ans:text-is("${w}")`).click();
    }
    await sleep(250);
    const filled = (await lp(".cl-gap.on").first().innerText().catch(() => "")).trim();
    const learnedScreen = await lp(".lw-xl").count(); // 3. kutuya çıkan kelimede "Öğrenildi" anı cümlenin yerini alır
    ok(filled.toLowerCase() === w || (learnedScreen && (await lp(".lw-xl").first().innerText()).trim() === w), `doğru cevapta ${learnedScreen ? "'Öğrenildi' anı" : "kelime cümlede sarı dolu"} göründü: ${filled || w}`);
    if (learnedScreen) await popup.screenshot({ path: join(OUT, "s3b-learned.png") });
    if (!shot.fb) { shot.fb = 1; await popup.screenshot({ path: join(OUT, "s3-cloze-ok.png") }); }
    continue;
  }
  if (await cont.count()) { await cont.click(); continue; }
  if (await lp(".ans").count()) { const w = (await lp(".qw").first().textContent()).trim(); kinds.push("pick:" + w); await lp(`.ans:text-is("${TR[w]}")`).first().click(); continue; }
}
console.log("Sorular:", kinds.join(", "));
ok(kinds.includes("clozePick:vida"), "1. kutudaki 'vida' cümle içinde şıklı soruldu");
ok(kinds.includes("clozeType:sueño"), "2. kutudaki 'sueño' cümle içinde YAZARAK soruldu");
ok(kinds.some((k) => k.startsWith("pick:amigo")) || kinds.some((k) => k.startsWith("pick:")), "yeni kelimeler (kutu yok) normal çeviri şıkkıyla soruldu");
ok(kinds.includes("order") && kinds[kinds.length - 1] === "order", "cümle kurma bonusu en sonda");
await sleep(500);
const result = (await popup.locator("#v-practice").innerText()).replace(/\s+/g, " ");
console.log("Sonuç:", result);
await popup.screenshot({ path: join(OUT, "s7-result.png") });
ok(/Sentence builder: 1\/1/.test(result), "sonuçta 'Sentence builder: 1/1' yazıyor");

const stt = await sw.evaluate(() => chrome.storage.local.get("bank"));
const by = Object.fromEntries(stt.bank["es>en"].map((x) => [x.w, x]));
ok(by.vida.box === 2 && by.vida.due === day + 3, `vida 2. kutuya çıktı (box=${by.vida.box}, +${by.vida.due - day} gün)`);
ok(by["sueño"].box === 3 && by["sueño"].due === day + 7, `sueño 3. kutuya çıktı = öğrenildi (box=${by["sueño"].box})`);
ok(by.amigo.box === 1, `yeni amigo 1. kutuya çıktı (box=${by.amigo.box})`);
ok(by.vida.s === "Todo en la vida es bonito." && by.vida.st === "Everything in life is beautiful.", "cümle ve çevirisi tekrardan sonra da cihazda duruyor");
await ctx.close();
