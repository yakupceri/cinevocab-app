// Yönetim paneli (templates/admin.html) hesapları: niceMax, fmt/fmtShort/pct, countryRows, "Hesapsız çeviri isteği"
// penceresi ve trendChart geometrisi. HTML'in <script> bloğu OLDUĞU GİBİ sahte bir DOM ile çalıştırılır; kopya mantık yok,
// html değişirse test de yeni kodu sınar. Ağ yok (fetch sahtesi hep reddeder), sunucu yok, dosya yazmaz.
//
// Gün sınırı notu: panel sayaçları İstanbul gününe göre (admin.py TR_TODAY); kullanıcı SRS/seri günü ise UTC (srs.today).
// İki sınır 21:00-24:00 UTC arasında farklı güne düşer; bu dosyadaki testler yalnızca panelin kendi (İstanbul) gününü sınar.
//
// `todo` işaretli testler BİLİNEN BULGU (xfail): şimdi başarısız olur ama takımı kırmaz; kod düzelince geçer, `todo` kaldırılır.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const HTML = fs.readFileSync(path.resolve(__dirname, "../../../templates/admin.html"), "utf8");
const SCRIPT = [...HTML.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((s) => s.includes("function niceMax"));
assert.ok(SCRIPT, "admin.html içinde niceMax içeren <script> bulunamadı");

// ---------------------------------------------------------------- sahte DOM + betiği yükleme
class El {
  constructor(tag, env) {
    this.tagName = tag; this.attrs = {}; this.children = []; this.listeners = {}; this.parent = null; this.nodeType = 1; this._text = "";
    this.className = ""; this.style = {}; this.dataset = {}; this.clientWidth = env.width; this.offsetWidth = 160;
    this.classList = { add() {}, remove() {}, toggle() {}, contains() { return false; } };
  }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k]; }
  removeAttribute(k) { delete this.attrs[k]; }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  append(...c) { c.forEach((x) => { if (x && typeof x === "object") x.parent = this; }); this.children.push(...c); }
  prepend(...c) { c.forEach((x) => { if (x && typeof x === "object") x.parent = this; }); this.children.unshift(...c); }
  replaceWith(e) { const i = this.parent.children.indexOf(this); e.parent = this.parent; this.parent.children[i] = e; }
  querySelectorAll() { return []; }
  getBoundingClientRect() { return { left: 0, top: 0 }; }
  set textContent(v) { this._text = String(v); this.children = []; }
  get textContent() { return this._text + this.children.map((c) => c.textContent ?? "").join(""); }
}

function loadPanel() {
  const env = { width: 640, fetchCalls: [] }, byId = {};
  const document = {
    getElementById: (id) => (byId[id] ||= new El("div", env)),
    createElement: (t) => new El(t, env),
    createElementNS: (ns, t) => new El(t, env),
    createTextNode: (t) => ({ nodeType: 3, textContent: String(t) }),
    querySelectorAll: () => [],
    addEventListener() {}, removeEventListener() {},
    body: new El("body", env),
  };
  const sandbox = {
    document, window: { addEventListener() {}, removeEventListener() {} }, requestAnimationFrame: (f) => f(), setInterval: () => 0, setTimeout: () => 0, clearTimeout() {},
    fetch: (...a) => { env.fetchCalls.push(a); return Promise.reject(new Error("ağ yok (test)")); },   // ağa HİÇ çıkılmaz
    sessionStorage: { getItem: () => null, setItem() {} },
  };
  vm.createContext(sandbox);
  vm.runInContext(SCRIPT, sandbox, { filename: "admin.html<script>" });
  const fns = vm.runInContext("({ niceMax, fmtShort, fmt, pct, countryRows, trendChart, langName, countryLabel, isCountry })", sandbox);
  return { ...fns, env };
}
const P = loadPanel();
const plain = (x) => JSON.parse(JSON.stringify(x));      // vm bölgesinden gelen nesneleri deepEqual için sadeleştir

// "1,5 B" -> 1500, "2,5" -> 2.5 (eksen etiketini sayıya geri çevirir)
const parseShort = (s) => (s.endsWith(" B") ? parseFloat(s.slice(0, -2).replace(",", ".")) * 1000 : parseFloat(s.replace(",", ".")));

// kaynaktan ifade alır: startIdx'ten, ilk üst düzey virgül ya da kapanmamış parantezde durur
function exprFrom(src, startIdx) {
  let depth = 0, j = startIdx;
  for (; j < src.length; j++) {
    const ch = src[j];
    if ("([{".includes(ch)) depth++;
    else if (")]}".includes(ch)) { if (!depth) break; depth--; }
    else if (ch === "," && !depth) break;
  }
  return src.slice(startIdx, j).trim();
}
function exprAfter(marker) {
  const i = HTML.indexOf(marker);
  assert.ok(i >= 0, `admin.html değişmiş, testi güncelle: "${marker}" bulunamadı`);
  return exprFrom(HTML, i + marker.length);
}

