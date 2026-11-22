// Site davranış denetimi (dev/site-harness/serve.py açıkken): yedi adres, kelime işlemleri, düello mesajı (ESKİ ile YENİ aynı mı),
// ayarlar, tema, dil, çıkış, konsol hataları. Çıktı: ✔/✖ satırları; hata varsa 1 ile çıkar.
//   cd dev && node site-harness/check.mjs [--port 8810]
import { chromium } from "playwright";

const args = process.argv.slice(2);
const PORT = args[args.indexOf("--port") + 1] || "8810";
const BASE = `http://127.0.0.1:${PORT}`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const ok = (c, m) => { console.log((c ? "  ✔ " : "  ✖ HATA: ") + m); if (!c) fails++; };
const scene = (n) => fetch(`${BASE}/__scene?name=${n}`);

const browser = await chromium.launch();
const errs = [];
async function newPage(opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1280, height: 800 }, serviceWorkers: "block", locale: "tr-TR" });
  await ctx.addInitScript(() => { try { if (!localStorage.getItem("cv-lang")) localStorage.setItem("cv-lang", "tr"); localStorage.setItem("cv-pair", "es:en"); } catch (e) {} });
  await ctx.route(/fonts\.googleapis|fonts\.gstatic|tvmaze|accounts\.google/, (r) => r.abort());
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/fonts\.|tvmaze|google/.test(m.location().url || "")) errs.push("console.error: " + m.text()); });
  return { ctx, page };
}
// game.html için sahte WebSocket: istemcinin sunucuya gönderdiği ilk ileti window.__sent[0] içinde kalır
const FAKE_WS = `(() => { window.WebSocket = class { constructor() { this.readyState = 1; setTimeout(() => this.onopen && this.onopen(), 10); }
  send(d) { const m = JSON.parse(d); window.__sent = (window.__sent || []).concat([m]);
    if (m.t === "create" || m.t === "join") { setTimeout(() => this.onmessage({ data: JSON.stringify({ t: "me", id: "me1" }) }), 10);
      setTimeout(() => this.onmessage({ data: JSON.stringify({ t: "room", code: "4821", episode: m.episode || "", host: "me1", src: "es", dst: "en", n: m.n || 10, seconds: m.seconds || 12, locked: !!m.password, mode: m.mode || "choice", learn: "src", screen: !!m.screen, players: [{ id: "me1", name: "yakup_demo", score: 0 }] }) }), 30); } }
  close() {} }; })();`;

// ------------------------------------------------------------------ 1) yedi adres
console.log("1) Adresler (#words #videos #known #practice #duel #leagues #settings)");
await scene("full");
{
  const { ctx, page } = await newPage();
  const want = { words: "Kelimeler", videos: "Videolar", known: "Bildiklerim", practice: "Pratik", duel: "Düello", leagues: "Arkadaş ligleri", settings: "yakup_demo" };
  for (const [h, title] of Object.entries(want)) {
    await page.goto(`${BASE}/account#${h}`); await page.waitForSelector(".layout");
    await page.waitForFunction((t) => { const e = document.querySelector("h1"); return e && e.textContent.includes(t); }, title, { timeout: 4000 }).catch(() => {});
    const h1 = await page.locator("h1").first().textContent();
    ok(h1.includes(title), `#${h} -> başlık "${h1}"`);
    const navOn = await page.locator(".nav button.on").count();
    ok(navOn === 1, `#${h} -> sol menüde tek etkin öğe`);
  }
  // sayfa açıkken adres değişirse (ör. eklenti ya da dış bağlantı) sekme değişir
  await page.goto(`${BASE}/account#words`); await page.waitForSelector(".layout");
  await page.evaluate(() => { location.hash = "#settings"; }); await wait(300);
  ok((await page.locator("h1").first().textContent()).includes("yakup_demo"), "hashchange -> Ben sekmesi");
  // gezinirken adres güncellenir
  await page.locator(".nav button", { hasText: "Düello" }).click(); await wait(200);
  ok(await page.evaluate(() => location.hash) === "#duel", "menüden gezinince adres #duel olur");
  await page.locator(".subtabs button", { hasText: "Ligler" }).click(); await wait(300);
  ok(await page.evaluate(() => location.hash) === "#leagues", "alt sekme (Ligler) adresi #leagues");
  await ctx.close();
}

