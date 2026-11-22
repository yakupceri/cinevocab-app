// Gerçek eklenti, gerçek popup: cihazdaki kelimelerle bir tekrar turunu baştan sona oynar.
// Ağ yok (hesapsız kullanıcı). Çıktı: adım adım rapor + dev/out/e2e/p*.png
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

const TR = { propio: "own", amor: "love", vida: "life", mundo: "world", feliz: "happy", pregunta: "question", futuro: "future" };
// defteri hazırla: 1 yazarak sorulacak (2. kutu, bugün), 1 vadesi geçmiş, 4 yeni, 1 vadesi uzak
const day = await sw.evaluate(() => CVSrs.dayOf());
const bank = { "es>en": [
  { w: "propio", t: "own", ts: 7, ep: "YouTube · Easy Spanish 344", vt: 42, box: 2, due: day, right: 2, wrong: 0 },
  { w: "amor", t: "love", ts: 6, ep: "YouTube · Easy Spanish 344", vt: 42 },
  { w: "vida", t: "life", ts: 5, ep: "YouTube · Easy Spanish 344", vt: 38 },
  { w: "mundo", t: "world", ts: 4 }, { w: "pregunta", t: "question", ts: 3 },
  { w: "feliz", t: "happy", ts: 2, box: 1, due: day - 1, right: 1, wrong: 0 },
  { w: "futuro", t: "future", ts: 1, box: 4, due: day + 9, right: 4, wrong: 0 },
] };
await sw.evaluate((b) => chrome.storage.local.set({ src: "es", dst: "en", enabled: true, bank: b }), bank);
await sleep(600);
const badge1 = await sw.evaluate(() => chrome.action.getBadgeText({}));
console.log("Rozet (kaç kelime hazır):", JSON.stringify(badge1)); ok(badge1 === "6", "ikon rozeti bekleyen kelime sayısını gösteriyor (5 yeni/vadesi gelmiş + ... = 6 hazır)");

const popup = await ctx.newPage();
await popup.goto(`chrome-extension://${extId}/popup.html`);
await sleep(700);
await popup.locator('#tabs button[data-tab="practice"]').click();
await sleep(500);
const lp = (sel) => popup.locator("#v-practice " + sel);
const startText = (await lp(".go").first().innerText()).replace(/\s+/g, " ");
console.log("Başlangıç ekranı:", startText);
ok(/READY TO REVIEW\s*6/i.test(startText) && /1 learned · 7 kept/.test(startText), 'başlangıçta "6 hazır, 1 öğrenildi (futuro zaten 4. kutuda), 7 tutuldu" yazıyor');
await popup.screenshot({ path: join(OUT, "p1-start.png") });
await lp("button.btn.p").click();

const wrongOnce = new Set(["amor"]); let seenWrong = false, learnedShot = false, pickShot = false, typeShot = false;
const asked = [];
for (let g = 0; g < 40; g++) {
  await sleep(220);
  if (await lp(".big").count()) break;
  const cont = lp("button:has-text('Continue')");
  const word = (await lp(".qw").first().textContent().catch(() => "")).trim();
  if (await cont.count()) {
    const txt = (await lp("*").allInnerTexts()).join(" ");
    if (/learned/i.test(await popup.locator("#v-practice").innerText()) && !learnedShot) { learnedShot = true; await popup.screenshot({ path: join(OUT, "p4-learned.png") }); console.log("  Öğrenildi anı:", (await popup.locator("#v-practice").innerText()).replace(/\s+/g, " ")); }
    else if (/It is|Almost/.test(await popup.locator("#v-practice").innerText()) || (await lp(".fb-is").count())) { if (!seenWrong) { seenWrong = true; await popup.screenshot({ path: join(OUT, "p5-wrong.png") }); console.log("  Yanlış cevap geri bildirimi:", (await popup.locator("#v-practice").innerText()).replace(/\s+/g, " ")); } }
    await cont.click(); continue;
  }
  if (await lp("input").count()) {
    asked.push(word + " (yazarak)");
    if (!typeShot) { typeShot = true; await popup.screenshot({ path: join(OUT, "p3-type.png") }); }
    await lp("input").fill(TR[word]); await lp("button.btn.p").click(); continue;
  }
  if (await lp(".ans").count()) {
    asked.push(word + " (şık)");
    if (!pickShot) { pickShot = true; await popup.screenshot({ path: join(OUT, "p2-pick.png") }); }
    const opts = await lp(".ans").allTextContents();
    const wrong = wrongOnce.has(word) && !seenWrong ? opts.find((o) => o !== TR[word]) : null;
    await lp(`.ans:has-text("${wrong || TR[word]}")`).first().click();
  }
}
console.log("Sorulan sorular sırayla:", asked.join(", "));
ok(asked[0].startsWith("feliz") && asked[1].startsWith("propio"), "önce vadesi gelenler (feliz, propio), sonra yeniler");
ok(asked.some((a) => a === "propio (yazarak)"), "2. kutudaki kelime YAZARAK soruldu (şık değil)");
ok(asked.some((a) => a.startsWith("feliz") && a.includes("şık")), "1. kutudaki kelime şıkla soruldu");
ok(asked.filter((a) => a.startsWith("amor")).length === 2, "yanlış bilinen kelime ('amor') turun sonunda bir kez daha soruldu");
ok(!asked.some((a) => a.startsWith("futuro")) || asked.indexOf(asked.find((a) => a.startsWith("futuro"))) >= asked.length - 2, "vadesi uzak kelime ancak en sonda (ısınma) sorulur");

await sleep(500);
const result = (await popup.locator("#v-practice").innerText()).replace(/\s+/g, " ");
console.log("Sonuç ekranı:", result);
await popup.screenshot({ path: join(OUT, "p6-result.png") });
ok(/New words learned\s*propio/i.test(result), '"Yeni öğrenilen kelimeler: propio" gösteriliyor');

// depoda gerçekten ilerledi mi
const st = await sw.evaluate(() => chrome.storage.local.get(["bank", "reviewDays"]));
const by = Object.fromEntries(st.bank["es>en"].map((x) => [x.w, x]));
ok(by.propio.box === 3 && by.propio.due === day + 7, `propio 3. kutuya çıktı, 7 gün sonra (box=${by.propio.box}, +${by.propio.due - day} gün)`);
ok(by.feliz.box === 2 && by.feliz.due === day + 3, `feliz 2. kutuya çıktı, 3 gün sonra (box=${by.feliz.box}, +${by.feliz.due - day} gün)`);
ok(by.amor.box === 0 && by.amor.due === day, `yanlış bilinen amor 0. kutuya düştü, bugün tekrar (box=${by.amor.box})`);
ok(by.vida.box === 1 && by.vida.due === day + 1, `yeni vida doğru bilinince 1. kutuya çıktı, yarın (box=${by.vida.box})`);
ok(by.futuro.box === 4 && by.futuro.due === day + 9, "vadesi uzak futuro ısınmada doğru bilinince kutusu DEĞİŞMEDİ");
ok(JSON.stringify(st.reviewDays) === JSON.stringify([day]), "bugün tekrar günü olarak kaydedildi (seri için)");
const badge2 = await sw.evaluate(() => chrome.action.getBadgeText({}));
console.log("Rozet turdan sonra:", JSON.stringify(badge2));
ok(badge2 === "1", "turdan sonra rozet 1 (yalnızca bugün yanlış bilinen 'amor' hazır)");
await ctx.close();