// ================================================================ 1. niceMax
test("niceMax: v=0..1.000.000 her tamsayıda sonuç >= v ve (v>=4 için) 2v'den küçük", () => {
  let worst = { r: 0, v: 0 };
  for (let v = 0; v <= 1_000_000; v++) {
    const m = P.niceMax(v);
    if (!(m >= v)) assert.fail(`niceMax(${v}) = ${m} < ${v}`);
    if (v >= 4) {
      if (!(m < 2 * v)) assert.fail(`niceMax(${v}) = ${m}: %100'den fazla şişti`);
      if (m / v > worst.r) worst = { r: m / v, v };
    }
  }
  assert.ok(worst.r < 2, `en kötü oran ${worst.r} (v=${worst.v})`);
});

test("niceMax: eksen adımı (sonuç/4) hep TAMSAYI ve 'güzel' (d x 10^k, d in 1,2,3,4,5,6,8); etiketler tekrarsız, artan, doğru yazılıyor", () => {
  const nice = new Set([1, 2, 3, 4, 5, 6, 8]);
  for (let v = 0; v <= 1_000_000; v++) {
    const step = P.niceMax(v) / 4;
    if (!Number.isInteger(step)) assert.fail(`v=${v}: adım ${step} tamsayı değil (eksende ondalık)`);
    const p = Math.pow(10, Math.floor(Math.log10(step))), d = step / p;
    if (!nice.has(Math.round(d * 1e9) / 1e9)) assert.fail(`v=${v}: adım ${step} güzel sayı değil (d=${d})`);
  }
  for (let v = 4; v <= 1_000_000; v += (v < 20000 ? 1 : 37)) {
    const step = P.niceMax(v) / 4;
    const labels = [0, 1, 2, 3, 4].map((k) => P.fmtShort(step * k));
    labels.forEach((l, k) => assert.ok(Math.abs(parseShort(l) - step * k) < 1e-6, `v=${v}: etiket "${l}" ≠ ${step * k}`));
    assert.equal(new Set(labels).size, 5, `v=${v}: tekrarlı etiket ${labels}`);
  }
});

test("niceMax: 10'un kuvvetlerinin sınırlarında (4*10^k, +1) float hatası yok, 1e15'e kadar", () => {
  for (let k = 0; k <= 15; k++) {
    const b = 4 * Math.pow(10, k);
    assert.equal(P.niceMax(b), b, `niceMax(${b})`);                   // tam sınırda şişmez
    assert.ok(P.niceMax(b + 1) >= b + 1 && P.niceMax(b + 1) < 2 * (b + 1), `niceMax(${b + 1}) = ${P.niceMax(b + 1)}`);
  }
});

test("niceMax: çağrı yerindeki kullanım (Math.max(4, tepe)) - tepe 0..3 iken eksen 4, hiçbir zaman 0/NaN değil", () => {
  for (const peak of [0, 1, 2, 3, 4]) assert.equal(P.niceMax(Math.max(4, peak)), 4);
  assert.equal(P.niceMax(0), 4);        // doğrudan çağrıda da 0'a bölme yok
});

test("niceMax: şişme sınırı - v>=4 için sonuç/v hangi v'de en büyük, hiç 2'ye varıyor mu (kaydı tutulur)", () => {
  let worst = { r: 0, v: 0 };
  for (let v = 4; v <= 1_000_000; v++) { const r = P.niceMax(v) / v; if (r > worst.r) worst = { r, v }; }
  assert.ok(worst.r < 2, `en kötü: niceMax(${worst.v}) = ${P.niceMax(worst.v)} (x${worst.r.toFixed(3)})`);
  assert.ok(worst.r > 1.9);             // 4*10^k + 1 civarı: en yüksek sütun grafiğin yarısında kalır (tasarım sınırı, hata değil)
});

// ================================================================ 2. fmt, fmtShort, pct
test("fmt: tr-TR ayraçları, boş değerler 0", () => {
  assert.equal(P.fmt(1234567), "1.234.567");
  assert.equal(P.fmt(1000), "1.000");
  assert.equal(P.fmt(0), "0");
  for (const v of [null, undefined, NaN, ""]) assert.equal(P.fmt(v), "0", String(v));
  assert.equal(P.fmt(1234.5), "1.234,5");
  assert.equal(P.fmt("12"), "12");
  assert.equal(P.fmt(-5), "-5");
});

test("fmtShort: eksen etiketleri (bin = B)", () => {
  const cases = [[0, "0"], [7, "7"], [2.5, "2,5"], [7.5, "7,5"], [999, "999"], [1000, "1 B"], [1500, "1,5 B"], [2500, "2,5 B"], [9500, "9,5 B"],
    [10000, "10 B"], [25000, "25 B"], [75000, "75 B"], [100000, "100 B"], [250000, "250 B"]];
  for (const [n, want] of cases) assert.equal(P.fmtShort(n), want, `fmtShort(${n})`);
});