// ------------------------------------------------------------------ 2) kelime işlemleri
console.log("2) Kelimeler: arama, süzgeç, seçme, bildim, silme");
await scene("full");
{
  const { ctx, page } = await newPage();
  await page.goto(`${BASE}/account#words`); await page.waitForSelector("button.w");
  const n0 = await page.locator("button.w").count();
  ok(n0 === 40, `40 kelime kartı (${n0})`);
  await page.locator('input[type=search]').fill("ver"); await wait(150);
  const nSearch = await page.locator("button.w").count();
  ok(nSearch > 0 && nSearch < 40, `arama süzer (${nSearch})`);
  await page.locator('input[type=search]').fill(""); await wait(100);
  await page.locator(".toolbar select").selectOption({ label: "YouTube · Easy Spanish 344 · 9" }); await wait(150);
  ok((await page.locator("button.w").count()) === 9, "video süzgeci (9 kelime satırı)");
  await page.locator(".toolbar select").selectOption(""); await wait(100);
  await page.locator("button.w").nth(0).click(); await page.locator("button.w").nth(1).click();
  ok(await page.locator(".bulk").isVisible(), "seçince alt çubuk görünür");
  ok((await page.locator("button.w.sel").count()) === 2 && (await page.locator("button.w").first().getAttribute("aria-pressed")) === "true", "seçili kart aria-pressed");
  await page.locator(".bulk button", { hasText: "Bunları biliyorum" }).click(); await wait(400);
  ok((await page.locator("button.w").count()) === 38, "bildim: 38 kelime kaldı");
  await page.locator(".subtabs button", { hasText: "Bildiklerim" }).click(); await wait(300);
  ok((await page.locator("button.w").count()) === 5, "Bildiklerim: 5 kelime (3 + 2)");
  await page.locator("button.w").nth(0).click();
  await page.locator(".bulk button", { hasText: "Öğrenme listesine geri al" }).click(); await wait(400);
  ok((await page.locator("button.w").count()) === 4, "geri taşıma: 4 bildik kaldı");
  await page.locator(".subtabs button", { hasText: "Kelimeler" }).click(); await wait(300);
  await page.locator("button.w").nth(2).click();
  await page.locator(".bulk button.danger").click(); await wait(200);
  ok(await page.locator(".modal").isVisible(), "silmeden önce onay penceresi");
  await page.locator(".modal button.danger").click(); await wait(400);
  ok((await page.locator("button.w").count()) === 38, "silindi: 38 kelime");
  // Pratik düğmesi
  await page.locator(".head button.primary", { hasText: "Pratik" }).click(); await wait(300);
  ok(await page.evaluate(() => location.hash) === "#practice", "başlıktaki tek ana eylem Pratik'e götürür");
  await ctx.close();
}

// ------------------------------------------------------------------ 3) videolar -> kelimeler / düello
console.log("3) Videolar");
await scene("full");
{
  const { ctx, page } = await newPage();
  await page.goto(`${BASE}/account#videos`); await page.waitForSelector(".vc");
  ok((await page.locator(".vc").count()) === 5, "5 video kartı");
  await page.locator(".vc", { hasText: "Easy Spanish 344" }).getByRole("button", { name: "Düello" }).click(); await wait(300);
  const sum = await page.locator(".startrow .sum").textContent();
  ok(/Easy Spanish 344/.test(sum), `Videodan Düello: kaynak özetinde video var ("${sum}")`);
  await page.goto(`${BASE}/account#videos`); await page.waitForSelector(".vc");
  await page.locator(".vc", { hasText: "Easy Spanish 344" }).getByRole("button", { name: "Kelimeler" }).click(); await wait(300);
  ok((await page.locator("button.w").count()) === 9, "Videodan Kelimeler: süzülmüş liste (9)");
  await page.goto(`${BASE}/account#videos`); await page.waitForSelector(".vc");
  await page.locator(".vc", { hasText: "Easy Spanish 344" }).locator("input.pick").check(); await wait(150);
  ok(await page.locator(".bulk").isVisible(), "video seçince alt çubuk");
  await page.locator(".bulk button.danger").click(); await page.locator(".modal button.danger").click(); await wait(400);
  ok((await page.locator(".vc").count()) === 4, "video silindi (4 kaldı)");
  await ctx.close();
}

