/* CineVocab: altyazı dili tahmini + küçük arayüz metinleri (içerik betiği ve açılır pencere ortak kullanır). */
(function (root) {
  const STOP = {
    tr: "ve bir bu da için ne ama çok daha gibi var yok ben sen biz siz ki mi mı mu mü değil evet hayır şey ile her şu kadar sonra ya şimdi nasıl neden bana sana onu bunu olarak çünkü hiç bile artık tamam lütfen",
    en: "let the and you that is it to of in not this for are was with have be what he she we they do but your me my on at so if can will just don't i'm it's that's there here know no yes about like get go out up how why when who all one",
    fr: "le la les des est une un et en que qui pas pour dans ce je tu il elle nous vous ils sur avec ne se mais au du plus suis très oui non c'est qu'il est-ce pourquoi comment quoi bien tout fait être avoir ça cette sont fais",
    it: "il lo la gli che non di un una per sono con è ma come più questo questa anche mi ti ci se perché cosa dove quando tutto sei hai ho ha siamo molto bene già solo niente",
    es: "el la los las que de no un una es en por con para se lo me mi tu yo pero muy sí como más está estoy eres soy qué cómo porque cuando todo hay esto esta bien ya aquí nada",
    de: "der die das und ist nicht ich du er sie es wir ihr ein eine zu mit auf für den dem ja nein aber was auch wie bin hast habe wird sind mir dir mich dich warum wo wenn noch schon nur hier",
    pt: "o os as que de não um uma é em por com para se eu você mas muito sim como mais está estou são foi tem isso esta bem já aqui nada ele ela nós eles obrigado",
  };
  const SETS = {};
  for (const k in STOP) SETS[k] = new Set(STOP[k].split(/\s+/));
  const HINTS = { tr: /[ğışİı]/g, es: /[ñ¿¡]/g, de: /[ßä]/g, pt: /[ãõ]/g, fr: /[êëèùûœ]/g, it: /[ìò]/g };

  function scripts(text) {
    let lat = 0, cyr = 0, ar = 0;
    for (const ch of text) {
      if (/[A-Za-zÀ-ÿĞğİıŞşŒœß]/.test(ch)) lat++;
      else if (/[Ѐ-ӿ]/.test(ch)) cyr++;
      else if (/[؀-ۿ]/.test(ch)) ar++;
    }
    return { lat, cyr, ar, all: lat + cyr + ar };
  }

  // {scores:{lang:n}, best, bestScore} (Latin diller); ru/ar yazı türüyle ayrılır.
  function detect(text) {
    const sc = scripts(text);
    if (sc.all < 3) return { best: "", bestScore: 0, scores: {} };
    if (sc.cyr / sc.all > 0.5) return { best: "ru", bestScore: 10, scores: { ru: 10 } };
    if (sc.ar / sc.all > 0.5) return { best: "ar", bestScore: 10, scores: { ar: 10 } };
    const lower = text.replace(/İ/g, "i").replace(/I/g, "ı").toLowerCase();
    const tokens = lower.split(/[^a-zçğıöşüàâäèéêëìîïòôöùûüñãõœß']+/).filter(Boolean);
    const scores = {};
    for (const k in SETS) scores[k] = 0;
    for (const tk of tokens) {
      for (const part of tk.split("'")) {
        const w = part.length >= 2 ? part : "";
        if (!w) continue;
        for (const k in SETS) if (SETS[k].has(w)) scores[k]++;
      }
      if (tk.includes("'")) for (const k in SETS) if (SETS[k].has(tk)) scores[k]++;
    }
    for (const k in HINTS) { const m = lower.match(HINTS[k]); if (m) scores[k] += Math.min(3, m.length) * 1.5; }
    let best = "", bestScore = 0;
    for (const k in scores) if (scores[k] > bestScore) { best = k; bestScore = scores[k]; }
    return { best, bestScore, scores, scripts: sc };
  }


  // Satırın içine karışmış yabancı kelimeleri bul (ör. Türkçe satırda "let get on with the dialogue").
  // words: küçük harfli kelime listesi, src: beklenen dil. Dönen: aynı uzunlukta boolean dizisi.
  function foreign(words, src) {
    const own = SETS[src] || new Set(), h = HINTS[src];
    const f = words.map((w) => {
      if (own.has(w) || (h && w.match(h))) return false;
      if (/[qwx]/.test(w) && src !== "en") return true;
      for (const k in SETS) if (k !== src && SETS[k].has(w)) return true;
      return false;
    });
    // en az 2 yabancı kelimelik bir öbeğin hemen ardındaki, kendi dilinin izi olmayan kelime de yabancı sayılır
    let run = 0;
    for (let i = 0; i < words.length; i++) {
      if (f[i]) { run++; continue; }
      if (run >= 2 && !own.has(words[i]) && !(h && words[i].match(h)) && !/[çğıöşü]/.test(words[i])) { f[i] = true; run++; } else run = 0;
    }
    return f;
  }

  // Beklenen dil (src) ile karşılaştır: "match" | "mismatch" | "unknown"
  function verdict(text, src) {
    const d = detect(text), sc = scripts(text);
    if (sc.all < 3) return { v: "unknown", lang: "" };
    const srcScript = src === "ru" ? "cyr" : src === "ar" ? "ar" : "lat";
    const textScript = sc.cyr / sc.all > 0.5 ? "cyr" : sc.ar / sc.all > 0.5 ? "ar" : "lat";
    if (textScript !== srcScript) return { v: "mismatch", lang: d.best };
    if (srcScript !== "lat") return { v: "match", lang: src };
    const mine = d.scores[src] || 0;
    if (d.best && d.best !== src && d.bestScore >= 2 && d.bestScore - mine >= 1.5) return { v: "mismatch", lang: d.best };
    if (mine >= 1 && mine >= d.bestScore - 0.5) return { v: "match", lang: src };
    return { v: "unknown", lang: d.best };
  }

  // Son birkaç hükmü hatırlar: belirsiz cümlede, geçmiş yanlış dil diyorsa çalıştırmaz.
  function Guard() { this.h = []; }
  Guard.prototype.check = function (text, src) {
    const r = verdict(text, src);
    this.h.push(r.v); if (this.h.length > 5) this.h.shift();
    let v = r.v;
    if (v === "unknown" && this.h.filter((x) => x === "mismatch").length >= 2) v = "mismatch";
    return { ok: v !== "mismatch", v, lang: r.lang };
  };
  Guard.prototype.reset = function () { this.h = []; };

  const NAMES = {
    tr: { tr: "Türkçe", en: "İngilizce", fr: "Fransızca", it: "İtalyanca", de: "Almanca", es: "İspanyolca", pt: "Portekizce", ru: "Rusça", ar: "Arapça" },
    en: { tr: "Turkish", en: "English", fr: "French", it: "Italian", de: "German", es: "Spanish", pt: "Portuguese", ru: "Russian", ar: "Arabic" },
    fr: { tr: "turc", en: "anglais", fr: "français", it: "italien", de: "allemand", es: "espagnol", pt: "portugais", ru: "russe", ar: "arabe" },
    it: { tr: "turco", en: "inglese", fr: "francese", it: "italiano", de: "tedesco", es: "spagnolo", pt: "portoghese", ru: "russo", ar: "arabo" },
    de: { tr: "Türkisch", en: "Englisch", fr: "Französisch", it: "Italienisch", de: "Deutsch", es: "Spanisch", pt: "Portugiesisch", ru: "Russisch", ar: "Arabisch" },
    es: { tr: "turco", en: "inglés", fr: "francés", it: "italiano", de: "alemán", es: "español", pt: "portugués", ru: "ruso", ar: "árabe" },
  };
  const S = {
    en: { on: "On", off: "Off", status_on: "Translating subtitles", status_off: "Off: nothing is translated", subLang: "Subtitle language", transLang: "Translate to", key: "Extension key", keyPh: "Get it from your panel and paste it here", save: "Save key", saved: "Saved", panel: "Open my panel",
      detected: "Subtitles on this page look {0}", mismatchPopup: "Subtitles look {0}, not {1}: paused", sameLang: "The two languages must differ.", hint: "Turn it on only when subtitles are in the language you picked.",
      epMissing: "⚠ Episode not found, words are not tagged", reload: "⚠ Extension updated. Reload this tab (F5).", noAnswer: "⚠ No answer from the server. Is it up?", noKey: "⚠ No extension key: click the extension icon and paste it.", mismatch: "Subtitles look {0}, but you chose {1}. Translation paused." },
    tr: { on: "Açık", off: "Kapalı", status_on: "Altyazılar çevriliyor", status_off: "Kapalı: hiçbir şey çevrilmez", subLang: "Altyazı dili", transLang: "Çeviri dili", key: "Eklenti anahtarı", keyPh: "Panelinden al, buraya yapıştır", save: "Anahtarı kaydet", saved: "Kaydedildi", panel: "Panelimi aç",
      detected: "Bu sayfadaki altyazı {0} görünüyor", mismatchPopup: "Altyazı {0} görünüyor, {1} değil: durduruldu", sameLang: "İki dil farklı olmalı.", hint: "Sadece altyazı seçtiğin dildeyken aç.",
      epMissing: "⚠ Bölüm okunamadı, kelimeler bölüme etiketlenmiyor", reload: "⚠ Eklenti yenilendi. Bu sekmeyi F5'le.", noAnswer: "⚠ Sunucudan cevap gelmiyor. Sunucu açık mı?", noKey: "⚠ Eklenti anahtarı girilmemiş: eklenti simgesine tıklayıp yapıştır.", mismatch: "Altyazı {0} görünüyor ama {1} seçtin. Çeviri durduruldu." },
    fr: { on: "Activé", off: "Désactivé", status_on: "Sous-titres en cours de traduction", status_off: "Désactivé : rien n'est traduit", subLang: "Langue des sous-titres", transLang: "Traduire en", key: "Clé de l'extension", keyPh: "Copie-la depuis ton panneau", save: "Enregistrer la clé", saved: "Enregistré", panel: "Ouvrir mon panneau",
      detected: "Les sous-titres de cette page semblent être en {0}", mismatchPopup: "Sous-titres en {0}, pas en {1} : en pause", sameLang: "Les deux langues doivent différer.", hint: "Active-le seulement si les sous-titres sont dans la langue choisie.",
      epMissing: "⚠ Épisode introuvable, mots non étiquetés", reload: "⚠ Extension mise à jour. Recharge l'onglet (F5).", noAnswer: "⚠ Pas de réponse du serveur.", noKey: "⚠ Clé manquante : clique sur l'icône de l'extension et colle-la.", mismatch: "Les sous-titres semblent être en {0}, mais tu as choisi {1}. Traduction en pause." },
    it: { on: "Attivo", off: "Spento", status_on: "Sottotitoli in traduzione", status_off: "Spento: nulla viene tradotto", subLang: "Lingua dei sottotitoli", transLang: "Traduci in", key: "Chiave dell'estensione", keyPh: "Copiala dal pannello e incollala qui", save: "Salva chiave", saved: "Salvato", panel: "Apri il mio pannello",
      detected: "I sottotitoli di questa pagina sembrano in {0}", mismatchPopup: "Sottotitoli in {0}, non {1}: in pausa", sameLang: "Le due lingue devono essere diverse.", hint: "Attivalo solo se i sottotitoli sono nella lingua scelta.",
      epMissing: "⚠ Episodio non trovato, parole senza etichetta", reload: "⚠ Estensione aggiornata. Ricarica la scheda (F5).", noAnswer: "⚠ Nessuna risposta dal server.", noKey: "⚠ Chiave mancante: clicca l'icona dell'estensione e incollala.", mismatch: "I sottotitoli sembrano in {0}, ma hai scelto {1}. Traduzione in pausa." },
    de: { on: "An", off: "Aus", status_on: "Untertitel werden übersetzt", status_off: "Aus: nichts wird übersetzt", subLang: "Untertitelsprache", transLang: "Übersetzen nach", key: "Erweiterungsschlüssel", keyPh: "Aus dem Panel kopieren und hier einfügen", save: "Schlüssel speichern", saved: "Gespeichert", panel: "Mein Panel öffnen",
      detected: "Untertitel auf dieser Seite wirken wie {0}", mismatchPopup: "Untertitel sind {0}, nicht {1}: pausiert", sameLang: "Die Sprachen müssen verschieden sein.", hint: "Nur einschalten, wenn die Untertitel in der gewählten Sprache sind.",
      epMissing: "⚠ Folge nicht gefunden, Wörter ohne Zuordnung", reload: "⚠ Erweiterung aktualisiert. Tab neu laden (F5).", noAnswer: "⚠ Keine Antwort vom Server.", noKey: "⚠ Kein Schlüssel: Erweiterungssymbol anklicken und einfügen.", mismatch: "Untertitel wirken wie {0}, du hast aber {1} gewählt. Übersetzung pausiert." },
    es: { on: "Activada", off: "Desactivada", status_on: "Traduciendo subtítulos", status_off: "Desactivada: no se traduce nada", subLang: "Idioma de los subtítulos", transLang: "Traducir a", key: "Clave de la extensión", keyPh: "Cópiala de tu panel y pégala aquí", save: "Guardar clave", saved: "Guardado", panel: "Abrir mi panel",
      detected: "Los subtítulos de esta página parecen en {0}", mismatchPopup: "Subtítulos en {0}, no en {1}: en pausa", sameLang: "Los dos idiomas deben ser distintos.", hint: "Actívala solo si los subtítulos están en el idioma elegido.",
      epMissing: "⚠ Episodio no encontrado, palabras sin etiqueta", reload: "⚠ Extensión actualizada. Recarga la pestaña (F5).", noAnswer: "⚠ El servidor no responde.", noKey: "⚠ Falta la clave: pulsa el icono de la extensión y pégala.", mismatch: "Los subtítulos parecen en {0}, pero elegiste {1}. Traducción en pausa." },
  };
  function ui() { const n = ((root.navigator && navigator.language) || "en").slice(0, 2).toLowerCase(); return S[n] ? n : "en"; }
  function t(key) {
    const l = ui(); let s = (S[l] && S[l][key]) || S.en[key] || key;
    for (let i = 1; i < arguments.length; i++) s = s.split("{" + (i - 1) + "}").join(arguments[i]);
    return s;
  }
  const langName = (c) => (NAMES[ui()] || NAMES.en)[c] || c;
  root.CVL = { foreign, detect, verdict, Guard, t, langName, ui };
  if (typeof module !== "undefined") module.exports = root.CVL;
})(typeof self !== "undefined" ? self : globalThis);