test("BULGU (düşük, gizli): fmtShort(9999) '10,0 B' yazar; '10 B' olmalı (toFixed(1) 10.0'a yuvarlar, ',0' kırpılmaz)", () => {
    assert.equal(P.fmtShort(9999), "10 B");
    assert.equal(P.fmtShort(1951), "2 B");
  });

test("pct: sıfıra bölme 0, yuvarlama en yakın tam sayı (.5 yukarı)", () => {
  const cases = [[0, 0, 0], [5, 0, 0], [0, 5, 0], [1, 1, 100], [1, 2, 50], [1, 3, 33], [2, 3, 67], [1, 8, 13], [1, 200, 1], [1, 300, 0],
    [199, 200, 100], [995, 1000, 100], [3, 2, 150]];
  for (const [a, b, want] of cases) assert.equal(P.pct(a, b), want, `pct(${a},${b})`);
  assert.equal(P.pct(1, NaN), 0);
  assert.equal(P.pct(1, null), 0);
  assert.equal(P.pct(1, undefined), 0);
});

// ================================================================ 3. countryRows
const row = (country, site, ext, clicks) => ({ country, site, ext, clicks });
const tot = (r) => r.site + r.ext + r.clicks;
const MIXED = [row("TR", 10, 5, 5), row("US", 3, 2, 0), row("dil:tr", 4, 1, 0), row("dil:en", 2, 0, 1), row("?", 1, 0, 0)];

test("countryRows: bilinmeyenler (dil:tr, dil:en, ?) TEK satırda, bilinenler ayrı", () => {
  const r = plain(P.countryRows(MIXED));
  assert.equal(r.rows.length, 3);
  assert.equal(r.rows.filter((x) => x.label.includes("Ülke bilinmiyor")).length, 1);
  assert.deepEqual(r.rows.map((x) => x.total), [20, 5, 9]);          // TR, US, bilinmiyor (bilinmeyen satır hep sonda)
  assert.match(r.rows[0].label, /^🇹🇷 /);
  assert.match(r.rows[1].label, /^🇺🇸 /);
  assert.equal(r.rows[2].label, "🌐 Ülke bilinmiyor");
  const tr = P.langName("tr"), en = P.langName("en");
  assert.equal(tr, "Türkçe");
  assert.equal(r.rows[2].sub, `${tr} 5 · ${en} 3 · dil bilgisi yok 1`);   // dillere göre döküm, çoktan aza
});

test("countryRows: bilinen + bilinmeyen = toplam = girdi toplamı = satır toplamı", () => {
  for (const list of [MIXED, MIXED.slice(0, 2), MIXED.slice(2), [row("DE", 1, 0, 0)], [row("?", 0, 0, 7)]]) {
    const r = plain(P.countryRows(list)), want = list.reduce((a, x) => a + tot(x), 0);
    assert.equal(r.known + r.unknown, r.all);
    assert.equal(r.all, want);
    assert.equal(r.rows.reduce((a, x) => a + x.total, 0), want);
    assert.equal(r.known, list.filter((x) => P.isCountry(x.country)).reduce((a, x) => a + tot(x), 0));
  }
  const r = plain(P.countryRows(MIXED));
  assert.deepEqual([r.known, r.unknown, r.all], [25, 9, 34]);
});

test("countryRows: yüzdeler toplamı ~100 (her satır en çok ±0,5 yuvarlanır)", () => {
  const r = plain(P.countryRows(MIXED));
  assert.deepEqual(r.rows.map((x) => x.pct), [59, 15, 26]);
  assert.equal(r.rows.reduce((a, x) => a + x.pct, 0), 100);
  // rastgele ama sabit tohumlu 200 liste: toplam hep 100 ± satır/2
  let s = 12345; const rnd = (n) => ((s = (s * 1103515245 + 12345) & 0x7fffffff) % n);
  const pool = ["TR", "US", "DE", "GB", "FR", "ES", "BR", "dil:tr", "dil:en", "dil:xx", "?"];
  for (let t = 0; t < 200; t++) {
    const list = pool.filter(() => rnd(2)).map((c) => row(c, rnd(50), rnd(50), rnd(50)));
    const o = plain(P.countryRows(list));
    if (!o.all) continue;
    const sum = o.rows.reduce((a, x) => a + x.pct, 0);
    assert.ok(Math.abs(sum - 100) <= o.rows.length / 2 + 1e-9, `toplam ${sum}, ${o.rows.length} satır`);
  }
});

