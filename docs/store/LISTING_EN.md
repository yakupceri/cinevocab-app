# CineVocab: Chrome Web Store listing (English, default language)
For extension version 1.8.7. Copy each block into the matching field of the Developer Dashboard.

## Store listing tab

### Name
CineVocab

### Summary (132 characters max; this is the same text as in the extension's manifest)
Learn a language from the shows you watch. Every subtitle word translated live on Prime Video, YouTube, Netflix & Udemy. Free.

### Description
Stop pausing to look up words. Watch your show, and CineVocab puts the translation of every subtitle word right on screen, live.

Works on Prime Video, YouTube, Netflix and Udemy, and on other sites with the "Turn on for this site" button. Free. No account needed to try it.

WHY IT WORKS
You remember words you met in a scene far better than words from a list. CineVocab turns the thing you already do (watching) into practice: every word you see is translated, saved, and brought back later as a quiz.

TRY IT IN 30 SECONDS
1. Install CineVocab and pin it from the puzzle icon in Chrome's toolbar.
2. Open a video with subtitles on Prime Video, YouTube or Udemy (on YouTube, turn on captions with CC).
3. Click the CineVocab icon, choose the subtitle language and the language you want translations in, and switch it on.
Each subtitle word now appears with its translation, and the whole sentence is translated underneath.

KEEP YOUR WORDS (optional, free)
Create a free account at https://cinevocab.up.railway.app, press "Create key" in Settings and paste the key into the popup. Your words are then saved by platform, show and episode. Translating works without a key; the key is only for saving.

WHILE YOU WATCH
- Any language pair, for example Spanish to English, French to English or Turkish to English
- 11 subtitle languages: Turkish, English, French, Italian, German, Spanish, Portuguese, Russian, Arabic, Romanian and Japanese
- Off by default: nothing is translated until you switch it on
- Language guard: pauses when the subtitles are not in the language you chose
- Move the subtitle box to a corner or top/bottom center, resize it and set its transparency

AFTER YOU WATCH (on the CineVocab website)
- Word lists by platform, show and episode, with thumbnails
- Quizzes with levels, streaks, daily goals, speed and survival modes
- Smart review: words you miss come back sooner, words you know come back later
- Listening and speaking practice (speaking is optional and uses your browser's speech recognition)
- Daily challenge: the same 10 words for everyone, once a day
- Private friend leagues and live duels with a 4-digit room code
- Big-screen mode for classrooms, light and dark theme, interface in 6 languages

PRIVACY
The extension sends the subtitle line it reads, and the words you save, to our server (and from there to Google Translate) to be translated and stored. We also keep a simple daily count of translation requests, without any username, IP address or text, to see whether the extension is used. We never sell your data. You can delete your account and all your data at any time. Full policy: https://cinevocab.up.railway.app/privacy

CineVocab is an independent project. It is not affiliated with or endorsed by Amazon, Prime Video, Google, YouTube or Udemy.

### Other fields
- Category: Education
- Language: English (add Turkish as an extra language with LISTING_TR.md)
- Website: https://cinevocab.up.railway.app
- Support: use your support email or the contact page on the site
- Graphics: screenshots/ (5 images, 1280x800), promo/promo-small-440x280.png (small promo tile), promo/promo-marquee-1400x560.png (marquee), promo/icon-128x128.png (store icon)

## Privacy tab

### Single purpose
Translate the subtitle words of videos on Prime Video, YouTube and Udemy as the user watches, and save them to the user's vocabulary list for practice.

### Permission justifications
- storage: Saves the on/off switch, the chosen language pair, the subtitle box settings and the user's optional extension key in the browser.
- Host permission (https://cinevocab.up.railway.app/*): Sends the subtitle text to the CineVocab server to be translated, and saves the user's words to their account there.
- Content script sites (primevideo.com, youtube.com, udemy.com): Reads the subtitle line that the video player is showing, so each word can be translated and shown in a box on top of the video.

### Remote code
No, I am not using remote code. (All JavaScript is inside the extension package.)

### Data usage
Tick these data types:
- Authentication information (the optional extension key)
- Website content (subtitle text, plus the title and thumbnail address of the video the words came from)

Tick all three statements: I do not sell user data to third parties; I do not use or transfer user data for purposes unrelated to the item's single purpose; I do not use or transfer user data to determine creditworthiness or for lending purposes.

Privacy policy URL: https://cinevocab.up.railway.app/privacy

### Notes for the reviewer (Test instructions field)
Translation works without an account. Open any video with subtitles on YouTube (for example a Spanish-language video with Spanish captions turned on), click the extension icon, switch it on and choose Spanish to English. Each subtitle word then appears with its translation in a box over the video. To save words, create a free account at https://cinevocab.up.railway.app, copy the extension key from Settings and paste it into the extension popup.

## What changed since 1.8.2 (for your own notes; the store has no field for it)
- Subtitle words appear sooner on YouTube (faster caption detection).
- Subtitle box position, size and transparency settings.
- Website: daily challenge, smart review, listening and speaking practice, friend leagues and a big-screen mode for classrooms.
