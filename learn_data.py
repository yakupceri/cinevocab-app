"""SEO sayfaları için dil bilgisi ve metinler (İngilizce /learn/{dil}, Türkçe /ogren/{dil})."""

INFO = {
    "en": ("English", "İngilizce", "English", ("I should have told you the truth.", "Sana gerçeği söylemeliydim.", "")),
    "es": ("Spanish", "İspanyolca", "Español", ("Nunca es tarde para empezar.", "Başlamak için asla geç değildir.", "It is never too late to start.")),
    "fr": ("French", "Fransızca", "Français", ("Je ne sais pas pourquoi.", "Nedenini bilmiyorum.", "I don't know why.")),
    "de": ("German", "Almanca", "Deutsch", ("Das habe ich nicht gewusst.", "Bunu bilmiyordum.", "I didn't know that.")),
    "it": ("Italian", "İtalyanca", "Italiano", ("Non ti preoccupare, amico.", "Endişelenme dostum.", "Don't worry, friend.")),
    "pt": ("Portuguese", "Portekizce", "Português", ("Eu não sei por que.", "Nedenini bilmiyorum.", "I don't know why.")),
    "ru": ("Russian", "Rusça", "Русский", ("Я не знаю, почему.", "Nedenini bilmiyorum.", "I don't know why.")),
    "ja": ("Japanese", "Japonca", "日本語", ("ありがとう、また明日。", "Teşekkürler, yarın görüşürüz.", "Thank you, see you tomorrow.")),
    "ko": ("Korean", "Korece", "한국어", ("내일 다시 만나요.", "Yarın tekrar görüşürüz.", "See you again tomorrow.")),
}


def build(lang: str, hl: str) -> dict:
    en, tr, native, ex = INFO[lang]
    tr_ex = ex[1] if hl == "tr" else ex[2]
    if lang == "en":  # İngilizce örnek: çeviri hedef dile göre
        tr_ex = "Sana gerçeği söylemeliydim." if hl == "tr" else "I should have told you the truth."
    if hl == "tr":
        n = tr
        faq = [
            ("CineVocab ücretsiz mi?", "Evet. Eklenti ve site ücretsiz; çeviri için hesap bile gerekmez. Kelimeleri kaydetmek ve quiz için ücretsiz hesap açarsın."),
            ("Hangi sitelerde çalışır?", "YouTube, Prime Video ve Udemy altyazılarında çalışır. Videoda altyazıyı açman yeterli."),
            (f"{n} için hangi seviyede işe yarar?", "Başlangıçtan ileri seviyeye kadar. Bilmediğin kelimelerin üstünde çevirisi görünür, tıklayınca telaffuzunu duyar ve listene kaydedersin."),
        ]
        return dict(
            hl=hl, code=lang, name=n, native=native, url=f"/ogren/{lang}",
            title=f"Altyazıyla {n} öğren: ücretsiz Chrome eklentisi | CineVocab",
            desc=f"YouTube, Prime Video ve Udemy altyazılarındaki her kelimenin üstünde Türkçe çevirisini gör. {n} kelimelerini kaydet ve quiz ile pekiştir.",
            h1=f"{n} dizi ve videolardan öğren",
            lead=f"CineVocab, izlediğin videonun altyazısındaki her kelimenin üstüne çevirisini koyar. Kelimeye tıkla, telaffuzunu dinle, kaydet ve sonra quiz ile tekrar et.",
            ex_h="Altyazıda böyle görünür", ex_orig=ex[0], ex_tr=tr_ex,
            steps_h="3 adımda başla",
            steps=["Chrome eklentisini kur (ücretsiz).", f"{n} altyazılı bir video aç ve altyazıyı (CC) aç.", "Bilmediğin kelimeye tıkla, kaydet. Sonra sitedeki quiz ve düello ile tekrar et."],
            cta="Chrome'a ekle", cta2=f"{n} videoları bul", cta2_url="/explore",
            faq_h="Sık sorulanlar", faq=faq, more_h="Diğer diller", prefix="/ogren",
            lnames={k: v[1] for k, v in INFO.items()},
        )
    n = en
    faq = [
        ("Is CineVocab free?", "Yes. The extension and the site are free, and translations work without an account. A free account lets you save words and practise them."),
        ("Which sites does it work on?", "It works on subtitles on YouTube, Prime Video and Udemy. Just turn the subtitles on in the video."),
        (f"What level of {n} is it for?", f"Beginner to advanced. Each word you do not know gets a translation above it, you can hear it, save it, and review it later with quizzes."),
    ]
    return dict(
        hl=hl, code=lang, name=n, native=native, url=f"/learn/{lang}",
        title=f"Learn {n} with subtitles: free Chrome extension | CineVocab",
        desc=f"See a translation above every word of the subtitles on YouTube, Prime Video and Udemy. Save {n} words and practise them with quizzes.",
        h1=f"Learn {n} from the shows and videos you already watch",
        lead="CineVocab puts a translation above every word of the subtitles you are watching. Click a word, hear it, save it, then practise it later with quizzes.",
        ex_h="This is how it looks in the subtitles", ex_orig=ex[0], ex_tr=tr_ex,
        steps_h="Start in 3 steps",
        steps=["Install the Chrome extension (free).", f"Open a video with {n} subtitles and turn the subtitles (CC) on.", "Click any word you do not know to save it. Practise later with quizzes and duels on the site."],
        cta="Add to Chrome", cta2=f"Find {n} videos", cta2_url="/explore",
        faq_h="Questions", faq=faq, more_h="Other languages", prefix="/learn",
        lnames={k: v[0] for k, v in INFO.items()},
    )


LEARN = {k: {"name": v[0]} for k, v in INFO.items()}