test("countryRows: boş liste ve sıfır sayaçlı liste çökmez", () => {
  assert.deepEqual(plain(P.countryRows([])), { rows: [], known: 0, unknown: 0, all: 0 });
  const z = plain(P.countryRows([row("TR", 0, 0, 0), row("?", 0, 0, 0)]));
  assert.equal(z.all, 0);
  assert.deepEqual(z.rows.map((x) => x.pct), [0]);                   // yalnız bilinen satır; bilinmeyen 0 olduğundan eklenmez
  assert.doesNotThrow(() => P.countryRows([row("dil:", 1, 0, 0)]));  // boş dil kodu
});

test("countryRows: tek tür girdide doğru (yalnız bilinmeyen / yalnız bilinen), girdiyi bozmaz", () => {
  const onlyUnk = plain(P.countryRows([row("dil:tr", 3, 0, 0), row("dil:tr", 2, 0, 0)]));
  assert.equal(onlyUnk.rows.length, 1);
  assert.equal(onlyUnk.rows[0].total, 5);
  assert.equal(onlyUnk.rows[0].pct, 100);
  assert.equal(onlyUnk.known, 0);
  const onlyKnown = plain(P.countryRows([row("US", 1, 0, 0), row("TR", 9, 0, 0)]));
  assert.deepEqual(onlyKnown.rows.map((x) => x.total), [9, 1]);      // büyükten küçüğe
  assert.equal(onlyKnown.unknown, 0);
  const list = [row("US", 1, 0, 0), row("TR", 9, 0, 0), row("?", 1, 0, 0)], before = JSON.stringify(list);
  P.countryRows(list);
  assert.equal(JSON.stringify(list), before);
});

test("countryRows: parça sayıları (tıklama, site, eklenti) satır toplamıyla tutarlı", () => {
  const r = plain(P.countryRows(MIXED));
  for (const x of r.rows) assert.equal(x.parts.reduce((a, p) => a + p[0], 0), x.total);
});

test("BULGU (kozmetik): 'Ülkesi belli %X' ve 'Bilinmiyor %Y' etiketleri bağımsız yuvarlandığı için toplamı 101 olabilir", () => {
    // 1 belli, 7 bilinmeyen: 12,5 -> 13 ve 87,5 -> 88 = 101. İfadeler HTML'den alınır, sayfadaki gerçek formül sınanır.
    const cty = plain(P.countryRows([row("TR", 1, 0, 0), row("dil:en", 7, 0, 0)]));
    const known = new Function("pct", "cty", "return " + exprAfter('"Ülkesi belli ", h("b", {}, "%" + '))(P.pct, cty);
    const unk = new Function("pct", "cty", "return " + exprAfter('"Bilinmiyor ", h("b", {}, "%" + '))(P.pct, cty);
    assert.equal(known + unk, 100, `belli %${known} + bilinmiyor %${unk}`);
  });

// ================================================================ 4. "Hesapsız çeviri isteği" penceresi (viewTraffic)
// Gerçek koddan çıkarılır: "const win = ..." satırından "const byAge = ..." satırının sonuna kadar.
const WIN_START = HTML.indexOf("const win = Math.min(days");
assert.ok(WIN_START >= 0 && WIN_START === HTML.lastIndexOf("const win = Math.min(days"), "admin.html değişmiş: 'const win' bulunamadı/tekrarlı, testi güncelle");
const BYAGE_AT = HTML.indexOf("const byAge", WIN_START);
assert.ok(BYAGE_AT > WIN_START, "admin.html değişmiş: 'const byAge' bulunamadı");
const WIN_SRC = HTML.slice(WIN_START, HTML.indexOf("\n", BYAGE_AT));
const runWindow = new Function("days", "d", "st", WIN_SRC + "\nreturn { win, end, rows, calls, anon, byAge };");

// Bağımsız referans: takvim günü farkı (Date nesnesi, UTC) - sunucu kuralı "day > bugün - N" (admin.py: stats/traffic)
const ymd = (iso) => { const [y, m, d] = iso.split("-").map(Number); return Date.UTC(y, m - 1, d); };
const addDays = (iso, k) => { const t = new Date(ymd(iso) + k * 864e5); return t.toISOString().slice(0, 10); };
const trNowStr = (iso) => iso.split("-").reverse().join(".") + " 14:03";
const usageFor = (todayIso, count) => Array.from({ length: count }, (_, k) => ({ day: addDays(todayIso, -k), calls: 10, anon: 3, words: 1 }));
const daysIn = (days, now, usage) => runWindow(days, { now }, { usage }).rows.map((x) => x.day).sort();

test("hesapsız pencere: 23.11.2026 14:03 için days=1 / 7 / 30 hangi günleri alıyor", () => {
  const now = "23.11.2026 14:03", u = usageFor("2026-11-23", 20);
  assert.deepEqual(daysIn(1, now, u), ["2026-11-23"]);                                   // yalnız bugün
  assert.deepEqual(daysIn(7, now, u), ["2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21", "2026-11-22", "2026-11-23"]);
  const d30 = daysIn(30, now, u);
  assert.equal(d30.length, 14);                                                          // /stats yalnız son 14 günü verir
  assert.equal(d30[0], "2026-11-10");
  assert.equal(d30.at(-1), "2026-11-23");
});

