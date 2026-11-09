/* CineVocab: altyazı dili tahmini + küçük arayüz metinleri (içerik betiği ve açılır pencere ortak kullanır). */
(function (root) {
  const STOP = {
    tr: "ve bir bu da için ne ama çok daha gibi var yok ben sen biz siz ki mi mı mu mü değil evet hayır şey ile her şu kadar sonra ya şimdi nasıl neden bana sana onu bunu olarak çünkü hiç bile artık tamam lütfen",
    en: "let the and you that is it to of in not this for are was with have be what he she we they do but your me my on at so if can will just don't i'm it's that's there here know no yes about like get go out up how why when who all one",
    fr: "le la les des est une un et en que qui pas pour dans ce je tu il elle nous vous ils sur avec ne se mais au du plus suis très oui non c'est qu'il est-ce pourquoi comment quoi bien tout fait être avoir ça cette sont fais",
    it: "il lo la gli che non di un una per sono con è ma come più questo questa anche mi ti ci se perché cosa dove quando tutto sei hai ho ha siamo molto bene già solo niente",
    es: "el la los las que de no un una es en por con para se lo me mi tu yo pero muy sí como más está estoy eres soy qué cómo porque cuando todo hay esto esta bien ya aquí nada",
    de: "der die das und ist nicht ich du er sie es wir ihr ein eine zu mit auf für den dem ja nein aber was auch wie bin hast habe wird sind mir dir mich dich warum wo wenn noch schon nur hier",
    ro: "și sau nu da este sunt eu tu el ea noi voi ei ele un o de la cu pe în pentru că ce cum dar mai foarte bine acum aici acolo nimic totul mulțumesc te rog sunt ești suntem aveți",
    id: "yang dan di ke dari ini itu dengan untuk tidak ada saya kamu dia kami kita mereka adalah akan sudah bisa apa siapa kenapa bagaimana ya tidak bukan juga atau tetapi sangat lebih sudah belum hanya sini sana terima kasih",
    pl: "i w nie na to jest się że z do jak co ale czy tak ja ty on ona my wy oni jestem jesteś są był dla po tylko już jeszcze bardzo proszę dziękuję tutaj tam nic wszystko",
    nl: "de het een en van ik je jij hij zij wij jullie ze dat dit is zijn niet maar ook voor met op aan er wat hoe waarom ja nee heel nog al hier daar niets alles alsjeblieft dank",
    pt: "o os as que de não um uma é em por com para se eu você mas muito sim como mais está estou são foi tem isso esta bem já aqui nada ele ela nós eles obrigado",
  };
  const SETS = {};
  for (const k in STOP) SETS[k] = new Set(STOP[k].split(/\s+/));
  const HINTS = { pl: /[ąęłńśźż]/g, nl: /ij/g, tr: /[ğışİı]/g, es: /[ñ¿¡]/g, de: /[ßä]/g, pt: /[ãõ]/g, ro: /[ășțşţ]/g, fr: /[êëèùûœ]/g, it: /[ìò]/g };

  function scripts(text) {
    let lat = 0, cyr = 0, ar = 0, ja = 0, dev = 0, ko = 0;
    for (const ch of text) {
      if (/[぀-ヿ㐀-䶿一-鿿ｦ-ﾟ]/.test(ch)) ja++;
      else if (/[가-힣ᄀ-ᇿ]/.test(ch)) ko++;
      else if (/[ऀ-ॿ]/.test(ch)) dev++;
      else if (/[A-Za-zÀ-ÿĀ-ſȘșȚțŒœß]/.test(ch)) lat++;
      else if (/[Ѐ-ӿ]/.test(ch)) cyr++;
      else if (/[؀-ۿ]/.test(ch)) ar++;
    }
    return { lat, cyr, ar, ja, dev, ko, all: lat + cyr + ar + ja + dev + ko };
  }

  // {scores:{lang:n}, best, bestScore} (Latin diller); ru/ar yazı türüyle ayrılır.
  function detect(text) {
    const sc = scripts(text);
    if (sc.all < 3) return { best: "", bestScore: 0, scores: {} };
    if (sc.cyr / sc.all > 0.5) return { best: "ru", bestScore: 10, scores: { ru: 10 } };
    if (sc.ar / sc.all > 0.5) return { best: "ar", bestScore: 10, scores: { ar: 10 } };
    if (sc.ja / sc.all > 0.5) return { best: "ja", bestScore: 10, scores: { ja: 10 } };
    if (sc.dev / sc.all > 0.5) return { best: "hi", bestScore: 10, scores: { hi: 10 } };
    if (sc.ko / sc.all > 0.5) return { best: "ko", bestScore: 10, scores: { ko: 10 } };
    const lower = text.replace(/İ/g, "i").replace(/I/g, "ı").toLowerCase();
    const tokens = lower.split(/[^a-zçğıöşüàâäèéêëìîïòôöùûüñãõœßăîșțţ']+/).filter(Boolean);
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
    const srcScript = { ru: "cyr", ar: "ar", ja: "ja", hi: "dev", ko: "ko" }[src] || "lat";
    const textScript = sc.cyr / sc.all > 0.5 ? "cyr" : sc.ar / sc.all > 0.5 ? "ar" : sc.ja / sc.all > 0.5 ? "ja" : sc.dev / sc.all > 0.5 ? "dev" : sc.ko / sc.all > 0.5 ? "ko" : "lat";
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
    tr: { tr: "Türkçe", en: "İngilizce", fr: "Fransızca", it: "İtalyanca", de: "Almanca", es: "İspanyolca", pt: "Portekizce", ru: "Rusça", ar: "Arapça", ro: "Rumence", ja: "Japonca", hi: "Hintçe", id: "Endonezce", pl: "Lehçe", nl: "Felemenkçe", ko: "Korece" },
    en: { tr: "Turkish", en: "English", fr: "French", it: "Italian", de: "German", es: "Spanish", pt: "Portuguese", ru: "Russian", ar: "Arabic", ro: "Romanian", ja: "Japanese", hi: "Hindi", id: "Indonesian", pl: "Polish", nl: "Dutch", ko: "Korean" },
    fr: { tr: "turc", en: "anglais", fr: "français", it: "italien", de: "allemand", es: "espagnol", pt: "portugais", ru: "russe", ar: "arabe", ro: "roumain", ja: "japonais", hi: "hindi", id: "indonésien", pl: "polonais", nl: "néerlandais", ko: "coréen" },
    it: { tr: "turco", en: "inglese", fr: "francese", it: "italiano", de: "tedesco", es: "spagnolo", pt: "portoghese", ru: "russo", ar: "arabo", ro: "rumeno", ja: "giapponese", hi: "hindi", id: "indonesiano", pl: "polacco", nl: "olandese", ko: "coreano" },
    de: { tr: "Türkisch", en: "Englisch", fr: "Französisch", it: "Italienisch", de: "Deutsch", es: "Spanisch", pt: "Portugiesisch", ru: "Russisch", ar: "Arabisch", ro: "Rumänisch", ja: "Japanisch", hi: "Hindi", id: "Indonesisch", pl: "Polnisch", nl: "Niederländisch", ko: "Koreanisch" },
    es: { tr: "turco", en: "inglés", fr: "francés", it: "italiano", de: "alemán", es: "español", pt: "portugués", ru: "ruso", ar: "árabe", ro: "rumano", ja: "japonés", hi: "hindi", id: "indonesio", pl: "polaco", nl: "neerlandés", ko: "coreano" },
  };
  const S = {
    en: { on: "On", boxTitle: "Subtitle box", boxPos: "Position", posTL: "Top left", posTR: "Top right", posBL: "Bottom left", posBR: "Bottom right", posTC: "Top center", posBC: "Bottom center", boxSize: "Text size", sizeS: "Small", sizeM: "Medium", sizeL: "Large", boxOp: "Background", off: "Off", status_on: "Translating subtitles", status_off: "Off: nothing is translated", subLang: "Subtitle language", transLang: "Translate to", key: "Extension key", keyPh: "Get it from your panel and paste it here", save: "Save key", saved: "Saved", panel: "Open my panel",
      detected: "Subtitles on this page look {0}", mismatchPopup: "Subtitles look {0}, not {1}: paused", sameLang: "The two languages must differ.", hint: "Turn it on only when subtitles are in the language you picked.",
      epMissing: "⚠ Episode not found, words are not tagged", reload: "⚠ Extension updated. Reload this tab (F5).", noAnswer: "⚠ No answer from the server. Is it up?", noKey: "⚠ No extension key: click the extension icon and paste it.", mismatch: "Subtitles look {0}, but you chose {1}. Translation paused." },
    tr: { on: "Açık", boxTitle: "Çeviri kutusu", boxPos: "Konum", posTL: "Sol üst", posTR: "Sağ üst", posBL: "Sol alt", posBR: "Sağ alt", posTC: "Üst orta", posBC: "Alt orta", boxSize: "Yazı boyutu", sizeS: "Küçük", sizeM: "Orta", sizeL: "Büyük", boxOp: "Arka plan", off: "Kapalı", status_on: "Altyazılar çevriliyor", status_off: "Kapalı: hiçbir şey çevrilmez", subLang: "Altyazı dili", transLang: "Çeviri dili", key: "Eklenti anahtarı", keyPh: "Panelinden al, buraya yapıştır", save: "Anahtarı kaydet", saved: "Kaydedildi", panel: "Panelimi aç",
      detected: "Bu sayfadaki altyazı {0} görünüyor", mismatchPopup: "Altyazı {0} görünüyor, {1} değil: durduruldu", sameLang: "İki dil farklı olmalı.", hint: "Sadece altyazı seçtiğin dildeyken aç.",
      epMissing: "⚠ Bölüm okunamadı, kelimeler bölüme etiketlenmiyor", reload: "⚠ Eklenti yenilendi. Bu sekmeyi F5'le.", noAnswer: "⚠ Sunucudan cevap gelmiyor. Sunucu açık mı?", noKey: "⚠ Eklenti anahtarı girilmemiş: eklenti simgesine tıklayıp yapıştır.", mismatch: "Altyazı {0} görünüyor ama {1} seçtin. Çeviri durduruldu." },
    fr: { on: "Activé", boxTitle: "Boîte de traduction", boxPos: "Position", posTL: "Haut gauche", posTR: "Haut droite", posBL: "Bas gauche", posBR: "Bas droite", posTC: "Haut centre", posBC: "Bas centre", boxSize: "Taille du texte", sizeS: "Petite", sizeM: "Moyenne", sizeL: "Grande", boxOp: "Fond", off: "Désactivé", status_on: "Sous-titres en cours de traduction", status_off: "Désactivé : rien n'est traduit", subLang: "Langue des sous-titres", transLang: "Traduire en", key: "Clé de l'extension", keyPh: "Copie-la depuis ton panneau", save: "Enregistrer la clé", saved: "Enregistré", panel: "Ouvrir mon panneau",
      detected: "Les sous-titres de cette page semblent être en {0}", mismatchPopup: "Sous-titres en {0}, pas en {1} : en pause", sameLang: "Les deux langues doivent différer.", hint: "Active-le seulement si les sous-titres sont dans la langue choisie.",
      epMissing: "⚠ Épisode introuvable, mots non étiquetés", reload: "⚠ Extension mise à jour. Recharge l'onglet (F5).", noAnswer: "⚠ Pas de réponse du serveur.", noKey: "⚠ Clé manquante : clique sur l'icône de l'extension et colle-la.", mismatch: "Les sous-titres semblent être en {0}, mais tu as choisi {1}. Traduction en pause." },
    it: { on: "Attivo", boxTitle: "Riquadro traduzione", boxPos: "Posizione", posTL: "In alto a sinistra", posTR: "In alto a destra", posBL: "In basso a sinistra", posBR: "In basso a destra", posTC: "In alto al centro", posBC: "In basso al centro", boxSize: "Dimensione testo", sizeS: "Piccola", sizeM: "Media", sizeL: "Grande", boxOp: "Sfondo", off: "Spento", status_on: "Sottotitoli in traduzione", status_off: "Spento: nulla viene tradotto", subLang: "Lingua dei sottotitoli", transLang: "Traduci in", key: "Chiave dell'estensione", keyPh: "Copiala dal pannello e incollala qui", save: "Salva chiave", saved: "Salvato", panel: "Apri il mio pannello",
      detected: "I sottotitoli di questa pagina sembrano in {0}", mismatchPopup: "Sottotitoli in {0}, non {1}: in pausa", sameLang: "Le due lingue devono essere diverse.", hint: "Attivalo solo se i sottotitoli sono nella lingua scelta.",
      epMissing: "⚠ Episodio non trovato, parole senza etichetta", reload: "⚠ Estensione aggiornata. Ricarica la scheda (F5).", noAnswer: "⚠ Nessuna risposta dal server.", noKey: "⚠ Chiave mancante: clicca l'icona dell'estensione e incollala.", mismatch: "I sottotitoli sembrano in {0}, ma hai scelto {1}. Traduzione in pausa." },
    de: { on: "An", boxTitle: "Übersetzungsfeld", boxPos: "Position", posTL: "Oben links", posTR: "Oben rechts", posBL: "Unten links", posBR: "Unten rechts", posTC: "Oben Mitte", posBC: "Unten Mitte", boxSize: "Textgröße", sizeS: "Klein", sizeM: "Mittel", sizeL: "Groß", boxOp: "Hintergrund", off: "Aus", status_on: "Untertitel werden übersetzt", status_off: "Aus: nichts wird übersetzt", subLang: "Untertitelsprache", transLang: "Übersetzen nach", key: "Erweiterungsschlüssel", keyPh: "Aus dem Panel kopieren und hier einfügen", save: "Schlüssel speichern", saved: "Gespeichert", panel: "Mein Panel öffnen",
      detected: "Untertitel auf dieser Seite wirken wie {0}", mismatchPopup: "Untertitel sind {0}, nicht {1}: pausiert", sameLang: "Die Sprachen müssen verschieden sein.", hint: "Nur einschalten, wenn die Untertitel in der gewählten Sprache sind.",
      epMissing: "⚠ Folge nicht gefunden, Wörter ohne Zuordnung", reload: "⚠ Erweiterung aktualisiert. Tab neu laden (F5).", noAnswer: "⚠ Keine Antwort vom Server.", noKey: "⚠ Kein Schlüssel: Erweiterungssymbol anklicken und einfügen.", mismatch: "Untertitel wirken wie {0}, du hast aber {1} gewählt. Übersetzung pausiert." },
    es: { on: "Activada", boxTitle: "Cuadro de traducción", boxPos: "Posición", posTL: "Arriba izquierda", posTR: "Arriba derecha", posBL: "Abajo izquierda", posBR: "Abajo derecha", posTC: "Arriba centro", posBC: "Abajo centro", boxSize: "Tamaño del texto", sizeS: "Pequeño", sizeM: "Medio", sizeL: "Grande", boxOp: "Fondo", off: "Desactivada", status_on: "Traduciendo subtítulos", status_off: "Desactivada: no se traduce nada", subLang: "Idioma de los subtítulos", transLang: "Traducir a", key: "Clave de la extensión", keyPh: "Cópiala de tu panel y pégala aquí", save: "Guardar clave", saved: "Guardado", panel: "Abrir mi panel",
      detected: "Los subtítulos de esta página parecen en {0}", mismatchPopup: "Subtítulos en {0}, no en {1}: en pausa", sameLang: "Los dos idiomas deben ser distintos.", hint: "Actívala solo si los subtítulos están en el idioma elegido.",
      epMissing: "⚠ Episodio no encontrado, palabras sin etiqueta", reload: "⚠ Extensión actualizada. Recarga la pestaña (F5).", noAnswer: "⚠ El servidor no responde.", noKey: "⚠ Falta la clave: pulsa el icono de la extensión y pégala.", mismatch: "Los subtítulos parecen en {0}, pero elegiste {1}. Traducción en pausa." },
  };
  Object.assign(S.en, {"gTitle": "Save your words in 3 steps", "g1": "Create a free account on the CineVocab site.", "g2": "There, open Settings and press “Create key”.", "g3": "Paste the key below and press “Save key”.", "gOpen": "Create account / sign in", "gNote": "Without a key you still see translations, but your words are not saved.", "keyOk": "✓ Connected. Your words are saved to your account."});
  Object.assign(S.tr, {"gTitle": "Kelimelerini 3 adımda kaydet", "g1": "CineVocab sitesinde ücretsiz hesap aç.", "g2": "Orada Ayarlar'ı aç, “Anahtar oluştur”a bas.", "g3": "Anahtarı aşağıya yapıştır, “Anahtarı kaydet”e bas.", "gOpen": "Hesap aç / giriş yap", "gNote": "Anahtar olmadan çeviriyi görürsün ama kelimelerin kaydolmaz.", "keyOk": "✓ Bağlandı. Kelimelerin hesabına kaydediliyor."});
  Object.assign(S.fr, {"gTitle": "Enregistre tes mots en 3 étapes", "g1": "Crée un compte gratuit sur le site CineVocab.", "g2": "Ouvre-y Réglages et appuie sur « Créer une clé ».", "g3": "Colle la clé ci-dessous et appuie sur « Enregistrer la clé ».", "gOpen": "Créer un compte / se connecter", "gNote": "Sans clé, tu vois les traductions, mais tes mots ne sont pas enregistrés.", "keyOk": "✓ Connecté. Tes mots sont enregistrés sur ton compte."});
  Object.assign(S.it, {"gTitle": "Salva le tue parole in 3 passaggi", "g1": "Crea un account gratuito sul sito CineVocab.", "g2": "Lì apri Impostazioni e premi «Crea chiave».", "g3": "Incolla la chiave qui sotto e premi «Salva chiave».", "gOpen": "Crea account / accedi", "gNote": "Senza chiave vedi le traduzioni, ma le parole non vengono salvate.", "keyOk": "✓ Collegato. Le tue parole vengono salvate nel tuo account."});
  Object.assign(S.de, {"gTitle": "Speichere deine Wörter in 3 Schritten", "g1": "Erstelle auf der CineVocab-Seite ein kostenloses Konto.", "g2": "Öffne dort Einstellungen und tippe auf „Schlüssel erstellen“.", "g3": "Füge den Schlüssel unten ein und tippe auf „Schlüssel speichern“.", "gOpen": "Konto erstellen / anmelden", "gNote": "Ohne Schlüssel siehst du Übersetzungen, aber deine Wörter werden nicht gespeichert.", "keyOk": "✓ Verbunden. Deine Wörter werden in deinem Konto gespeichert."});
  Object.assign(S.es, {"gTitle": "Guarda tus palabras en 3 pasos", "g1": "Crea una cuenta gratuita en el sitio de CineVocab.", "g2": "Allí abre Ajustes y pulsa «Crear clave».", "g3": "Pega la clave abajo y pulsa «Guardar clave».", "gOpen": "Crear cuenta / iniciar sesión", "gNote": "Sin clave ves las traducciones, pero tus palabras no se guardan.", "keyOk": "✓ Conectado. Tus palabras se guardan en tu cuenta."});
  Object.assign(S.en, {"howTitle": "How it works", "h1": "Open a video on Prime Video, YouTube, Netflix or Udemy and turn its subtitles on.", "h2": "Below, pick the language of those subtitles and the language you want the translations in.", "h3": "Switch CineVocab on. Every subtitle word is shown with its translation right above it.", "hNote": "No account needed to translate. A free account only adds a saved word list, practice and duels.", "siteNote": "Open a video on Prime Video, YouTube, Netflix or Udemy to start. If the tab was already open, reload it (F5).", "keyHelp": "Optional. Paste the key from your CineVocab panel to save words to your account.", "subLang": "Subtitles are in", "transLang": "Show translations in", "key": "Extension key (optional)"});
  Object.assign(S.tr, {"howTitle": "Nasıl çalışır?", "h1": "Prime Video, YouTube, Netflix ya da Udemy'de bir video aç ve altyazıyı aç.", "h2": "Aşağıdan o altyazının dilini ve çevirilerin hangi dilde görüneceğini seç.", "h3": "CineVocab'ı aç. Altyazıdaki her kelimenin çevirisi hemen üstünde görünür.", "hNote": "Çeviri için hesap gerekmez. Ücretsiz hesap yalnızca kelime listesi, pratik ve düello ekler.", "siteNote": "Başlamak için Prime Video, YouTube, Netflix ya da Udemy'de bir video aç. Sekme zaten açıksa yenile (F5).", "keyHelp": "İsteğe bağlı. Kelimeleri hesabına kaydetmek için CineVocab panelindeki anahtarı yapıştır.", "subLang": "Altyazı şu dilde", "transLang": "Çeviriler şu dilde", "key": "Eklenti anahtarı (isteğe bağlı)"});
  Object.assign(S.fr, {"howTitle": "Comment ça marche", "h1": "Ouvre une vidéo sur Prime Video, YouTube, Netflix ou Udemy et active ses sous-titres.", "h2": "Ci-dessous, choisis la langue de ces sous-titres et la langue des traductions.", "h3": "Active CineVocab. Chaque mot des sous-titres s'affiche avec sa traduction juste au-dessus.", "hNote": "Aucun compte n'est nécessaire pour traduire. Un compte gratuit ajoute seulement la liste de mots, l'entraînement et les duels.", "siteNote": "Ouvre une vidéo sur Prime Video, YouTube, Netflix ou Udemy pour commencer. Si l'onglet était déjà ouvert, recharge-le (F5).", "keyHelp": "Facultatif. Colle la clé de ton panneau CineVocab pour enregistrer les mots dans ton compte.", "subLang": "Les sous-titres sont en", "transLang": "Afficher les traductions en", "key": "Clé de l'extension (facultatif)"});
  Object.assign(S.it, {"howTitle": "Come funziona", "h1": "Apri un video su Prime Video, YouTube, Netflix o Udemy e attiva i sottotitoli.", "h2": "Qui sotto scegli la lingua di quei sottotitoli e la lingua delle traduzioni.", "h3": "Attiva CineVocab. Ogni parola dei sottotitoli appare con la sua traduzione subito sopra.", "hNote": "Per tradurre non serve un account. Un account gratuito aggiunge solo l'elenco delle parole, gli esercizi e i duelli.", "siteNote": "Apri un video su Prime Video, YouTube, Netflix o Udemy per iniziare. Se la scheda era già aperta, ricaricala (F5).", "keyHelp": "Facoltativo. Incolla la chiave del tuo pannello CineVocab per salvare le parole nel tuo account.", "subLang": "I sottotitoli sono in", "transLang": "Mostra le traduzioni in", "key": "Chiave dell'estensione (facoltativa)"});
  Object.assign(S.de, {"howTitle": "So funktioniert es", "h1": "Öffne ein Video auf Prime Video, YouTube, Netflix oder Udemy und schalte die Untertitel ein.", "h2": "Wähle unten die Sprache dieser Untertitel und die Sprache der Übersetzungen.", "h3": "Schalte CineVocab ein. Jedes Untertitelwort erscheint mit seiner Übersetzung direkt darüber.", "hNote": "Zum Übersetzen ist kein Konto nötig. Ein kostenloses Konto bringt nur die Wortliste, das Training und die Duelle dazu.", "siteNote": "Öffne zum Starten ein Video auf Prime Video, YouTube, Netflix oder Udemy. War der Tab schon offen, lade ihn neu (F5).", "keyHelp": "Optional. Füge den Schlüssel aus deinem CineVocab-Bereich ein, um Wörter in deinem Konto zu speichern.", "subLang": "Untertitel sind auf", "transLang": "Übersetzungen anzeigen auf", "key": "Erweiterungsschlüssel (optional)"});
  Object.assign(S.es, {"howTitle": "Cómo funciona", "h1": "Abre un vídeo en Prime Video, YouTube, Netflix o Udemy y activa sus subtítulos.", "h2": "Abajo elige el idioma de esos subtítulos y el idioma de las traducciones.", "h3": "Activa CineVocab. Cada palabra del subtítulo aparece con su traducción justo encima.", "hNote": "No hace falta cuenta para traducir. Una cuenta gratuita solo añade la lista de palabras, la práctica y los duelos.", "siteNote": "Abre un vídeo en Prime Video, YouTube, Netflix o Udemy para empezar. Si la pestaña ya estaba abierta, recárgala (F5).", "keyHelp": "Opcional. Pega la clave de tu panel de CineVocab para guardar las palabras en tu cuenta.", "subLang": "Los subtítulos están en", "transLang": "Mostrar traducciones en", "key": "Clave de la extensión (opcional)"});
  S.pt = {"on":"Ativado","boxTitle":"Caixa de legendas","boxPos":"Posição","posTL":"Superior esquerdo","posTR":"Superior direito","posBL":"Inferior esquerdo","posBR":"Inferior direito","posTC":"Superior central","posBC":"Inferior central","boxSize":"Tamanho do texto","sizeS":"Pequeno","sizeM":"Médio","sizeL":"Grande","boxOp":"Fundo","off":"Desativado","status_on":"Traduzindo as legendas","status_off":"Desativado: nada é traduzido","subLang":"As legendas estão em","transLang":"Mostrar traduções em","key":"Chave da extensão (opcional)","keyPh":"Copie do seu painel e cole aqui","save":"Salvar chave","saved":"Salvo","panel":"Abrir meu painel","detected":"As legendas desta página parecem estar em {0}","mismatchPopup":"As legendas parecem estar em {0}, não em {1}: pausado","sameLang":"Os dois idiomas precisam ser diferentes.","hint":"Ative só quando as legendas estiverem no idioma escolhido.","epMissing":"⚠ Episódio não encontrado, as palavras ficam sem etiqueta","reload":"⚠ Extensão atualizada. Recarregue esta aba (F5).","noAnswer":"⚠ O servidor não respondeu. Está no ar?","noKey":"⚠ Sem chave da extensão: clique no ícone da extensão e cole a chave.","mismatch":"As legendas parecem estar em {0}, mas você escolheu {1}. Tradução pausada.","gTitle":"Salve suas palavras em 3 passos","g1":"Crie uma conta gratuita no site do CineVocab.","g2":"Lá, abra Configurações e toque em “Criar chave”.","g3":"Cole a chave abaixo e toque em “Salvar chave”.","gOpen":"Criar conta / entrar","gNote":"Sem a chave você continua vendo as traduções, mas suas palavras não são salvas.","keyOk":"✓ Conectado. Suas palavras são salvas na sua conta.","howTitle":"Como funciona","h1":"Abra um vídeo no Prime Video, YouTube, Netflix ou Udemy e ative as legendas.","h2":"Abaixo, escolha o idioma dessas legendas e o idioma em que quer ver as traduções.","h3":"Ative o CineVocab. Cada palavra da legenda aparece com a tradução logo acima.","hNote":"Não precisa de conta para traduzir. A conta gratuita só adiciona lista de palavras salvas, prática e duelos.","siteNote":"Abra um vídeo no Prime Video, YouTube, Netflix ou Udemy para começar. Se a aba já estava aberta, recarregue (F5).","keyHelp":"Opcional. Cole a chave do seu painel do CineVocab para salvar palavras na sua conta."};
  S.hi = {"on":"चालू","boxTitle":"सबटाइटल बॉक्स","boxPos":"स्थान","posTL":"ऊपर बाएँ","posTR":"ऊपर दाएँ","posBL":"नीचे बाएँ","posBR":"नीचे दाएँ","posTC":"ऊपर बीच में","posBC":"नीचे बीच में","boxSize":"टेक्स्ट का आकार","sizeS":"छोटा","sizeM":"मध्यम","sizeL":"बड़ा","boxOp":"पृष्ठभूमि","off":"बंद","status_on":"सबटाइटल का अनुवाद हो रहा है","status_off":"बंद: कुछ भी अनुवादित नहीं होता","subLang":"सबटाइटल इस भाषा में हैं","transLang":"अनुवाद इस भाषा में दिखाएँ","key":"एक्सटेंशन कुंजी (वैकल्पिक)","keyPh":"अपने पैनल से कॉपी करके यहाँ चिपकाएँ","save":"कुंजी सहेजें","saved":"सहेजा गया","panel":"मेरा पैनल खोलें","detected":"इस पेज के सबटाइटल {0} जैसे लग रहे हैं","mismatchPopup":"सबटाइटल {0} जैसे हैं, {1} नहीं: रुका हुआ है","sameLang":"दोनों भाषाएँ अलग होनी चाहिए।","hint":"इसे तभी चालू करें जब सबटाइटल चुनी हुई भाषा में हों।","epMissing":"⚠ एपिसोड नहीं मिला, शब्दों पर टैग नहीं लगेगा","reload":"⚠ एक्सटेंशन अपडेट हो गया। यह टैब रीलोड करें (F5)।","noAnswer":"⚠ सर्वर से जवाब नहीं मिला। क्या वह चालू है?","noKey":"⚠ एक्सटेंशन कुंजी नहीं है: एक्सटेंशन आइकन पर क्लिक करके उसे चिपकाएँ।","mismatch":"सबटाइटल {0} जैसे लग रहे हैं, लेकिन आपने {1} चुनी है। अनुवाद रुका हुआ है।","gTitle":"3 चरणों में अपने शब्द सहेजें","g1":"CineVocab साइट पर मुफ़्त खाता बनाएँ।","g2":"वहाँ सेटिंग्स खोलें और “कुंजी बनाएँ” दबाएँ।","g3":"कुंजी नीचे चिपकाएँ और “कुंजी सहेजें” दबाएँ।","gOpen":"खाता बनाएँ / साइन इन करें","gNote":"कुंजी के बिना भी अनुवाद दिखते हैं, लेकिन आपके शब्द सहेजे नहीं जाते।","keyOk":"✓ जुड़ गया। आपके शब्द आपके खाते में सहेजे जाते हैं।","howTitle":"यह कैसे काम करता है","h1":"Prime Video, YouTube, Netflix या Udemy पर कोई वीडियो खोलें और सबटाइटल चालू करें।","h2":"नीचे उन सबटाइटल की भाषा और अनुवाद की भाषा चुनें।","h3":"CineVocab चालू करें। सबटाइटल का हर शब्द उसके अनुवाद के साथ ठीक ऊपर दिखता है।","hNote":"अनुवाद के लिए खाता ज़रूरी नहीं। मुफ़्त खाते से सिर्फ़ सहेजी गई शब्द-सूची, अभ्यास और ड्यूल मिलते हैं।","siteNote":"शुरू करने के लिए Prime Video, YouTube, Netflix या Udemy पर वीडियो खोलें। टैब पहले से खुला हो तो रीलोड करें (F5)।","keyHelp":"वैकल्पिक। शब्द अपने खाते में सहेजने के लिए CineVocab पैनल की कुंजी चिपकाएँ।"};
  S.id = {"on":"Aktif","boxTitle":"Kotak subtitle","boxPos":"Posisi","posTL":"Kiri atas","posTR":"Kanan atas","posBL":"Kiri bawah","posBR":"Kanan bawah","posTC":"Tengah atas","posBC":"Tengah bawah","boxSize":"Ukuran teks","sizeS":"Kecil","sizeM":"Sedang","sizeL":"Besar","boxOp":"Latar","off":"Nonaktif","status_on":"Menerjemahkan subtitle","status_off":"Nonaktif: tidak ada yang diterjemahkan","subLang":"Subtitle berbahasa","transLang":"Tampilkan terjemahan dalam","key":"Kunci ekstensi (opsional)","keyPh":"Salin dari panelmu lalu tempel di sini","save":"Simpan kunci","saved":"Tersimpan","panel":"Buka panelku","detected":"Subtitle di halaman ini tampak berbahasa {0}","mismatchPopup":"Subtitle tampak berbahasa {0}, bukan {1}: dijeda","sameLang":"Kedua bahasa harus berbeda.","hint":"Aktifkan hanya saat subtitle berbahasa sesuai pilihanmu.","epMissing":"⚠ Episode tidak ditemukan, kata tidak diberi label","reload":"⚠ Ekstensi diperbarui. Muat ulang tab ini (F5).","noAnswer":"⚠ Server tidak menjawab. Apakah server aktif?","noKey":"⚠ Tidak ada kunci ekstensi: klik ikon ekstensi lalu tempel kuncinya.","mismatch":"Subtitle tampak berbahasa {0}, tetapi kamu memilih {1}. Terjemahan dijeda.","gTitle":"Simpan kata-katamu dalam 3 langkah","g1":"Buat akun gratis di situs CineVocab.","g2":"Di sana, buka Pengaturan dan tekan “Buat kunci”.","g3":"Tempel kunci di bawah lalu tekan “Simpan kunci”.","gOpen":"Buat akun / masuk","gNote":"Tanpa kunci terjemahan tetap muncul, tetapi kata-katamu tidak tersimpan.","keyOk":"✓ Terhubung. Kata-katamu tersimpan di akunmu.","howTitle":"Cara kerjanya","h1":"Buka video di Prime Video, YouTube, Netflix, atau Udemy lalu aktifkan subtitle.","h2":"Di bawah, pilih bahasa subtitle tersebut dan bahasa terjemahan yang kamu inginkan.","h3":"Aktifkan CineVocab. Setiap kata subtitle tampil dengan terjemahannya tepat di atasnya.","hNote":"Tidak perlu akun untuk menerjemahkan. Akun gratis hanya menambah daftar kata tersimpan, latihan, dan duel.","siteNote":"Buka video di Prime Video, YouTube, Netflix, atau Udemy untuk mulai. Jika tab sudah terbuka, muat ulang (F5).","keyHelp":"Opsional. Tempel kunci dari panel CineVocab untuk menyimpan kata ke akunmu."};
  Object.assign(S.en, {"siteEnable": "Turn on for this site", "siteEnableNote": "Works on sites whose video player shows subtitles.", "hideOrig": "Hide the site's own subtitles", "siteOn": "Turned on for this site. If it doesn't start, reload the page.", "siteDenied": "Permission was not granted."});
  Object.assign(S.tr, {"siteEnable": "Bu sitede aç", "siteEnableNote": "Videosunda altyazı gösteren sitelerde çalışır.", "hideOrig": "Sitenin kendi altyazısını gizle", "siteOn": "Bu sitede açıldı. Başlamazsa sayfayı yenile.", "siteDenied": "İzin verilmedi."});
  Object.assign(S.fr, {"siteEnable": "Activer sur ce site", "siteEnableNote": "Fonctionne sur les sites dont le lecteur vidéo affiche des sous-titres.", "hideOrig": "Masquer les sous-titres du site", "siteOn": "Activé sur ce site. Si ça ne démarre pas, recharge la page.", "siteDenied": "Autorisation refusée."});
  Object.assign(S.it, {"siteEnable": "Attiva su questo sito", "siteEnableNote": "Funziona sui siti il cui lettore video mostra i sottotitoli.", "hideOrig": "Nascondi i sottotitoli del sito", "siteOn": "Attivato su questo sito. Se non parte, ricarica la pagina.", "siteDenied": "Autorizzazione negata."});
  Object.assign(S.de, {"siteEnable": "Auf dieser Seite aktivieren", "siteEnableNote": "Funktioniert auf Seiten, deren Videoplayer Untertitel anzeigt.", "hideOrig": "Untertitel der Seite ausblenden", "siteOn": "Auf dieser Seite aktiviert. Falls nichts passiert, lade die Seite neu.", "siteDenied": "Berechtigung nicht erteilt."});
  Object.assign(S.es, {"siteEnable": "Activar en este sitio", "siteEnableNote": "Funciona en sitios cuyo reproductor muestra subtítulos.", "hideOrig": "Ocultar los subtítulos del sitio", "siteOn": "Activado en este sitio. Si no empieza, recarga la página.", "siteDenied": "Permiso denegado."});
  Object.assign(S.pt, {"siteEnable": "Ativar neste site", "siteEnableNote": "Funciona em sites cujo player de vídeo mostra legendas.", "hideOrig": "Ocultar as legendas do site", "siteOn": "Ativado neste site. Se não começar, recarregue a página.", "siteDenied": "Permissão negada."});
  Object.assign(S.hi, {"siteEnable": "इस साइट पर चालू करें", "siteEnableNote": "उन साइटों पर काम करता है जिनके वीडियो प्लेयर में सबटाइटल दिखते हैं।", "hideOrig": "साइट के अपने सबटाइटल छिपाएँ", "siteOn": "इस साइट पर चालू हो गया। शुरू न हो तो पेज रीलोड करें।", "siteDenied": "अनुमति नहीं मिली।"});
  Object.assign(S.id, {"siteEnable": "Aktifkan di situs ini", "siteEnableNote": "Berfungsi di situs yang pemutar videonya menampilkan subtitle.", "hideOrig": "Sembunyikan subtitle bawaan situs", "siteOn": "Diaktifkan di situs ini. Jika tidak mulai, muat ulang halaman.", "siteDenied": "Izin tidak diberikan."});
  Object.assign(S.en, {"share": "Share with a friend", "shareDone": "Link copied!", "shareMsg": "I learn languages from shows with CineVocab: every subtitle word is translated live. Free: "});
  Object.assign(S.tr, {"share": "Arkadaşına öner", "shareDone": "Bağlantı kopyalandı!", "shareMsg": "CineVocab ile dizi izleyerek dil öğreniyorum: altyazıdaki her kelime canlı çevriliyor. Ücretsiz: "});
  Object.assign(S.fr, {"share": "Partager avec un ami", "shareDone": "Lien copié !", "shareMsg": "J'apprends les langues avec mes séries grâce à CineVocab : chaque mot des sous-titres est traduit en direct. Gratuit : "});
  Object.assign(S.it, {"share": "Condividi con un amico", "shareDone": "Link copiato!", "shareMsg": "Imparo le lingue con le serie grazie a CineVocab: ogni parola dei sottotitoli viene tradotta dal vivo. Gratis: "});
  Object.assign(S.de, {"share": "Mit einem Freund teilen", "shareDone": "Link kopiert!", "shareMsg": "Ich lerne Sprachen mit Serien und CineVocab: jedes Untertitelwort wird live übersetzt. Kostenlos: "});
  Object.assign(S.es, {"share": "Compartir con un amigo", "shareDone": "¡Enlace copiado!", "shareMsg": "Aprendo idiomas con series gracias a CineVocab: cada palabra del subtítulo se traduce en directo. Gratis: "});
  Object.assign(S.pt, {"share": "Compartilhar com um amigo", "shareDone": "Link copiado!", "shareMsg": "Aprendo idiomas com séries usando o CineVocab: cada palavra da legenda é traduzida ao vivo. Grátis: "});
  Object.assign(S.hi, {"share": "दोस्त को बताएँ", "shareDone": "लिंक कॉपी हो गया!", "shareMsg": "मैं CineVocab से शो देखकर भाषा सीखता/सीखती हूँ: सबटाइटल का हर शब्द लाइव अनुवादित होता है। मुफ़्त: "});
  Object.assign(S.id, {"share": "Bagikan ke teman", "shareDone": "Tautan disalin!", "shareMsg": "Aku belajar bahasa dari tontonan dengan CineVocab: setiap kata subtitle diterjemahkan langsung. Gratis: "});
  function ui() {
    try { if (root.location && root.location.protocol === "chrome-extension:") { const o = root.localStorage.getItem("cvUi"); if (o && S[o]) return o; } } catch (e) {}
    const n = ((root.navigator && navigator.language) || "en").slice(0, 2).toLowerCase(); return S[n] ? n : "en"; }
  function t(key) {
    const l = ui(); let s = (S[l] && S[l][key]) || S.en[key] || key;
    for (let i = 1; i < arguments.length; i++) s = s.split("{" + (i - 1) + "}").join(arguments[i]);
    return s;
  }
  const langName = (c) => (NAMES[ui()] || NAMES.en)[c] || c;
  root.CVL = { foreign, detect, verdict, Guard, t, langName, ui };
  if (typeof module !== "undefined") module.exports = root.CVL;
  Object.assign(S.en, {"noSub": "No subtitles detected. Turn on subtitles (CC) in the video player."});
  Object.assign(S.tr, {"noSub": "Altyazı algılanmadı. Video oynatıcıda altyazıyı (CC) aç."});
  Object.assign(S.fr, {"noSub": "Aucun sous-titre détecté. Active les sous-titres (CC) dans le lecteur."});
  Object.assign(S.it, {"noSub": "Nessun sottotitolo rilevato. Attiva i sottotitoli (CC) nel player."});
  Object.assign(S.de, {"noSub": "Keine Untertitel erkannt. Schalte die Untertitel (CC) im Player ein."});
  Object.assign(S.es, {"noSub": "No se detectan subtítulos. Activa los subtítulos (CC) en el reproductor."});
  Object.assign(S.pt, {"noSub": "Nenhuma legenda detectada. Ative as legendas (CC) no player."});
  Object.assign(S.hi, {"noSub": "सबटाइटल नहीं मिले। वीडियो प्लेयर में सबटाइटल (CC) चालू करें।"});
  Object.assign(S.id, {"noSub": "Subtitle tidak terdeteksi. Aktifkan subtitle (CC) di pemutar video."});
})(typeof self !== "undefined" ? self : globalThis);