// ------------------------------------------------------------------ 4) düello iletileri: ESKİ ile YENİ
console.log("4) Düello iletisi (sessionStorage cv-duel -> WebSocket ilk ileti): eski ve yeni karşılaştırması");
async function capture(page, clickFn) {
  await page.addInitScript(FAKE_WS);
  await clickFn();
  await page.waitForURL(/\/game/, { timeout: 5000 });
  await page.waitForFunction(() => window.__sent && window.__sent.length, null, { timeout: 5000 });
  const sent = await page.evaluate(() => window.__sent[0]);
  await page.waitForSelector(".roomcode", { timeout: 3000 }).catch(() => {});
  const lobby = await page.locator(".roomcode").count();
  return { json: JSON.stringify(sent), lobby };
}
const results = {};
for (const ver of ["old", "new"]) {
  const url = ver === "old" ? `${BASE}/__old/account#duel` : `${BASE}/account#duel`;
  const cases = {
    quick: async (page) => { // eski: "Hızlı oda kur"; yeni: varsayılan "Düello başlat"
      if (ver === "old") await page.getByRole("button", { name: /Hızlı oda kur/ }).click(); else await page.getByRole("button", { name: "Düello başlat" }).click(); },
    custom: async (page) => { // 7 soru, 20 sn, şifre "abc", konuşma modu, tek video
      if (ver === "old") {
        await page.locator("summary", { hasText: "Oda ayarları" }).click();
        const c = page.locator(".card", { has: page.locator("h2", { hasText: /^Oda kur$/ }) });
        await c.locator("select").nth(0).selectOption({ label: "YouTube · Easy Spanish 344 · 9" });
        await c.locator("select").nth(1).selectOption("speak");
        await c.locator("input[type=number]").nth(0).fill("7"); await c.locator("input[type=number]").nth(1).fill("20");
        await c.locator("input[placeholder^='Boş bırakırsan']").fill("abc");
        await c.getByRole("button", { name: "Oda kur" }).click();
      } else {
        await page.getByRole("button", { name: "Düzenle" }).click();
        await page.locator("#duel-panel select").selectOption({ label: "YouTube · Easy Spanish 344 · 9" });
        await page.locator("#duel-panel .modepick button").nth(1).click();
        await page.locator("#duel-panel input[type=number]").nth(0).fill("7"); await page.locator("#duel-panel input[type=number]").nth(1).fill("20");
        await page.locator("#duel-panel input[placeholder^='Boş bırakırsan']").fill("abc");
        await page.getByRole("button", { name: "Düello başlat" }).click();
      } },
    screen: async (page) => { // büyük ekran modu
      if (ver === "old") {
        await page.locator("summary", { hasText: "Oda ayarları" }).click();
        const c = page.locator(".card", { has: page.locator("h2", { hasText: /^Oda kur$/ }) });
        await c.locator("select").nth(1).selectOption("screen"); await c.getByRole("button", { name: "Oda kur" }).click();
      } else {
        await page.getByRole("button", { name: "Düzenle" }).click(); await page.locator("#duel-panel .modepick button").nth(2).click();
        await page.getByRole("button", { name: "Düello başlat" }).click();
      } },
    join: async (page) => { // kodla katıl + şifre
      if (ver === "old") {
        await page.locator("summary", { hasText: "Oda ayarları" }).click();
        const c = page.locator(".card", { has: page.locator("h2", { hasText: /^Odaya katıl$/ }) });
        await c.locator("input").nth(0).fill("4821"); await c.locator("input").nth(1).fill("x"); await c.getByRole("button", { name: "Katıl" }).click();
      } else {
        await page.locator(".codein").fill("4821"); await page.locator(".joinrow input").nth(1).fill("x"); await page.getByRole("button", { name: "Katıl", exact: true }).click();
      } },
    joinQuick: async (page) => { // eski hızlı katılma (şifresiz)
      if (ver === "old") { await page.locator("input[placeholder='0000']").first().fill("1234"); await page.getByRole("button", { name: "Katıl" }).first().click(); }
      else { await page.locator(".codein").fill("1234"); await page.getByRole("button", { name: "Katıl", exact: true }).click(); }
    },
  };
  for (const [name, fn] of Object.entries(cases)) {
    await scene("full");
    const { ctx, page } = await newPage();
    await page.goto(url); await page.waitForSelector(ver === "old" ? "details.gmore" : ".duo");
    try { results[`${ver}:${name}`] = await capture(page, () => fn(page)); }
    catch (e) { results[`${ver}:${name}`] = { json: "HATA " + e.message.split("\n")[0], lobby: 0 }; }
    await ctx.close();
  }
}
for (const name of ["quick", "custom", "screen", "join", "joinQuick"]) {
  const o = results[`old:${name}`], n = results[`new:${name}`];
  console.log(`     ${name.padEnd(9)} eski: ${o.json}\n     ${"".padEnd(9)} yeni: ${n.json}`);
  ok(o.json === n.json && !o.json.startsWith("HATA"), `${name}: ileti birebir aynı`);
  ok(n.lobby === 1, `${name}: oda bekleme ekranı açıldı (büyük kod)`);
}