test("hesapsız pencere: sınır günü (tam 7. gün) dahil, 8. gün hariç; kayma yok", () => {
  const now = "23.11.2026 14:03", u = usageFor("2026-11-23", 20);
  assert.ok(daysIn(7, now, u).includes("2026-11-17"), "7. gün (6 gün önce) dahil olmalı");
  assert.ok(!daysIn(7, now, u).includes("2026-11-16"), "8. gün (7 gün önce) hariç olmalı");
  assert.ok(!daysIn(1, now, u).includes("2026-11-22"), "dün, 'Bugün'e girmemeli");
  assert.ok(daysIn(30, now, u).includes("2026-11-10"));
  assert.ok(!daysIn(30, now, u).includes("2026-11-09"));
  assert.equal(runWindow(7, { now }, { usage: u }).win, 7);
  assert.equal(runWindow(30, { now }, { usage: u }).win, 14);
  assert.equal(runWindow(1, { now }, { usage: u }).win, 1);
});

test("hesapsız pencere: sunucu kuralıyla (yaş < N gün) 60 gün x days={1,7,14,30} birebir aynı; ay/yıl/artık yıl/saat dilimi geçişleri", () => {
  for (const today of ["2026-11-23", "2026-03-01", "2028-03-01", "2026-01-03", "2026-03-29", "2026-10-25", "2024-12-31", "2026-01-01"]) {
    const u = usageFor(today, 60);
    for (const days of [1, 7, 14, 30]) {
      const win = Math.min(days, 14);
      const want = u.filter((x) => (ymd(today) - ymd(x.day)) / 864e5 < win).map((x) => x.day).sort();
      assert.deepEqual(daysIn(days, trNowStr(today), u), want, `bugün=${today} days=${days}`);
      assert.equal(want.length, win);
    }
  }
});

test("hesapsız pencere: toplam anon/calls ve yüzde, boş/sıfır durumları", () => {
  const now = "23.11.2026 14:03";
  const u = [{ day: "2026-11-23", calls: 10, anon: 3, words: 5 }, { day: "2026-11-22", calls: 20, anon: 10, words: 5 }, { day: "2026-11-10", calls: 100, anon: 50, words: 5 }];
  const r1 = runWindow(1, { now }, { usage: u });
  assert.deepEqual([r1.calls, r1.anon, P.pct(r1.anon, r1.calls)], [10, 3, 30]);
  const r7 = runWindow(7, { now }, { usage: u });
  assert.deepEqual([r7.calls, r7.anon], [30, 13]);
  const r30 = runWindow(30, { now }, { usage: u });
  assert.deepEqual([r30.calls, r30.anon], [130, 63]);
  const none = runWindow(1, { now }, { usage: [{ day: "2026-11-01", calls: 5, anon: 5, words: 0 }] });
  assert.deepEqual([none.rows.length, none.calls, none.anon, P.pct(none.anon, none.calls)], [0, 0, 0, 0]);   // 0'a bölme yok
});

test("hesapsız pencere: d.now '01.03.2026' gibi başında sıfırlı gün/ay doğru çözülür", () => {
  assert.equal(runWindow(1, { now: "01.03.2026 00:05" }, { usage: [] }).end, Date.UTC(2026, 2, 1));
  assert.equal(runWindow(1, { now: "31.12.2026 23:59" }, { usage: [] }).end, Date.UTC(2026, 11, 31));
});

test("d.now boş/bozuksa pencere tarayıcının İstanbul gününe göre süzülür (Bugün seçiliyken 14 gün toplanmaz)", () => {
    const u = usageFor("2026-11-23", 14);
    for (const bad of ["", undefined, "2026-11-23 14:03"]) {
      const kept = runWindow(1, { now: bad }, { usage: u }).rows.length;
      assert.ok(kept <= 1, `now=${JSON.stringify(bad)}: days=1 iken ${kept} gün toplandı`);
    }
  });

// "Bugün" şeridindeki hesapsız istek sayısı (anonReq): yalnızca bugünün satırı; kaynaktaki ifade olduğu gibi çalıştırılır
const ANON_AT = HTML.indexOf("anonReq = byAge[13]");
assert.ok(ANON_AT >= 0, "admin.html değişmiş: 'anonReq = byAge[13]' bulunamadı, testi güncelle");
const ANON_SRC = HTML.slice(ANON_AT, HTML.indexOf("\n", ANON_AT));
const runAnonReq = new Function("days", "d", "st", WIN_SRC + "\nlet anonReq = null;\n" + ANON_SRC + "\nreturn anonReq;");

