"""Hazır başlangıç kelime paketleri. Kelimeler kaynak dilde; çeviri kullanıcının hedef diline anında yapılır."""

PACK_META = ["essentials", "movie", "feelings", "travel"]

PACKS = {
    "en": {
        "essentials": "go get make know think take see come want look use find give tell work call try need feel leave keep let begin seem help show hear play run".split(),
        "movie": "sorry maybe whatever seriously honestly actually exactly obviously suddenly probably definitely anyway apparently basically literally besides although nobody everybody somebody trust guess promise mistake secret truth lie hide chance".split(),
        "feelings": "happy sad angry afraid proud tired lonely jealous nervous worried excited bored surprised confused ashamed grateful hopeful upset calm brave shy kind rude funny lucky crazy sweet gentle fierce".split(),
        "travel": "airport ticket luggage passport hotel reservation map station platform train bus taxi street corner bridge beach mountain island ticket arrive depart delay border customs tourist guide souvenir suitcase journey ride".split(),
    },
    "es": {
        "essentials": "ir hacer tener decir poder ver dar saber querer llegar pasar deber poner parecer quedar creer hablar llevar dejar seguir encontrar llamar venir pensar salir volver tomar conocer vivir sentir".split(),
        "movie": "perdón quizás siempre nunca también entonces porque aunque todavía nadie todos alguien verdad mentira secreto error confianza promesa suerte miedo cuidado ayuda tiempo vida corazón sueño".split(),
        "feelings": "feliz triste enfadado asustado orgulloso cansado solo celoso nervioso preocupado aburrido sorprendido confundido agradecido tranquilo valiente tímido amable gracioso loco dulce".split(),
        "travel": "aeropuerto billete maleta pasaporte hotel reserva mapa estación tren autobús taxi calle esquina puente playa montaña isla llegar salir retraso frontera turista guía recuerdo viaje".split(),
    },
    "fr": {
        "essentials": "aller faire avoir dire pouvoir voir donner savoir vouloir venir devoir prendre trouver mettre parler penser croire passer laisser rester suivre appeler demander sentir vivre sortir revenir comprendre attendre".split(),
        "movie": "pardon peut-être toujours jamais aussi alors parce que pourtant encore personne tout le monde quelqu'un vérité mensonge secret erreur confiance promesse chance peur attention aide temps vie coeur rêve".split(),
        "feelings": "heureux triste fâché effrayé fier fatigué seul jaloux nerveux inquiet ennuyé surpris confus reconnaissant calme courageux timide gentil drôle fou doux".split(),
        "travel": "aéroport billet valise passeport hôtel réservation carte gare train bus taxi rue coin pont plage montagne île arriver partir retard frontière touriste guide souvenir voyage".split(),
    },
    "de": {
        "essentials": "gehen machen haben sagen können sehen geben wissen wollen kommen müssen nehmen finden stehen denken glauben sprechen bleiben lassen folgen rufen fragen fühlen leben treffen verstehen warten brauchen".split(),
        "movie": "Entschuldigung vielleicht immer nie auch dann weil obwohl noch niemand alle jemand Wahrheit Lüge Geheimnis Fehler Vertrauen Versprechen Glück Angst Vorsicht Hilfe Zeit Leben Herz Traum".split(),
        "feelings": "glücklich traurig wütend ängstlich stolz müde einsam eifersüchtig nervös besorgt gelangweilt überrascht verwirrt dankbar ruhig mutig schüchtern freundlich lustig verrückt süß".split(),
        "travel": "Flughafen Fahrkarte Koffer Reisepass Hotel Reservierung Karte Bahnhof Zug Bus Taxi Straße Ecke Brücke Strand Berg Insel ankommen abfahren Verspätung Grenze Tourist Reiseführer Reise".split(),
    },
}

TITLES = {
    "essentials": {"en": "Everyday verbs", "tr": "Günlük fiiller", "fr": "Verbes du quotidien", "it": "Verbi quotidiani", "de": "Alltagsverben", "es": "Verbos cotidianos"},
    "movie": {"en": "Words you hear in movies", "tr": "Filmlerde sık duyulanlar", "fr": "Mots qu'on entend dans les films", "it": "Parole che senti nei film", "de": "Wörter aus Filmen", "es": "Palabras de las películas"},
    "feelings": {"en": "Feelings and personality", "tr": "Duygular ve karakter", "fr": "Émotions et caractère", "it": "Emozioni e carattere", "de": "Gefühle und Charakter", "es": "Emociones y carácter"},
    "travel": {"en": "Travel and getting around", "tr": "Seyahat ve ulaşım", "fr": "Voyage et transports", "it": "Viaggi e trasporti", "de": "Reisen und Verkehr", "es": "Viajes y transporte"},
}


def pack_words(src: str, pid: str) -> list:
    out, seen = [], set()
    for w in PACKS.get(src, {}).get(pid, []):
        w = w.strip().lower()
        if w and w not in seen:
            seen.add(w)
            out.append(w)
    return out