// ------------------------------------------------------------------ 5) düello paneli
console.log("5) Düello paneli");
await scene("full");
{
  const { ctx, page } = await newPage();
  await page.goto(`${BASE}/account#duel`); await page.waitForSelector(".duo");
  const sum0 = await page.locator(".startrow .sum").textContent();
  ok(sum0 === "10 soru · 12 sn · Çoktan seçmeli · Tüm kelimeler", `varsayılan özet: "${sum0}"`);
  const btn = page.getByRole("button", { name: "Düzenle" });
  ok((await btn.getAttribute("aria-expanded")) === "false" && !(await page.locator("#duel-panel").isVisible()), "panel kapalı başlar");
  await btn.click();
  ok((await btn.getAttribute("aria-expanded")) === "true" && (await page.locator("#duel-panel").isVisible()), "Düzenle paneli açar");
  await page.locator("#duel-panel input[type=number]").nth(0).fill("15");
  await page.locator("#duel-panel .modepick button").nth(2).click();
  const sum1 = await page.locator(".startrow .sum").textContent();
  ok(sum1 === "15 soru · 12 sn · Büyük ekran (sınıf / grup) · Tüm kelimeler", `özet canlı güncellenir: "${sum1}"`);
  await page.getByRole("button", { name: "Tamam" }).click();
  ok(!(await page.locator("#duel-panel").isVisible()), "Tamam paneli kapatır");
  await page.getByRole("button", { name: "Düzenle" }).click(); await page.getByRole("button", { name: "Varsayılana dön" }).click(); await wait(200);
  ok((await page.locator(".startrow .sum").textContent()) === sum0, "Varsayılana dön özeti sıfırlar");
  await page.locator(".codein").pressSequentially("12ab34x"); ok((await page.locator(".codein").inputValue()) === "1234", "kod girişi yalnızca 4 rakam alır");
  ok((await page.locator(".codein").count()) === 1, "kod girişi sayfada tek (yinelenme yok)");
  await page.locator(".codein").fill("12"); await page.getByRole("button", { name: "Katıl", exact: true }).click(); await wait(200);
  ok(await page.locator(".toast").isVisible(), "eksik kodla uyarı verir");
  await ctx.close();
}