test("bugün şeridi (anonReq): yalnızca bugünün hesapsız isteği; bugün kaydı yoksa 0", () => {
  const now = "23.11.2026 14:03", u = usageFor("2026-11-23", 14);
  for (const days of [1, 7, 30]) assert.equal(runAnonReq(days, { now }, { usage: u }), 3, `days=${days}: yalnız bugünün anon'u (3), pencere toplamı değil`);
  const yesterdayOnly = [{ day: "2026-11-22", calls: 9, anon: 4, words: 0 }];
  assert.equal(runAnonReq(7, { now }, { usage: yesterdayOnly }), 0);      // bugün kayıt yok = bugün hiç istek yok
  assert.equal(runAnonReq(1, { now }, { usage: yesterdayOnly }), 0);
  const browserToday = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });
  assert.equal(runAnonReq(7, { now: "" }, { usage: usageFor(browserToday, 3) }), 3);   // sunucu saati yok: tarayıcının İstanbul günü
  assert.equal(runAnonReq(1, { now }, { usage: [{ day: "2026-11-23", calls: 5, anon: 0, words: 0 }] }), 0);   // gerçek 0 gösterilir
});

test("'Hesapsız çeviri isteği' mini grafiği son 14 günü 0 ile doldurur (kayıtsız günler sıkışmaz)", () => {
    const now = "23.11.2026 14:03";
    const u = [{ day: "2026-11-17", calls: 5, anon: 1, words: 1 }, { day: "2026-11-18", calls: 5, anon: 2, words: 1 }, { day: "2026-11-22", calls: 5, anon: 3, words: 1 }, { day: "2026-11-23", calls: 5, anon: 4, words: 1 }];
    const at = HTML.indexOf('label: "Hesapsız çeviri isteği"');
    assert.ok(at >= 0, "admin.html değişmiş: KPI etiketi bulunamadı");
    const sp = HTML.indexOf("spark: ", at);
    assert.ok(sp > at && sp - at < 200, "admin.html değişmiş: spark ifadesi bulunamadı");
    const spark = new Function("days", "d", "st", WIN_SRC + "\nreturn " + exprFrom(HTML, sp + "spark: ".length) + ";")(7, { now }, { usage: u });
    assert.ok(spark && spark.length >= 7, `17-23 Kasım arası 7 takvim günü için ${spark && spark.length} nokta çizilir`);
  });

// ================================================================ 5. trendChart geometri (gerçek kod, sahte DOM)
const walk = (el, f) => { f(el); (el.children || []).forEach((c) => c && c.attrs && walk(c, f)); };
const SER = [{ key: "a", label: "A", color: "#111" }, { key: "b", label: "B", color: "#222" }, { key: "c", label: "C", color: "#333" }];
const DATA = {
  sifir: () => 0, bir: () => 1, rampa: (i) => i * 7, devasa: (i) => (i + 1) * 100000, sivri: (i, n) => (i === n - 1 ? 5000 : 0), kesirli: (i) => i * 0.1,
  eksik: (i) => (i % 2 ? undefined : null),
};
const mkRows = (n, f) => Array.from({ length: n }, (_, i) => { const v = f(i, n); return { day: String(i), a: v, b: v === undefined || v === null ? v : v / 2, c: v }; });
const BOX = { l: 40, r: 14, t: 14, b: 28 };

