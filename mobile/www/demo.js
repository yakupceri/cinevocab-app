/* CineVocab mobil: hesap acmadan deneme icin kucuk kelime desteleri.
   Yalnizca telefonda calisir; sunucuya hicbir sey gitmez. Kelimeler ve cevirileri elle yazildi. */
(function (root) {
  "use strict";
  const EN = [
    ["whisper", { tr: "fısıldamak", es: "susurrar", de: "flüstern", fr: "chuchoter", pt: "sussurrar" }],
    ["stranger", { tr: "yabancı", es: "desconocido", de: "Fremder", fr: "inconnu", pt: "desconhecido" }],
    ["promise", { tr: "söz", es: "promesa", de: "Versprechen", fr: "promesse", pt: "promessa" }],
    ["escape", { tr: "kaçmak", es: "escapar", de: "entkommen", fr: "s'échapper", pt: "escapar" }],
    ["danger", { tr: "tehlike", es: "peligro", de: "Gefahr", fr: "danger", pt: "perigo" }],
    ["secret", { tr: "sır", es: "secreto", de: "Geheimnis", fr: "secret", pt: "segredo" }],
    ["trust", { tr: "güvenmek", es: "confiar", de: "vertrauen", fr: "faire confiance", pt: "confiar" }],
    ["sword", { tr: "kılıç", es: "espada", de: "Schwert", fr: "épée", pt: "espada" }],
    ["journey", { tr: "yolculuk", es: "viaje", de: "Reise", fr: "voyage", pt: "viagem" }],
    ["shadow", { tr: "gölge", es: "sombra", de: "Schatten", fr: "ombre", pt: "sombra" }],
    ["weapon", { tr: "silah", es: "arma", de: "Waffe", fr: "arme", pt: "arma" }],
    ["forgive", { tr: "affetmek", es: "perdonar", de: "vergeben", fr: "pardonner", pt: "perdoar" }],
    ["betray", { tr: "ihanet etmek", es: "traicionar", de: "verraten", fr: "trahir", pt: "trair" }],
    ["rescue", { tr: "kurtarmak", es: "rescatar", de: "retten", fr: "sauver", pt: "resgatar" }],
    ["guard", { tr: "muhafız", es: "guardia", de: "Wache", fr: "garde", pt: "guarda" }],
    ["storm", { tr: "fırtına", es: "tormenta", de: "Sturm", fr: "tempête", pt: "tempestade" }],
  ];
  const ES = [
    ["peligro", { en: "danger", tr: "tehlike", de: "Gefahr", fr: "danger", pt: "perigo" }],
    ["secreto", { en: "secret", tr: "sır", de: "Geheimnis", fr: "secret", pt: "segredo" }],
    ["espada", { en: "sword", tr: "kılıç", de: "Schwert", fr: "épée", pt: "espada" }],
    ["viaje", { en: "journey", tr: "yolculuk", de: "Reise", fr: "voyage", pt: "viagem" }],
    ["sombra", { en: "shadow", tr: "gölge", de: "Schatten", fr: "ombre", pt: "sombra" }],
    ["promesa", { en: "promise", tr: "söz", de: "Versprechen", fr: "promesse", pt: "promessa" }],
    ["tormenta", { en: "storm", tr: "fırtına", de: "Sturm", fr: "tempête", pt: "tempestade" }],
    ["extraño", { en: "stranger", tr: "yabancı", de: "Fremder", fr: "inconnu", pt: "estranho" }],
    ["confiar", { en: "to trust", tr: "güvenmek", de: "vertrauen", fr: "faire confiance", pt: "confiar" }],
    ["escapar", { en: "to escape", tr: "kaçmak", de: "entkommen", fr: "s'échapper", pt: "escapar" }],
    ["perdonar", { en: "to forgive", tr: "affetmek", de: "vergeben", fr: "pardonner", pt: "perdoar" }],
    ["guardia", { en: "guard", tr: "muhafız", de: "Wache", fr: "garde", pt: "guarda" }],
    ["sangre", { en: "blood", tr: "kan", de: "Blut", fr: "sang", pt: "sangue" }],
    ["oscuro", { en: "dark", tr: "karanlık", de: "dunkel", fr: "sombre", pt: "escuro" }],
    ["buscar", { en: "to look for", tr: "aramak", de: "suchen", fr: "chercher", pt: "procurar" }],
    ["tierra", { en: "land", tr: "toprak", de: "Land", fr: "terre", pt: "terra" }],
  ];
  const DECK = { en: EN, es: ES };
  const has = (src, dst) => !!(DECK[src] && src !== dst && DECK[src][0][1][dst]);

  // Istenen dil cifti icin deneme yoksa en yakin cifti verir.
  function pair(src, dst, ui) {
    if (has(src, dst)) return [src, dst];
    if (has("en", dst)) return ["en", dst];
    if (has("es", dst)) return ["es", dst];
    return ui === "tr" ? ["en", "tr"] : ["es", "en"];
  }
  // Sunucudaki /api/vocab ile ayni bicim: { tr: kelime, eng: cevirisi, episode: kaynak adi }
  // Altyazi tamamlama oyunu icin elle yazilmis kisa cumleler (yalnizca deneme destesi).
  const SENT = {
    whisper: "Don't whisper. Say it out loud.", stranger: "A stranger knocked on the door at midnight.", promise: "You made me a promise.",
    escape: "We have to escape before sunrise.", danger: "You are in danger. Run!", secret: "Can you keep a secret?", trust: "I can't trust anyone here.",
    sword: "He drew his sword and stepped forward.", journey: "It was a long journey home.", shadow: "Something moved in the shadow.",
    weapon: "Drop your weapon!", forgive: "I will never forgive you.", betray: "How could you betray us?", rescue: "They came to rescue her.",
    guard: "The guard never saw us.", storm: "A storm is coming tonight.",
    peligro: "Estás en peligro. Corre.", secreto: "Es un secreto entre los dos.", espada: "Sacó su espada y avanzó.", viaje: "Fue un viaje muy largo.",
    sombra: "Algo se movió en la sombra.", promesa: "Me hiciste una promesa.", tormenta: "Esta noche viene una tormenta.", confiar: "No puedo confiar en nadie.",
    escapar: "Tenemos que escapar antes del amanecer.", perdonar: "Nunca voy a perdonarte.", guardia: "El guardia no nos vio.", sangre: "Había sangre en el suelo.",
    oscuro: "El bosque estaba oscuro.", buscar: "Vamos a buscar ayuda.", tierra: "Esta tierra es nuestra."
  };
  function words(src, dst, label) {
    if (!has(src, dst)) return [];
    return DECK[src].map((x) => ({ tr: x[0], eng: x[1][dst], episode: label || "", sentence: SENT[x[0]] || "" }));
  }
  root.CVDEMO = { pair: pair, words: words, has: has };
})(typeof window !== "undefined" ? window : globalThis);