// ------------------------------------------------------------------ 6) ayarlar, tema, dil, çıkış
console.log("6) Ben / Ayarlar");
await scene("full");
{
  const { ctx, page } = await newPage();
  await page.goto(`${BASE}/account#settings`); await page.waitForSelector(".sgroup");
  const heads = await page.locator(".sgroup > header h2").allTextContents();
  ok(heads.join("|") === "Hesap|Dil ve tema|Çalışma|Tarayıcı eklentisi|Paylaşım ve davet|Güvenlik|Tehlikeli bölge", `yedi ayar grubu görünür: ${heads.join(", ")}`);
  ok((await page.locator("details").count()) === 0, "gizli <details> kalmadı");
  ok((await page.locator(".jump a").count()) === 7, "bölüm dizini: 7 bağlantı");
  await page.locator(".jump a", { hasText: "Güvenlik" }).click(); await wait(500);
  const y = await page.evaluate(() => document.getElementById("sg-security").getBoundingClientRect().top);
  ok(y >= 0 && y < 700, `dizin bağlantısı bölümü görünür alana kaydırır (üst=${Math.round(y)}px)`);
  await page.locator(".seg button", { hasText: "Açık" }).click();
  ok((await page.evaluate(() => document.documentElement.dataset.theme)) === "light", "tema seçici: açık");
  ok((await page.evaluate(() => localStorage.getItem("cv-theme"))) === "light", "tema localStorage'a yazıldı");
  await page.locator("#tools button").last().click();
  ok((await page.evaluate(() => document.documentElement.dataset.theme)) === "dark", "üst çubuk tema düğmesi de çalışır");
  await page.locator(".srow", { hasText: "Site dili" }).locator("select").selectOption("en"); await wait(300);
  ok((await page.locator(".nav button").first().textContent()).includes("Words"), "site dili İngilizceye döndü");
  await page.locator(".srow", { hasText: "Site language" }).locator("select").selectOption("tr"); await wait(300);
  // profil kaydet
  await page.locator(".sgroup#sg-account input").first().fill("yeni_ad"); await page.getByRole("button", { name: "Kaydet" }).click(); await wait(300);
  ok((await page.locator("h1").first().textContent()) === "yeni_ad", "profil kaydedildi, ad güncellendi");
  // ses anahtarı
  const sw = page.getByRole("switch", { name: "Oyun sesleri" });
  const before = await sw.getAttribute("aria-checked"); await sw.click();
  ok((await sw.getAttribute("aria-checked")) !== before, "oyun sesleri anahtarı çalışır");
  // herkese açık profil
  const pub = page.getByRole("switch", { name: "Herkese açık profil" });
  await pub.click(); await wait(300);
  ok((await pub.getAttribute("aria-checked")) === "true" && (await page.locator("a", { hasText: "Profilimi aç" }).isVisible()), "herkese açık profil anahtarı + bağlantı");
  // eklenti anahtarı
  await page.getByRole("button", { name: "Anahtar oluştur" }).click(); await wait(300);
  ok((await page.locator(".keybox").textContent()).startsWith("cvk_"), "eklenti anahtarı üretildi");
  // kurtarma kodu
  await page.getByRole("button", { name: "Yeni kurtarma kodu oluştur" }).click(); await wait(200);
  ok(await page.locator(".modal").isVisible(), "kurtarma kodu için parola penceresi");
  await page.locator(".modal input").fill("x"); await page.locator(".modal button.primary").click(); await wait(300);
  ok(await page.locator(".modal .rec").isVisible(), "yeni kurtarma kodu gösterildi");
  await page.locator(".modal button.primary").click();
  // hesap silme penceresi
  await page.locator(".sgroup.danger button.danger").click(); await wait(200);
  ok(await page.locator(".modal input[type=password]").isVisible(), "hesap silme: parola penceresi");
  await page.locator(".modal button", { hasText: "Vazgeç" }).click();
  // çıkış
  await page.locator("#sg-account .srow", { hasText: "Bu tarayıcıdaki oturumu kapat" }).getByRole("button").click(); await wait(400);
  ok(await page.locator(".auth").isVisible(), "çıkış: giriş ekranı");
  await ctx.close();
}