function draw(rows, series, o, width) {
  P.env.width = width;
  const root = P.trendChart(rows, series, o), wrap = root.children[root.children.length - 1], svg = wrap.children[0];
  return { root, wrap, svg, W: Math.max(260, Math.round(width) || 640), H: o.height || 240 };
}
function audit({ svg, W, H }, rows, series, o) {
  const bad = [], n = rows.length, ih = H - BOX.t - BOX.b, cols = o.type === "cols";
  const eps = 1e-6;
  walk(svg, (el) => {
    for (const k of ["x", "y", "x1", "x2", "y1", "y2", "cx", "cy", "r", "width", "height"]) {
      if (!(k in el.attrs)) continue;
      const v = Number(el.attrs[k]);
      if (!Number.isFinite(v)) bad.push(`${el.tagName}.${k}=${el.attrs[k]}`);
      else if ((k === "width" || k === "height" || k === "r") && v < 0) bad.push(`negatif ${el.tagName}.${k}=${v}`);
      else if ((k === "x" || k === "x1" || k === "x2" || k === "cx") && (v < -eps || v > W + eps)) bad.push(`taştı ${el.tagName}.${k}=${v} (W=${W})`);
      else if ((k === "y" || k === "y1" || k === "y2" || k === "cy") && (v < -eps || v > H + eps)) bad.push(`taştı ${el.tagName}.${k}=${v} (H=${H})`);
    }
    if (el.attrs.d && /NaN|Infinity|undefined/.test(el.attrs.d)) bad.push("yol d: " + el.attrs.d);
    if (el.tagName === "rect" && "rx" in el.attrs) {                      // sütunlar
      const x = +el.attrs.x, w = +el.attrs.width, y = +el.attrs.y, hgt = +el.attrs.height;
      if (w < 1) bad.push(`sütun genişliği ${w} < 1`);
      if (n <= 24 && (x < BOX.l - eps || x + w > W - BOX.r + eps)) bad.push(`sütun çizim alanı dışında x=${x} w=${w} W=${W}`);   // n>24 sayfada yok; en dar W'de min 1px genişlik 0,05px taşırır
      if (y < BOX.t - eps || y + hgt > BOX.t + ih + eps) bad.push(`sütun yükseklik taşması y=${y} h=${hgt}`);
    }
  });
  if (n === 0) return bad;
  // eksen: 5 etiket, artan, tepe değeri (görünen serilerin en büyüğü) en üst etikete sığıyor
  const ticks = []; walk(svg, (el) => { if (el.tagName === "text" && el.attrs["text-anchor"] === "end") ticks.push(parseShort(el.textContent)); });
  if (ticks.length !== 5) bad.push("eksen etiketi sayısı " + ticks.length);
  else {
    const peak = Math.max(0, ...rows.flatMap((r) => series.map((s) => r[s.key] || 0)));
    if (!(ticks[4] >= peak)) bad.push(`üst etiket ${ticks[4]} < tepe ${peak}`);
    if (!ticks.every((t, i) => i === 0 || t > ticks[i - 1])) bad.push("etiketler artmıyor: " + ticks);
  }
  if (cols && rows.length && !svg) bad.push("svg yok");
  return bad;
}

test("trendChart: n=0,1,2,3,14,24,90 x çizgi/sütun x 7 veri x 5 genişlik x 1-3 seri: NaN, negatif genişlik, taşma yok", () => {
  let runs = 0;
  for (const type of ["line", "cols"]) for (const n of [0, 1, 2, 3, 14, 24, 90]) for (const [name, f] of Object.entries(DATA))
    for (const width of [0, 100, 320, 640, 1200]) for (const ns of [1, 2, 3]) for (const height of [190, 250]) {
      const rows = mkRows(n, f), series = SER.slice(0, ns), o = { type, height };
      const bad = audit(draw(rows, series, o, width), rows, series, o);
      assert.deepEqual(bad, [], `${type} n=${n} veri=${name} genişlik=${width} seri=${ns} yükseklik=${height}`);
      runs++;
    }
  assert.equal(runs, 2 * 7 * 7 * 5 * 3 * 2);                          // döngü sessizce kısalmasın
});

test("trendChart: sütun genişliği formülü (n=1,2,14,24; W=260) - bw=min(30, band*0.7/m), çıktı width >= 1", () => {
  for (const [n, m] of [[1, 1], [2, 1], [14, 1], [14, 2], [24, 1], [24, 3]]) {
    const iw = 260 - BOX.l - BOX.r, band = iw / Math.max(1, n), bw = Math.min(30, (band * 0.7) / m), width = Math.max(1, bw - 2);
    assert.ok(Number.isFinite(width) && width >= 1, `n=${n} m=${m}: ${width}`);
    assert.ok(bw * m <= band * 0.7 + 1e-9);                           // grup bandın %70'ini aşmaz, komşu sütunla çakışmaz
    const real = draw(mkRows(n, DATA.bir), SER.slice(0, m), { type: "cols" }, 100);   // gerçek kod, W=260
    const rects = []; walk(real.svg, (el) => { if (el.tagName === "rect" && "rx" in el.attrs) rects.push(+el.attrs.width); });
    assert.ok(rects.length > 0);
    rects.forEach((w) => assert.ok(Math.abs(w - width) < 1e-9, `n=${n} m=${m}: gerçek genişlik ${w}, formül ${width}`));
  }
});

test("trendChart: n=1 sütun tam ortada, n=1 çizgi iw/2'de (n<2 koruması: 0'a bölme yok)", () => {
  const W = 640, iw = W - BOX.l - BOX.r, ih = 240 - BOX.t - BOX.b, center = BOX.l + iw / 2;
  const c = draw(mkRows(1, () => 10), SER.slice(0, 1), { type: "cols" }, W), bar = [];
  walk(c.svg, (e) => { if (e.tagName === "rect" && "rx" in e.attrs) bar.push(e); });
  assert.equal(bar.length, 1);
  assert.ok(Math.abs(+bar[0].attrs.x + +bar[0].attrs.width / 2 - center) < 1e-9, "sütun ortada değil");
  assert.equal(+bar[0].attrs.width, 28);                              // bw=30 tavanı - 2
  const l = draw(mkRows(1, () => 10), SER.slice(0, 1), { type: "line" }, W);
  let d = null; walk(l.svg, (e) => { if (e.attrs.class === "ln") d = e.attrs.d; });
  assert.equal(d, `M${center.toFixed(1)} ${(BOX.t + ih - (10 / P.niceMax(10)) * ih).toFixed(1)}`);   // tek nokta, tam ortada, NaN yok
});

