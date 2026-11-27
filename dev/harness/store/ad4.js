/* 2.4.0 tanıtım videosu (1920x1080, 55 sn) sahne akışı. Sürücü: dev/harness/ad4.mjs. Düello/lig/ilerleme sahneleri: ad4-site.js.
   storeart.html (?k=video[&l=tr]) yüklendikten SONRA enjekte edilir: LANG, TITLES, UI, DEMO, esc, H, scene, box, popup, BODY, ICON, MARK oradan gelir
   (başlıklar, renkler, popup ve kutu çizimleri tek yerde kalsın). Burada yalnızca videoya özgü olanlar var.
   Her şey seek(t) ile zamandan hesaplanır (CSS animasyonu yok): kare kare aynı çıktı. */
(() => {
/* Arayüz metinleri: extension/lang.js ve popup-i18n.js'ten birebir (noteAdd, notePh, noteYours, lpRight, lpContinue). */
const X = {
  en: { noteAdd: "+ Note", notePh: "Note for “amor”", yourNote: "Your note", right: "Correct", cont: "Continue", end: "Free Chrome extension",
    // Boşluk sorusu, videoda tutulan kelimeyi sorar (not da cevaptan sonra geri gelir).
    cloze: ["Lo más importante en la vida es tener ", " propio"], clozeT: "love", opts: ["mundo", "amor", "pregunta", "feliz"],
    pairs: { mundo: "world", amor: "love", feliz: "happy", importante: "important", vida: "life", pregunta: "question", propio: "own", tener: "to have", "más": "more" },
    queue: ["propio", "tener", "más"], matches: ["amor", "vida", "mundo"] },
  tr: { noteAdd: "+ Not", notePh: "“life” için not", yourNote: "Notun", right: "Doğru", cont: "Devam", end: "Ücretsiz Chrome eklentisi",
    cloze: DEMO.cloze, clozeT: DEMO.clozeT, opts: DEMO.opts,
    pairs: { world: "dünya", love: "sevmek", happy: "mutlu", important: "önemli", life: "hayat", question: "soru", thing: "şey", yourself: "kendin", most: "en" },
    queue: ["thing", "yourself", "most"], matches: ["life", "love", "world"] },
}[LANG];

// Videoda HER kelimenin altında çeviri belirir (eklenti iki harf ve üzeri her kelimeyi çevirir). Mağaza çiziminde boş kalan dördü burada doldurulur.
const FILL = LANG === "en" ? { Lo: "the", en: "in", la: "the", es: "is" } : {};   // Türkçede bu işlev sözcüklerinin doğal tek kelimelik karşılığı yok: boş kalır (mağaza görselleriyle aynı)
for (const c of DEMO.chips) c[1] = c[1] || FILL[c[0]] || "";

const css = document.createElement("style");
css.textContent = `
  html, body { width:1920px; height:1080px; }
  .sc { position:absolute; left:0; top:0; width:1920px; height:1080px; overflow:hidden; display:none; background:var(--night); }
  .fit { position:absolute; display:flex; align-items:center; } .fit .h { width:100%; line-height:1.07; }
  .sc .dash { position:absolute; height:16px; background:repeating-linear-gradient(90deg,var(--sun) 0 52px,transparent 52px 78px); border-radius:6px; }
  .sc .brand { position:absolute; font-size:58px; gap:22px; } .sc .brand img { height:76px; }
  .film .box { font-size:56px; left:50%; transform:translateX(-50%); }
  .film .box .chip { padding:1px 7px; margin-right:7px; }   /* aralık yazıyla orantılı: çeviriler bitişik okunmasın */
  .box .lg .bt { border-width:2px; } .box .note .in { border-width:2px; } .box .note .in i { width:4px; }
  .box .kept { border-radius:.4em; }
  .plain { position:absolute; left:0; right:0; text-align:center; font:600 58px/1.35 system-ui,-apple-system,sans-serif; color:#fff; }
  .plain span { background:rgba(10,5,7,.9); padding:.1em .45em; border-radius:6px; }
  .pp .cl-gap.on { min-width:0; height:auto; vertical-align:baseline; padding:0 .3em; border-bottom:0; background:var(--sun); color:var(--on); border-radius:.25em; font-weight:800; }
  .pp .fb-ok { margin:18px 0 8px; text-align:center; color:var(--mint); font-weight:700; font-size:17px; }
  .pp .pn { margin:6px 8px 18px; text-align:center; line-height:1.4; }
  .pp .pn-l { display:block; margin-bottom:3px; font:500 11px var(--mono); letter-spacing:.06em; text-transform:uppercase; color:var(--dim); }
  .pp .pn-t { color:var(--ink); font-size:16px; font-weight:600; }
  .pp .btnp { min-height:42px; display:grid; place-items:center; border-radius:6px; background:var(--sun); color:var(--on); font-weight:700; }
  .pp .mg-board { display:block; position:relative; padding:0; overflow:hidden; }
  .pp .mg-board .mg-tile { position:absolute; }
  .pp .mg-hud .cb { display:inline-block; }
  .center { position:absolute; left:0; width:1920px; text-align:center; white-space:nowrap; }
  #cursor { position:absolute; left:0; top:0; width:60px; height:72px; z-index:30; display:none; }
  #ripple { position:absolute; left:0; top:0; width:110px; height:110px; margin:-55px 0 0 -55px; border:6px solid var(--sun); border-radius:50%; z-index:29; display:none; }
`;
document.head.appendChild(css);
document.documentElement.lang = LANG;   // büyük harfe çevirmede i -> İ doğru olsun
document.body.innerHTML = "";

/* ---------- yardımcılar ---------- */
const clamp = (v) => Math.max(0, Math.min(1, v));
const seg = (u, a, d = .35) => clamp((u - a) / d);
const ease = (p) => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
const out = (p) => 1 - Math.pow(1 - p, 3);
// Giriş: hafif yükselerek belirir. floor > 0: ilk karede bile görünür (boş kare olmasın).
const rise = (e, u, a = 0, floor = 0, d = .45, dy = 30) => { const p = out(seg(u, a, d)); e.style.opacity = u < a ? floor : floor + (1 - floor) * p; e.style.transform = `translateY(${(1 - p) * dy}px)`; };
const show = (e, v) => { e.style.display = v ? "" : "none"; };
const el = (html) => { const d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstElementChild; };
const brand = (style) => `<div class="brand" style="${style}"><img src="${MARK}" alt="">CineVocab</div>`;
const mid = (e, fx = .5, fy = .5) => { const r = e.getBoundingClientRect(); return [r.left + r.width * fx, r.top + r.height * fy]; };

const SC = [];   // {id, dur, node, update(u), cursor:[[u,x,y]], clicks:[u], cues:[[u,tür]], measure()}
const add = (id, dur, html, o) => { const node = el(`<section class="sc" data-id="${id}">${html}</section>`); document.body.appendChild(node); SC.push({ id, dur, node, cursor: [], clicks: [], cues: [], ...o(node) }); };

/* ---------- 1) açılış ---------- */
add("hook", 3.5, `${brand("left:120px;top:96px")}
  <div class="fit" data-fit style="left:120px;top:230px;width:1680px;height:620px">${H(TITLES.promo, "font-size:224px")}</div>
  <div class="dash" style="left:120px;top:922px;width:0"></div>`, (n) => {
  const [a, b] = n.querySelectorAll(".h span"), dash = n.querySelector(".dash");
  return { update: (u) => { rise(a, u, 0, 1, .5, 40); rise(b, u, .35, 0, .5, 40); dash.style.width = 598 * ease(seg(u, .6, 1.1)) + "px"; } };
});

/* ---------- 2 ve 3) videonun üstündeki kutu ---------- */
const FILM = { x: 80, y: 312, w: 1760, h: 728 };
const filmHTML = (title) => `<div class="fit" data-fit style="left:80px;top:34px;width:1760px;height:256px">${H(title, "font-size:122px")}</div>
  <div class="film" style="left:${FILM.x}px;top:${FILM.y}px;width:${FILM.w}px;height:${FILM.h}px">${scene()}${box({ kept: true, style: "top:0" })}</div>`;
function boxParts(n) {
  const b = n.querySelector(".box");
  const nb = el(`<span class="bt nb">${X.noteAdd}</span>`);
  b.querySelector(".lg").insertBefore(nb, b.querySelector(".lg .bt"));
  const chips = [...b.querySelectorAll(".chip")];
  return { b, nb, chips, word: chips.find((c) => c.querySelector(".w").textContent === DEMO.keep), kept: b.querySelector(".kept"), sent: b.querySelector(".sent"),
    note: b.querySelector(".note"), inp: b.querySelector(".note .in"), ok: b.querySelector(".note .ok"), trs: chips.map((c) => c.querySelector(".t")).filter((t) => t.textContent) };
}
function boxState(p, { kept = false, nb = false, note = false, text = "", caret = true } = {}) {
  p.word.classList.toggle("star", kept); show(p.kept, kept); show(p.nb, nb); show(p.note, note);
  p.inp.innerHTML = (text ? esc(text) : "") + `<i style="opacity:${caret ? 1 : 0}"></i>` + (text ? "" : `<span style="color:#AC9C92">${esc(X.notePh)}</span>`);
}

add("live", 6, filmHTML(TITLES.s1) , (n) => {
  const p = boxParts(n), title = n.querySelector(".fit"), film = n.querySelector(".film");
  const plain = el(`<div class="plain"><span>${esc(DEMO.chips.map((c) => c[0]).join(" "))}</span></div>`); film.appendChild(plain);
  boxState(p);
  const times = p.trs.map((_, i) => 1.8 + i * .15);
  return { p, plain, cues: [...times.map((t) => [t, "pop"]), [3.5, "tap"]], update: (u) => {
    boxState(p);
    rise(title, u, 0, .3); film.style.opacity = .4 + .6 * seg(u, 0, .4);
    plain.style.opacity = seg(u, .35, .25) * (1 - seg(u, 1.12, .18));
    p.b.style.opacity = seg(u, 1.3, .3);
    p.trs.forEach((t, i) => { const q = out(seg(u, times[i], .28)); t.style.opacity = q; t.style.transform = `translateY(${(1 - q) * -14}px)`; });
    p.sent.style.opacity = seg(u, 3.45, .4);
  } };
});

const K = { word: 1.2, nb: 2.3, type0: 2.9, type1: 4.8, save: 5.9 };
add("keep", 7, filmHTML(TITLES.s2), (n) => {
  const p = boxParts(n), title = n.querySelector(".fit");
  return { p, clicks: [K.word, K.nb, K.save], cues: [[K.word, "tap"], [K.word + .06, "ding"], [K.nb, "tap"], ...[0, 1, 2, 3, 4, 5].map((i) => [K.type0 + .15 + i * .32, "count"]), [K.save, "tap"], [K.save + .1, "right"]],
    measure() {
      const start = [1560, 990];
      boxState(p); const w = mid(p.word, .62, .3);
      boxState(p, { kept: true, nb: true }); const b = mid(p.nb, .6, .65);
      boxState(p, { kept: true, note: true, text: DEMO.note }); const s = mid(p.ok, .6, .65);
      this.cursor = [[.2, ...start], [K.word - .1, ...w], [K.word + .35, ...w], [K.nb - .1, ...b], [K.nb + .3, ...b], [K.nb + 1, 1715, 770], [K.save - .8, 1715, 770], [K.save - .15, ...s], [K.save + .5, ...s], [7, s[0] + 60, s[1] + 90]];
    },
    update: (u) => {
      rise(title, u, 0, .3);
      const chars = Math.floor(DEMO.note.length * seg(u, K.type0, K.type1 - K.type0));
      const noting = u >= K.nb && u < K.save;
      boxState(p, { kept: u >= K.word, nb: u >= K.word && !noting, note: noting, text: DEMO.note.slice(0, chars), caret: (u > K.type0 && u < K.type1) || Math.floor(u * 2) % 2 === 0 });
      p.kept.style.background = `rgba(255,210,30,${u >= K.save ? .35 * (1 - seg(u, K.save + .5, .6)) : u >= K.word ? .35 * (1 - seg(u, K.word + .5, .6)) : 0})`;
    } };
});

/* ---------- 4, 5, 6) popup sahneleri ---------- */
const PZ = 1.86, PH = 556, PX = 1120, PY = (1080 - PH * PZ) / 2;
const popHTML = (title, tab, body, size = 152) => `<div class="fit" data-fit style="left:90px;top:96px;width:960px;height:700px">${H(title, `font-size:${size}px`)}</div>
  <div class="dash" style="left:90px;top:852px;width:364px"></div>${brand("left:90px;top:918px")}
  ${popup(tab, body, `zoom:${PZ};left:${PX / PZ}px;top:${PY / PZ}px;height:${PH}px`)}`;
const popIn = (n, u) => { rise(n.querySelector(".fit"), u, 0, .3); const pp = n.querySelector(".pp"), q = out(seg(u, 0, .45)); pp.style.opacity = .35 + .65 * q; pp.style.translate = `0 ${(1 - q) * 7}px`; };
const topRow = `<div class="row"><div class="grow"><div class="bar"><i style="width:25%"></i></div></div><div class="xb">✕</div></div>`;
const gap = (fill) => `<div class="cl">${esc(X.cloze[0])}<span class="cl-gap${fill ? " on" : ""}">${fill ? esc(DEMO.keep) : ""}</span>${esc(X.cloze[1])}</div>`;

const CLICK = 2.2;
add("cloze", 5, popHTML(TITLES.s3, 2, `<div class="q">${topRow}<div class="lp-lab">${UI.cloze}</div>${gap(false)}
    <div class="cl-tr">${esc(DEMO.sent)}</div><div class="cl-tr mono">= ${esc(X.clozeT)}</div>${X.opts.map((o) => `<div class="ans">${esc(o)}</div>`).join("")}</div>
  <div class="fb">${topRow}<div style="height:22px"></div>${gap(true)}<div class="cl-tr">${esc(DEMO.sent)}</div><div class="fb-ok">${X.right}</div>
    <div class="pn"><span class="pn-l">${X.yourNote}</span><span class="pn-t">${esc(DEMO.note)}</span></div><div class="btnp">${X.cont}</div></div>`), (n) => {
  const q = n.querySelector(".q"), fb = n.querySelector(".fb"), right = [...n.querySelectorAll(".ans")].find((a) => a.textContent === DEMO.keep);
  return { clicks: [CLICK], hide: CLICK + .8, cues: [[CLICK, "tap"], [CLICK + .36, "right"]],
    measure() { show(q, true); show(fb, false); const a = mid(right, .34, .55); this.cursor = [[.6, 1720, 930], [CLICK - .25, ...a], [CLICK + .1, ...a], [CLICK + .65, 1740, 940]]; },
    update: (u) => {
      popIn(n, u);
      const done = u >= CLICK + .36;
      show(q, !done); show(fb, done);
      right.style.background = u >= CLICK ? "#1F3A2B" : ""; right.style.borderColor = u >= CLICK ? "#7BD39A" : ""; right.style.color = u >= CLICK ? "#7BD39A" : "";
      fb.style.opacity = .5 + .5 * seg(u, CLICK + .36, .25);
    } };
});

// Eşleştirme: kurallar popup.js mgTap/mgAdd ile aynı (10 x kombo puan, eşleşen iki taş kalkar, yeni çift en boş sütunların üstüne düşer).
const TAPS = [[.7, 1.15], [1.85, 2.3], [3.0, 3.45]], SCORE = [0, 10, 30, 60];
const BW = 348, BH = 316, TW = (BW - 2 - 12 - 15) / 4, TH = (BH - 2 - 12 - 15) / 4;
const tileXY = (col, row) => [6 + col * (TW + 5), BH - 2 - 6 - (row + 1) * TH - row * 5];
const STATES = (() => {
  const isSrc = (t) => t in X.pairs, key = (t) => isSrc(t) ? t : Object.keys(X.pairs).find((w) => X.pairs[w] === t);
  let cols = DEMO.board.map((col) => col.map(([t]) => ({ t, k: key(t), src: isSrc(t) })).reverse());   // her sütun alttan üste
  const snap = () => { const m = {}; cols.forEach((c, i) => c.forEach((tl, r) => { m[tl.t] = { ...tl, col: i, row: r }; })); return m; };
  const states = [snap()], queue = [...X.queue];
  for (const k of X.matches) {
    cols = cols.map((c) => c.filter((tl) => tl.k !== k));
    const w = queue.shift();
    for (const [t, src] of [[X.pairs[w], false], [w, true]]) { const min = Math.min(...cols.map((c) => c.length)); cols[cols.findIndex((c) => c.length === min)].push({ t, k: w, src }); }
    states.push(snap());
  }
  return states;
})();
add("match", 5.5, popHTML(TITLES.s4, 2, `<div class="mg-hud"><div><small>${UI.score}</small><b class="sv">0</b></div><div><small>${UI.combo}</small><b class="cb">–</b></div><div><small>${UI.time}</small><b class="tv">55</b></div><div class="x">×</div></div>
  <div class="bar"><i></i></div><div class="mg-board"></div>`, LANG === "en" ? 132 : 152), (n) => {
  const board = n.querySelector(".mg-board"), sv = n.querySelector(".sv"), cb = n.querySelector(".cb"), tv = n.querySelector(".tv"), fill = n.querySelector(".mg-hud + .bar i");
  const tile = (tl, x, y, extra = "", sel = false) => `<div class="mg-tile ${tl.src ? "mg-w" : "mg-t"}${tl.t.length > 9 ? " long" : ""}${sel ? " picked" : ""}" style="left:${x}px;top:${y}px;width:${TW}px;height:${TH}px;${extra}">${esc(tl.t)}</div>`;
  const pairOf = (i) => { const k = X.matches[i]; return [k, X.pairs[k]]; };   // i. eşleşmenin iki taşı: önce kaynak kelime, sonra çevirisi
  return { clicks: TAPS.flat(), hide: 4.6, cues: TAPS.flatMap(([a, b], i) => [[a, "tap"], [b, "tap"], [b + .05, "pop"], ...(i ? [[b + .1, "ding"]] : [])]),
    measure() {
      const r = board.getBoundingClientRect(), s = r.width / board.offsetWidth;
      const pos = (i, t) => { const tl = STATES[i][t], [x, y] = tileXY(tl.col, tl.row); return [r.left + (x + 1 + TW * .62) * s, r.top + (y + 1 + TH * .66) * s]; };
      this.cursor = [[.2, 1740, 960]];
      TAPS.forEach(([a, b], i) => { const [w, t] = pairOf(i), p = pos(i, w), q = pos(i, t); this.cursor.push([a - .12, ...p], [a + .1, ...p], [b - .08, ...q], [b + .25, ...q]); });
      this.cursor.push([4.6, 1750, 965]);
    },
    update: (u) => {
      popIn(n, u);
      const i = TAPS.filter(([, b]) => u >= b).length, now = STATES[i], prev = STATES[Math.max(0, i - 1)], since = i ? u - TAPS[i - 1][1] : 9;
      const picked = i < TAPS.length && u >= TAPS[i][0] ? pairOf(i)[0] : null;
      let html = "";
      for (const tl of Object.values(now)) {
        let [x, y] = tileXY(tl.col, tl.row), extra = "";
        if (i && prev[tl.t]) { const [, y0] = tileXY(prev[tl.t].col, prev[tl.t].row); y = y0 + (y - y0) * ease(seg(since, .22, .18)); }
        else if (i) { const q = out(seg(since, .3, .28)); y -= (1 - q) * TH * 1.3; extra = `opacity:${since < .3 ? 0 : .2 + .8 * q};`; }
        html += tile(tl, x, y, extra, tl.t === picked);
      }
      if (i && since < .24) for (const t of pairOf(i - 1)) {   // eşleşen çift: kısa bir büyüyüp sönme
        const tl = prev[t], [x, y] = tileXY(tl.col, tl.row), q = seg(since, 0, .24);
        html += tile(tl, x, y, `opacity:${1 - q};transform:scale(${1 + .12 * out(q)});z-index:3;`, true);
      }
      board.innerHTML = html;
      sv.textContent = SCORE[i]; cb.textContent = i > 1 ? "x" + i : "–";
      cb.style.transform = `scale(${i > 1 ? 1 + .55 * (1 - out(seg(since, 0, .4))) : 1})`;
      const left = 55 - Math.floor(u); tv.textContent = left; fill.style.width = (left / 60) * 100 + "%";
    } };
});

/* ---------- düello, konuşarak cevap, günlük meydan okuma + lig, öğrenildi (ad4-site.js) ---------- */
window.AD4_SITE({ add, seg, ease, out, rise, show, brand, mid, popHTML, popIn });

add("off", 3, popHTML(TITLES.s5, 0, BODY.off()), (n) => ({ update: (u) => popIn(n, u) }));

/* ---------- 7) kapanış ---------- */
add("end", 4, `<img class="icon" src="${ICON}" alt="" style="position:absolute;left:765px;top:72px;width:390px;height:390px">
  <div class="center name" style="top:508px;font:800 220px/1 var(--display);letter-spacing:.005em">CineVocab</div>
  <div class="center sub" style="top:770px;font:800 96px/1.1 var(--display);color:var(--sun)">${X.end}</div>
  <div class="dash" style="left:778px;top:938px;width:364px"></div>`, (n) => {
  const icon = n.querySelector(".icon"), name = n.querySelector(".name"), sub = n.querySelector(".sub"), dash = n.querySelector(".dash");
  return { cues: [[.15, "ding"]], update: (u) => { rise(icon, u, 0, .5); rise(name, u, .15); rise(sub, u, .45); dash.style.opacity = seg(u, .75); } };
});

/* ---------- imleç ve zaman çizelgesi ---------- */
const cursor = el(`<svg id="cursor" viewBox="0 0 40 48"><path d="M4 2v36l10-9 6 15 8-3.500-6-14.500h13z" fill="#F3E9D2" stroke="#0A0507" stroke-width="2.500" stroke-linejoin="round"/></svg>`);
const ripple = el(`<div id="ripple"></div>`);
document.body.append(ripple, cursor);
let acc = 0; for (const s of SC) { s.t0 = acc; acc += s.dur; }
const TOTAL = acc;

function at(path, u) {   // imleç yolu üzerinde u anındaki konum
  if (!path.length || u < path[0][0]) return null;
  for (let i = 1; i < path.length; i++) if (u <= path[i][0]) { const [a, x0, y0] = path[i - 1], [b, x1, y1] = path[i], q = ease(clamp((u - a) / (b - a || 1))); return [x0 + (x1 - x0) * q, y0 + (y1 - y0) * q]; }
  return path[path.length - 1].slice(1);
}
window.seek = (t) => {
  const s = [...SC].reverse().find((x) => t >= x.t0 - 1e-6) || SC[0], u = Math.max(0, t - s.t0);
  for (const x of SC) x.node.style.display = x === s ? "block" : "none";
  s.update(u);
  const p = at(s.cursor, u);
  cursor.style.display = p ? "block" : "none";
  cursor.style.opacity = p ? Math.min(seg(u, s.cursor[0][0], .25), s.hide ? 1 - seg(u, s.hide - .3, .3) : 1) : 0;
  if (p) { const down = s.clicks.some((c) => u >= c - .04 && u < c + .12); cursor.style.transformOrigin = "6px 3px"; cursor.style.transform = `translate(${p[0] - 6}px, ${p[1] - 3}px) scale(${down ? .86 : 1})`; }
  const c = s.clicks.find((x) => u >= x && u < x + .36);
  ripple.style.display = c == null ? "none" : "block";
  if (c != null) { const q = (u - c) / .36, [x, y] = at(s.cursor, c); ripple.style.transform = `translate(${x}px, ${y}px) scale(${.25 + .75 * out(q)})`; ripple.style.opacity = 1 - q; }
};
window.getTotal = () => TOTAL;
window.SCENES = () => SC.map((s) => [s.id, s.t0, s.dur]);
// Müzik olayları (music.py): ilk "whoosh" ana ritmin başlangıcıdır, sonrakiler yumuşak geçiş.
window.CUES = () => SC.flatMap((s, i) => [...(i ? [[s.t0 - .12, i === 1 ? "whoosh" : "whoosh_s"]] : []), ...s.cues.map(([u, k]) => [s.t0 + u, k])]).sort((a, b) => a[0] - b[0]);

// Taşma denetimi: görünen sahnede başlık, kutu, popup ve taşlar.
window.CHECK = () => {
  const bad = [], r = (e) => e.getBoundingClientRect(), vis = (e) => e.offsetParent !== null || r(e).width > 0;
  const s = SC.find((x) => x.node.style.display === "block"); if (!s) return bad;
  s.node.querySelectorAll("[data-fit]").forEach((f) => { const h = f.firstElementChild; if (h.offsetHeight > f.clientHeight + 1 || h.scrollWidth > f.clientWidth + 1) bad.push(`${s.id}: başlık sığmıyor (${h.scrollWidth}x${h.offsetHeight} / ${f.clientWidth}x${f.clientHeight})`); });
  s.node.querySelectorAll(".film .box").forEach((b) => { const a = r(b.parentElement), c = r(b); if (c.width && (c.left < a.left + 20 || c.right > a.right - 20 || c.top < a.top + 10 || c.bottom > a.bottom - 20)) bad.push(`${s.id}: kutu film karesinden taşıyor (${Math.round(c.width)}x${Math.round(c.height)})`); });
  s.node.querySelectorAll(".pp main").forEach((m) => { if (m.scrollHeight > m.clientHeight + 1) bad.push(`${s.id}: popup içeriği kesiliyor (${m.scrollHeight} > ${m.clientHeight})`); });
  s.node.querySelectorAll(".mg-tile, .ans, .sel, .pill, .wt-main, .btnp, .wt-status span").forEach((e) => { if (vis(e) && e.scrollWidth > e.clientWidth + 1 && e.clientWidth) bad.push(`${s.id}: metin taşıyor: ${e.textContent}`); });
  s.node.querySelectorAll(".web").forEach((w) => { if (w.scrollHeight > w.clientHeight + 1) bad.push(`${s.id}: site kartı ekrandan taşıyor (${w.scrollHeight} > ${w.clientHeight})`); });
  s.node.querySelectorAll(".web .btn, .web .opt, .web .nm, .web .pc, .web .pstrip, .web .meta, .web .sayrow, .web .chip, .badge, .note40").forEach((e) => { if (vis(e) && e.clientWidth && e.scrollWidth > e.clientWidth + 1) bad.push(`${s.id}: metin taşıyor: ${e.textContent.slice(0, 40)}`); });
  s.node.querySelectorAll(".badge, .note40").forEach((e) => { if (r(e).right > 900) bad.push(`${s.id}: rozet/not site kartına giriyor (${Math.round(r(e).right)})`); });
  s.node.querySelectorAll(".center").forEach((e) => { if (e.scrollWidth > 1921) bad.push(`${s.id}: ortalanmış metin taşıyor: ${e.textContent}`); });
  document.querySelectorAll("img").forEach((i) => { if (!i.naturalWidth) bad.push("görsel yüklenmedi: " + i.getAttribute("src")); });
  for (const f of ["800 40px 'Big Shoulders'", "500 16px 'Instrument Sans'"]) if (!document.fonts.check(f, "Aİğşçöü")) bad.push("yazı tipi yüklenmedi: " + f);
  return bad;
};

(async () => {
  const sample = "AaİıĞğŞşÇçÖöÜü0123→“”";
  await Promise.all(["800 40px 'Big Shoulders'", "500 16px 'Instrument Sans'", "600 16px 'Instrument Sans'", "700 16px 'Instrument Sans'"].map((f) => document.fonts.load(f, sample)));
  await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
  for (const s of SC) s.node.style.display = "block";
  // Uzun başlıklar alanına sığana kadar küçülür.
  document.querySelectorAll("[data-fit]").forEach((f) => { const h = f.firstElementChild; let fs = parseFloat(h.style.fontSize); while (fs > 80 && (h.offsetHeight > f.clientHeight || h.scrollWidth > f.clientWidth)) { fs -= 2; h.style.fontSize = fs + "px"; } });
  // Kutu yukarıdan sabitlenir: en uzun hali (not açık) film karesine sığacak yükseklikte; not açılınca kelimeler yerinden oynamaz.
  const keep = SC.find((s) => s.id === "keep"), live = SC.find((s) => s.id === "live");
  boxState(keep.p, { kept: true, note: true, text: DEMO.note });
  const top = FILM.h - keep.p.b.offsetHeight - 46;
  for (const s of [live, keep]) s.p.b.style.top = top + "px";
  live.plain.style.top = (top + live.p.chips[0].offsetTop - 4) + "px";
  for (const s of SC) if (s.measure) s.measure();
  seek(0);
  window.READY = true;
})();
})();
