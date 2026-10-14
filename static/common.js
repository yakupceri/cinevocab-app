/* Ortak yardımcılar: DOM, API, bildirim, onay penceresi, ülke/dil adları. i18n.js'ten SONRA yüklenir. */
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined && text !== null) e.textContent = text;
  return e;
};
const svg = (paths) => {
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.setAttribute("viewBox", "0 0 24 24");
  s.innerHTML = paths; // yalnızca bu dosyadaki sabit çizim yolları
  return s;
};
const ICONS = {
  words: '<path d="M4 6h16M4 12h16M4 18h10"/>',
  videos: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9l5 3-5 3z"/>',
  known: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.5"/>',
  practice: '<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>',
  duel: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 5a3 3 0 010 6M18 14c2 .7 3 2.5 3 5"/>',
  settings: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
  moon: '<path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z"/>',
};

async function api(path, body) {
  const opt = body !== undefined ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {};
  let r;
  try { r = await fetch(path, opt); } catch (e) { throw new Error(t("eNet")); }
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { const err = new Error(I18N.err(d.detail || "")); err.status = r.status; throw err; }
  return d;
}

function toast(msg) {
  const x = el("div", "toast", msg);
  document.body.append(x);
  setTimeout(() => x.remove(), 2600);
}

/* Onay penceresi: Promise<boolean> */
function ask(title, text, okLabel, danger = true) {
  return new Promise((res) => {
    const m = el("div", "modal"), c = el("div", "card"), row = el("div", "row");
    const ok = el("button", danger ? "danger" : "primary", okLabel || t("del")), no = el("button", "", t("cancel"));
    const done = (v) => { m.remove(); res(v); };
    ok.onclick = () => done(true); no.onclick = () => done(false);
    m.onclick = (e) => { if (e.target === m) done(false); };
    row.append(ok, no); row.style.marginTop = "18px";
    c.append(el("h2", "", title), el("p", "dim", text || ""), row);
    c.firstChild.style.marginBottom = "8px";
    m.append(c); document.body.append(m); no.focus();
  });
}

const COUNTRY_CODES = "TR DE GB US NL FR AZ RU UA KZ SA AE EG IQ IR ES IT SE BE AT CH CA AU BR IN PK JP KR CN ID MX AR PL GR BG RO PT CY".split(" ");
const PAIR_LANGS = ["tr", "en", "fr", "it", "de", "es", "pt", "ru", "ar"];
function langName(code, inLang) {
  try { const n = new Intl.DisplayNames([inLang || I18N.lang], { type: "language" }).of(code); return n.charAt(0).toLocaleUpperCase(inLang || I18N.lang) + n.slice(1); } catch (e) { return code; }
}
function countryName(cc) { try { return new Intl.DisplayNames([I18N.lang], { type: "region" }).of(cc); } catch (e) { return cc; } }
const flag = (cc) => (cc && /^[A-Z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc].map((c) => 127397 + c.charCodeAt(0))) + " " : "");
const fmtDate = (s) => { const d = new Date(String(s).replace(" ", "T")); return isNaN(d) ? "" : d.toLocaleDateString(I18N.lang, { day: "numeric", month: "short" }); };
const shuf = (a) => [...a].sort(() => Math.random() - 0.5);

/* Üst çubuğa dil seçici + tema düğmesi ekler (id="tools" kutusuna) */
function mountTools(box) {
  const sel = el("select");
  sel.title = t("uiLang"); sel.setAttribute("aria-label", t("uiLang"));
  I18N.list.forEach(([c, n]) => sel.append(new Option(n, c)));
  sel.value = I18N.lang;
  sel.onchange = () => I18N.set(sel.value);
  const th = el("button", "icon");
  th.setAttribute("aria-label", t("theme"));
  const paint = () => { th.replaceChildren(svg(I18N.theme() === "dark" ? ICONS.sun : ICONS.moon)); th.firstChild.style.cssText = "width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round"; };
  paint();
  th.onclick = () => { I18N.setTheme(I18N.theme() === "dark" ? "light" : "dark"); paint(); };
  box.replaceChildren(sel, th);
}