test("trendChart: çizgi x konumları n=2 ve n=14'te ilk nokta sol kenarda, son nokta sağ kenarda", () => {
  const W = 640;
  for (const n of [2, 14, 24]) {
    const c = draw(mkRows(n, DATA.rampa), SER.slice(0, 1), { type: "line" }, W);
    let d = null; walk(c.svg, (e) => { if (e.attrs.class === "ln") d = e.attrs.d; });
    const xs = [...d.matchAll(/[ML]([\d.]+) /g)].map((m) => +m[1]);
    assert.equal(xs.length, n);
    assert.equal(xs[0], BOX.l);
    assert.equal(xs.at(-1), W - BOX.r);
    assert.ok(xs.every((x, i) => i === 0 || x > xs[i - 1]));
  }
});

test("trendChart: bütün seriler gizlenince (efsane düğmeleri) çökmez, NaN yok", () => {
  const rows = mkRows(14, DATA.rampa), series = SER.slice(0, 2), o = { type: "cols" };
  const c = draw(rows, series, o, 640), chips = c.root.children[0].children;
  chips.forEach((b) => b.listeners.click[0]());
  const svg = c.wrap.children[0];
  assert.deepEqual(audit({ svg, W: 640, H: 240 }, rows, [], o).filter((x) => !x.startsWith("üst etiket")), []);
});

test("trendChart: üzerine gelince (fare) n=1,2,14,24'te tooltip çökmeden doğru satırı gösterir, sol konum sonlu", () => {
  for (const type of ["line", "cols"]) for (const n of [1, 2, 14, 24]) {
    const rows = mkRows(n, DATA.rampa), c = draw(rows, SER.slice(0, 2), { type }, 640), hit = [];
    walk(c.svg, (e) => { if (e.tagName === "rect" && e.attrs.fill === "transparent") hit.push(e); });
    assert.equal(hit.length, 1);
    const tip = c.wrap.children[c.wrap.children.length - 1];
    for (const px of [-50, 0, 40, 300, 626, 640, 900]) {
      hit[0].listeners.pointermove[0]({ clientX: px });
      assert.ok(Number.isFinite(parseFloat(tip.style.left)), `${type} n=${n} px=${px}: left=${tip.style.left}`);
      assert.ok(rows.some((r) => tip.textContent.startsWith(r.day)), `${type} n=${n} px=${px}: ${tip.textContent}`);
    }
    hit[0].listeners.pointermove[0]({ clientX: 900 });                 // en sağ: son satır
    assert.ok(tip.textContent.startsWith(String(n - 1)));
    hit[0].listeners.pointermove[0]({ clientX: -50 });                 // en sol: ilk satır
    assert.ok(tip.textContent.startsWith("0"));
  }
});

test("satırsız (n=0) grafikte fare üstüne gelince hata yok (eski bulgu düzeltildi: show() başında 'if (!n) return')", () => {
  const c = draw([], SER.slice(0, 1), { type: "line" }, 640), hit = [];
  walk(c.svg, (e) => { if (e.tagName === "rect" && e.attrs.fill === "transparent") hit.push(e); });
  assert.doesNotThrow(() => hit[0].listeners.pointermove[0]({ clientX: 100 }));
});

test("tek günlük ÇİZGİ grafik (n=1) görünür bir nokta çizer", () => {
    const c = draw(mkRows(1, () => 10), SER.slice(0, 1), { type: "line" }, 640);
    const dots = []; walk(c.svg, (e) => { if (e.tagName === "circle" && Number(e.attrs.r) >= 4 && !e.attrs.class) dots.push(e); });
    assert.equal(dots.length, 1, "tek gün için bir nokta çizilmeli");
    assert.ok(Number.isFinite(Number(dots[0].attrs.cx)) && Number.isFinite(Number(dots[0].attrs.cy)));
  });

test("tüm seriler gizlenince 'Bu aralıkta veri yok' yazmaz (veri var)", () => {
    const c = draw(mkRows(14, DATA.rampa), SER.slice(0, 1), { type: "line" }, 640);
    c.root.children[0].children.forEach((b) => b.listeners.click[0]());
    const svg = c.wrap.children[0];
    assert.ok(!svg.textContent.includes("veri yok"));
  });

test("ağ: betik yüklenirken yalnızca sahte fetch çağrıldı (oturum sorgusu), gerçek istek yok", () => {
  assert.ok(P.env.fetchCalls.every((c) => String(c[0]).startsWith("/admin/api/")));
});
