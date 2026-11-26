// Video üstünde kelimeye not: kelimeyi tut → "+ Not" → yaz → Enter. Not cihazdaki bankaya yazılır, sitenin klavye kısayolları tetiklenmez,
// popup'ın kelime listesinde görünür ve orada düzenlenir. HESAPSIZKEN sunucuya not isteği/mesajı gitmez; hesaplıyken (?key=1, sahte sunucu)
// hesaba da yazılır, popup'ta sunucudaki + cihazdaki notlar birleşir ve düzenlenir; pratikte not cevaptan SONRA görünür.
// Çıktı: dev/out/box/not-*.png
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const HERE = dirname(fileURLToPath(import.meta.url)), OUT = join(HERE, "..", "out", "box");
mkdirSync(OUT, { recursive: true });
const PORT = 8828, BASE = `http://127.0.0.1:${PORT}`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const srv = spawn("python3", [join(HERE, "serve.py"), "--port", String(PORT)], { stdio: "ignore" });
const b = await chromium.launch({ channel: "chromium", headless: true });
const problems = [], ok = (c, m) => { console.log((c ? "  ✔ " : "  ✘ ") + m); if (!c) problems.push(m); };
const bank = (p) => p.evaluate(() => new Promise((r) => chrome.storage.local.get("bank", (x) => r((x.bank || {})["es>en"] || []))));
try {
  for (let i = 0; i < 40; i++) { try { if ((await fetch(BASE + "/popup.html")).ok) break; } catch (e) {} await wait(150); }
  const ctx = await b.newContext({ viewport: { width: 1100, height: 560 }, deviceScaleFactor: 2 });
  let p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(String(e)));
  await p.addInitScript(() => { window.__keys = []; document.addEventListener("keydown", (e) => window.__keys.push(e.key)); });   // "sitenin kısayol dinleyicisi"
  await p.goto(`${BASE}/__video.html?scene=on&line=0&kf=1`); await wait(2200);
  const chip = p.locator(".chip").filter({ hasText: "amor" }).first();
  ok(await p.locator("button.nb").count() === 0, "kelime tutulmadan not düğmesi yok");
  await chip.click(); await wait(500);
  ok(await p.locator("button.nb").count() === 1, "kelime tutulunca başlıkta '+ Not' çıkar");
  await p.locator("button.nb").click(); await wait(300);
  const inp = p.locator(".note input");
  ok(await inp.isVisible() && (await inp.getAttribute("placeholder")).includes("amor"), "not kutusu açıldı, hangi kelime için olduğu yazıyor");
  await p.screenshot({ path: join(OUT, "not-yaziyor.png"), clip: { x: 0, y: 0, width: 1100, height: 560 } });
  await inp.pressSequentially("k f ünlü sahne"); await wait(100);
  ok((await p.evaluate(() => window.__keys.length)) === 0, "yazarken tuşlar sayfaya sızmadı (k, f, boşluk kısayolları tetiklenmez)");
  await wait(13000);
  ok(await inp.isVisible(), "yazarken kutu kendiliğinden kapanmadı (12 sn sonra hâlâ açık)");
  await inp.press("Enter"); await wait(400);
  const it = (await bank(p)).find((x) => x.w === "amor");
  ok(it && it.n === "k f ünlü sahne", "not cihazdaki kelimeye yazıldı: " + JSON.stringify(it && it.n));
  ok(!(await inp.isVisible()), "kaydedince not kutusu kapandı");
  ok((await p.evaluate(() => window.__msgs.filter((m) => m.action === "note").length)) === 0, "HESAPSIZ: arka plana 'note' mesajı bile gitmedi (anahtar yok)");
  ok((await p.evaluate(() => window.__net.filter((n) => /\/api\/note/.test(n.url)).length)) === 0, "HESAPSIZ: not için ağ isteği yok");
  await p.locator("button.nb").click(); await wait(300);
  ok((await inp.inputValue()) === "k f ünlü sahne", "tekrar açınca eski not geliyor");
  await inp.press("Escape"); await wait(200);
  ok(!(await inp.isVisible()) && (await bank(p)).find((x) => x.w === "amor").n === "k f ünlü sahne", "Esc vazgeçer, not değişmez");
  await chip.click(); await wait(400);
  ok(await p.locator("button.nb").count() === 0 && !(await bank(p)).some((x) => x.w === "amor"), "kelime bırakılınca not düğmesi ve kelime gider");
  ok(errs.length === 0, "sayfa hatası yok" + (errs.length ? ": " + errs.join(" | ") : ""));
  await p.close();
  // popup: hesapsız kelime listesinde not satırı
  p = await ctx.newPage(); await p.setViewportSize({ width: 380, height: 584 }); const e2 = []; p.on("pageerror", (e) => e2.push(String(e)));
  await p.goto(`${BASE}/popup.html?scene=bank&ui=tr&tab=yt`); await wait(600);
  await p.locator("#tabs [data-tab=words]").click(); await wait(400);
  const first = p.locator(".wl li").first();
  ok((await first.locator("button.nt").innerText()) === "+ Not", "popup: notu olmayan kelimede '+ Not'");
  await first.locator("button.nt").click(); await p.locator(".nt-in").fill("kendi notum"); await p.locator(".nt-in").press("Enter"); await wait(400);
  ok((await p.locator(".wl li").first().locator("button.nt").innerText()) === "kendi notum", "popup: not kaydedildi ve listede görünüyor");
  await p.screenshot({ path: join(OUT, "not-popup.png") });
  ok((await p.evaluate(() => window.__net.filter((n) => /\/api\/notes?\b/.test(n.url)).length)) === 0, "HESAPSIZ popup: not için sunucuya hiçbir istek gitmedi");
  ok(e2.length === 0, "popup sayfa hatası yok" + (e2.length ? ": " + e2.join(" | ") : ""));
  await p.close();

  // ---- hesaplı: videoda not hesaba da gider
  p = await ctx.newPage(); const e3 = []; p.on("pageerror", (e) => e3.push(String(e)));
  await p.goto(`${BASE}/__video.html?scene=on&line=0&kf=1&key=1`); await wait(2200);
  await p.locator(".chip").filter({ hasText: "amor" }).first().click(); await wait(500);
  await p.locator("button.nb").click(); await wait(300);
  await p.locator(".note input").fill("hesaba da gitsin"); await p.locator(".note input").press("Enter"); await wait(400);
  let notes = await p.evaluate(() => window.__msgs.filter((m) => m.action === "note"));
  ok(notes.length === 1 && JSON.stringify(notes[0]) === JSON.stringify({ action: "note", src: "es", dst: "en", word: "amor", note: "hesaba da gitsin" }), "HESAPLI: içerik betiği arka plana tek 'note' mesajı yolladı: " + JSON.stringify(notes));
  ok((await bank(p)).find((x) => x.w === "amor").n === "hesaba da gitsin", "HESAPLI: not yine önce cihazdaki kelimeye yazıldı");
  ok((await p.evaluate(() => window.__net.filter((n) => /\/api\/note/.test(n.url)).length)) === 0, "içerik betiği doğrudan ağ isteği atmadı (iş arka planda)");
  await p.locator("button.nb").click(); await wait(300);
  await p.locator(".note input").fill(""); await p.locator(".note input").press("Enter"); await wait(400);
  notes = await p.evaluate(() => window.__msgs.filter((m) => m.action === "note"));
  ok(notes.length === 2 && notes[1].note === "" && notes[1].word === "amor", "HESAPLI: notu boşaltınca silme isteği ('' ile) gitti");
  await p.locator(".chip").filter({ hasText: "amor" }).first().click(); await wait(400);   // kelimeyi bırak
  ok((await p.evaluate(() => window.__msgs.filter((m) => m.action === "note").length)) === 2, "kelime bırakılınca ek not mesajı yok");
  ok(e3.length === 0, "hesaplı video sayfa hatası yok" + (e3.length ? ": " + e3.join(" | ") : ""));
  await p.close();

  // ---- hesaplı popup: sunucudaki + cihazdaki notlar birleşir, düzenlenir
  p = await ctx.newPage(); await p.setViewportSize({ width: 380, height: 584 }); const e4 = []; p.on("pageerror", (e) => e4.push(String(e)));
  await p.goto(`${BASE}/popup.html?scene=bank&ui=en&tab=yt&key=1`); await wait(900);
  await p.locator("#tabs [data-tab=words]").click(); await wait(500);
  const row = (w) => p.locator(".wl li").filter({ has: p.locator("b", { hasText: new RegExp("^" + w + "$") }) });
  const nt = async (w) => (await row(w).locator(".nt").innerText()).trim();
  const calls = () => p.evaluate(() => window.__acct.calls);
  const dev = (w) => p.evaluate((w) => new Promise((r) => chrome.storage.local.get("bank", (x) => r(((x.bank || {})["es>en"] || []).find((i) => i.w === w)))), w);
  const goWords = async () => { await p.locator("#tabs [data-tab=watch]").click(); await p.locator("#tabs [data-tab=words]").click(); await wait(400); };
  ok((await nt("amor")) === "sunucudaki not" && (await nt("mundo")) === "başka cihazdan gelen", "HESAPLI popup: sunucudaki notlar kelimelerde görünür");
  const got = (await calls()).filter((c) => c.path === "/api/notes");
  ok(got.length === 1 && got[0].auth === "Bearer test-key-not-real", "HESAPLI popup: notlar /api/notes ile Bearer anahtarıyla alındı");
  ok((await nt("propio")) === "+ Note", "HESAPLI popup: notu olmayan kelimede '+ Note' (artık düzenlenebilir)");
  await p.evaluate(() => new Promise((r) => chrome.storage.local.get("bank", (x) => { const b = x.bank; b["es>en"].find((i) => i.w === "feliz").n = "yalnızca cihazda"; chrome.storage.local.set({ bank: b }, r); })));
  await goWords();
  ok((await nt("feliz")) === "yalnızca cihazda", "HESAPLI popup: yalnızca cihazdaki not da (birleşik) görünür");
  await p.screenshot({ path: join(OUT, "not-popup-hesapli.png") });
  await row("propio").locator("button.nt").click(); await p.locator(".nt-in").fill("  yeni    not "); await p.locator(".nt-in").press("Enter"); await wait(500);
  const post = (await calls()).filter((c) => c.path === "/api/note");
  ok(post.length === 1 && post[0].method === "POST" && post[0].auth === "Bearer test-key-not-real" && JSON.stringify(post[0].body) === JSON.stringify({ src: "es", dst: "en", word: "propio", note: "yeni not" }), "HESAPLI popup: kayıt sunucuya gitti: " + JSON.stringify(post[0] && post[0].body));
  ok((await dev("propio")).n === "yeni not" && (await nt("propio")) === "yeni not", "HESAPLI popup: aynı not cihazdaki kelimeye de yazıldı ve listede görünüyor");
  await row("amor").locator("button.nt").click(); await p.locator(".nt-in").fill("amor güncel"); await p.locator(".nt-in").press("Enter"); await wait(500);
  ok((await nt("amor")) === "amor güncel" && (await dev("amor")).n === "amor güncel" && (await p.evaluate(() => window.__acct.notes["es>en"].amor)) === "amor güncel", "HESAPLI popup: sunucudaki not düzenlenince hem sunucu hem cihaz güncellendi");
  await row("mundo").locator("button.nt").click(); await p.locator(".nt-in").fill(""); await p.locator(".nt-in").press("Enter"); await wait(500);
  ok((await nt("mundo")) === "+ Note" && !("n" in (await dev("mundo"))) && !(await p.evaluate(() => "mundo" in window.__acct.notes["es>en"])), "HESAPLI popup: boş kayıt notu hem sunucudan hem cihazdan siler");
  await goWords();
  ok((await nt("propio")) === "yeni not" && (await nt("mundo")) === "+ Note", "HESAPLI popup: sekme değişince sunucudan gelenle aynı (kalıcı)");
  await p.evaluate(() => { window.__acct.failNote = 500; });
  await row("importante").locator("button.nt").click(); await p.locator(".nt-in").fill("kaydolmamalı"); await p.locator(".nt-in").press("Enter"); await wait(500);
  ok((await nt("importante")) === "+ Note" && !("n" in (await dev("importante"))) && (await p.locator("#toast").isVisible()), "HESAPLI popup: sunucu hata verirse hiçbir yere yazılmaz ve hata gösterilir");
  await p.evaluate(() => { window.__acct.failNote = 404; });   // sunucu henüz güncel değil: yalnızca cihaza yazılır
  await row("pregunta").locator("button.nt").click(); await p.locator(".nt-in").fill("yalnız cihaz"); await p.locator(".nt-in").press("Enter"); await wait(500);
  ok((await nt("pregunta")) === "yalnız cihaz" && (await dev("pregunta")).n === "yalnız cihaz", "HESAPLI popup: sunucuda uç yoksa (404) not yine cihazda kalır");
  ok(e4.length === 0, "hesaplı popup sayfa hatası yok" + (e4.length ? ": " + e4.join(" | ") : ""));
  await p.close();

  // ---- yerel pratik: not cevaptan SONRA görünür, sorudan önce değil
  p = await ctx.newPage(); await p.setViewportSize({ width: 380, height: 584 }); const e5 = []; p.on("pageerror", (e) => e5.push(String(e)));
  await p.goto(`${BASE}/popup.html?scene=bank&ui=en&tab=yt`); await wait(600);
  await p.evaluate(() => new Promise((r) => chrome.storage.local.get("bank", (x) => { const b = x.bank; b["es>en"].forEach((i) => { i.n = "not: " + i.w; }); chrome.storage.local.set({ bank: b }, r); })));
  await p.locator("#tabs [data-tab=practice]").click(); await wait(500);
  await p.locator("#v-practice button.btn.p").click(); await wait(400);
  const qw = (await p.locator(".qw").innerText()).trim();
  ok(qw.length > 0 && (await p.locator(".pn").count()) === 0 && !(await p.locator("#v-practice").innerText()).includes("not: "), "PRATİK: soru ekranında not yok (ipucu olmasın): " + qw);
  const right = await p.evaluate((w) => new Promise((r) => chrome.storage.local.get("bank", (x) => r(x.bank["es>en"].find((i) => i.w === w).t))), qw);
  await p.locator(".ans", { hasText: new RegExp("^" + right + "$") }).click(); await wait(300);
  ok((await p.locator(".fb-ok").count()) === 1 && (await p.locator(".pn-t").innerText()) === "not: " + qw && (await p.locator(".pn-l").textContent()) === "Your note", "PRATİK: DOĞRU cevaptan sonra etiket + not görünür");
  await wait(1700);
  ok((await p.locator(".pn").count()) === 1 && (await p.locator("#v-practice button.btn.p").count()) === 1, "PRATİK: notu olan kelimede kendiliğinden geçilmez, 'Devam' düğmesi var");
  await p.screenshot({ path: join(OUT, "not-pratik-dogru.png") });
  await p.locator("#v-practice button.btn.p").click(); await wait(400);
  const qw2 = (await p.locator(".qw").innerText()).trim();
  ok((await p.locator(".pn").count()) === 0, "PRATİK: sonraki soruda önceki kelimenin notu kalmadı: " + qw2);
  const right2 = await p.evaluate((w) => new Promise((r) => chrome.storage.local.get("bank", (x) => r(x.bank["es>en"].find((i) => i.w === w).t))), qw2);
  await p.locator(".ans").filter({ hasNotText: new RegExp("^" + right2 + "$") }).first().click(); await wait(300);
  ok((await p.locator(".fb-is").count()) === 1 && (await p.locator(".pn-t").innerText()) === "not: " + qw2, "PRATİK: YANLIŞ cevaptan sonra da not görünür");
  await p.screenshot({ path: join(OUT, "not-pratik-yanlis.png") });
  await p.locator("#v-practice button.btn.p").click(); await wait(300);
  // notu olmayan kelime: satır çıkmaz, doğru cevapta eskisi gibi kendiliğinden geçer (not yok: yeni oturum)
  await p.goto(`${BASE}/popup.html?scene=bank&ui=en&tab=yt`); await wait(600);
  await p.locator("#tabs [data-tab=practice]").click(); await wait(500);
  await p.locator("#v-practice button.btn.p").click(); await wait(400);
  const qw3 = (await p.locator(".qw").innerText()).trim();
  const right3 = await p.evaluate((w) => new Promise((r) => chrome.storage.local.get("bank", (x) => r(x.bank["es>en"].find((i) => i.w === w).t))), qw3);
  await p.locator(".ans", { hasText: new RegExp("^" + right3 + "$") }).click(); await wait(250);
  ok((await p.locator(".pn").count()) === 0, "PRATİK: notu olmayan kelimede not satırı çıkmaz");
  await wait(1200);
  ok((await p.locator(".fb-ok").count()) === 0 && (await p.locator(".qw").innerText()).trim() !== qw3, "PRATİK: notu olmayan kelimede doğru cevap kendiliğinden geçer (eski davranış)");
  ok(e5.length === 0, "pratik sayfa hatası yok" + (e5.length ? ": " + e5.join(" | ") : ""));
  await p.close();
} finally { await b.close(); srv.kill(); }
console.log(problems.length ? "SORUN:\n" + problems.join("\n") : "hepsi geçti");
process.exit(problems.length ? 1 : 0);