// ------------------------------------------------------------------ 7) ligler
console.log("7) Ligler");
await scene("full");
{
  const { ctx, page } = await newPage();
  await page.goto(`${BASE}/account#leagues`); await page.waitForSelector(".leagues-head");
  ok((await page.locator(".leagues-head").count()) === 2, "2 lig kartı");
  await page.locator(".leagues-head").first().click(); await wait(400);
  ok(await page.locator(".players li.me").count() === 1 && (await page.locator("input[readonly]").inputValue()).includes("/join/K7M2QX"), "lig açıldı: sıralama + davet bağlantısı");
  ok((await page.locator(".crown").count()) === 1, "lider için taç simgesi (emoji değil, SVG)");
  await ctx.close();
}

// ------------------------------------------------------------------ 8) pratik
console.log("8) Pratik");
await scene("full");
{
  const { ctx, page } = await newPage();
  await page.goto(`${BASE}/account#practice`); await page.waitForSelector(".go-btn");
  const d = page.locator(".disc button.dtog").first();
  ok((await d.getAttribute("aria-expanded")) === "false", "seçenekler görünür bir düğmeyle kapalı, özetli");
  ok((await page.locator(".disc .dt span").first().textContent()) === "Klasik · 10 soru · Tüm kelimeler", "seçenek özeti tek satır");
  await d.click(); await page.locator(".mode").nth(1).click(); await wait(100);
  ok((await page.locator(".disc .dt span").first().textContent()).startsWith("Hız modu"), "seçenek özeti canlı");
  await page.locator(".go-btn").first().click(); await page.waitForSelector(".qcard .opts button");
  ok((await page.locator(".qcard .opts button").count()) === 4, "quiz: 4 şık");
  await page.locator(".qcard .opts button").first().click(); await wait(300);
  ok((await page.locator(".qcard .opts button.ok").count()) === 1, "quiz: doğru şık işaretlenir");
  await ctx.close();
}

// ------------------------------------------------------------------ 9) boş hesap ve giriş ekranı
console.log("9) Boş hesap, giriş");
await scene("empty");
{
  const { ctx, page } = await newPage();
  await page.goto(`${BASE}/account#words`); await page.waitForSelector(".guide");
  ok(await page.locator(".guide").isVisible() && (await page.locator(".head button.primary").count()) === 0, "boş liste: başlangıç rehberi, Pratik düğmesi yok");
  await page.locator(".disc button.dtog").first().click(); await wait(100);
  ok(await page.locator(".disc .dbody").first().isVisible(), "rehber: 'Zaten kurdun mu?' görünür düğmeyle açılır");
  await page.goto(`${BASE}/account#duel`); await page.waitForSelector(".duo");
  ok(await page.locator(".startrow .go").isDisabled(), "kelime yokken Düello başlat devre dışı");
  await ctx.close();
}
await scene("loggedout");
{
  const { ctx, page } = await newPage();
  await page.goto(`${BASE}/account`); await page.waitForSelector(".auth");
  await page.locator(".auth input").first().fill("yakup_demo"); await page.locator(".auth .pw input").first().fill("secret1");
  await page.locator(".auth button.primary").click(); await page.waitForSelector(".layout", { timeout: 4000 });
  ok(true, "giriş yapınca panel açılır");
  await ctx.close();
}
await scene("full");

await browser.close();
const bad = errs.filter((e) => !/Failed to load resource.*(401)/.test(e));
console.log(bad.length ? "\nKONSOL/SAYFA HATALARI:\n" + bad.join("\n") : "\nkonsol/sayfa hatası yok");
console.log(fails || bad.length ? `\n${fails} denetim başarısız` : "\nTüm denetimler geçti");
process.exitCode = fails || bad.length ? 1 : 0;
