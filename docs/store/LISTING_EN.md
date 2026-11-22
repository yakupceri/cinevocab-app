# CineVocab: Chrome Web Store listing (English, default language)
For extension version 2.3.0. Copy each block into the matching field of the Developer Dashboard.
Rules this text follows: it says only what the code does, and the name and summary carry no third-party brand names (an earlier listing was rejected for that, see git 23a3778).

## Store listing tab

### Name
CineVocab (comes from the manifest)

### Summary (132 characters max; this is the same text as in the extension's manifest, 119 characters)
Learn a language from the shows you watch. Every subtitle word is translated live, on video sites with subtitles. Free.

### Description
Stop pausing to look up words. Watch your show, and CineVocab puts the translation of every subtitle word right on the video.

Click a word to keep it. Your words stay on your device, no account needed. When you create a free account, the words you kept move to it, and quizzes, streaks and duels unlock.

Works on Prime Video, YouTube, Netflix and Udemy, and on other sites with the "Turn on for this site" button. Free.

WHY IT WORKS
You remember words you met in a scene far better than words from a list. CineVocab turns the thing you already do (watching) into practice: you see the word, keep the ones you like, and bring them back later as a quiz.

TRY IT IN A MINUTE
1. Install CineVocab. A welcome page opens.
2. Check the two languages (subtitles in, translation in) and press the big button. It switches CineVocab on and opens a video with captions.
3. Press CC in the player if captions are off. Every subtitle word appears with its translation, and the whole sentence is translated underneath.
4. Click a word to keep it.

OFF UNTIL YOU TURN IT ON
After a fresh install, CineVocab does nothing until you switch it on, from the welcome page button, the toolbar popup, or the "Start translating" button it offers on a video with subtitles. You can switch it off again any time.

WHILE YOU WATCH
- Any language pair, for example Spanish to English, French to English or Turkish to English
- 16 subtitle languages: Turkish, English, French, Italian, German, Spanish, Portuguese, Russian, Arabic, Romanian, Japanese, Hindi, Indonesian, Polish, Dutch and Korean
- Extension interface in 9 languages
- Language guard: pauses when the subtitles are not in the language you chose
- Move the subtitle box anywhere on the video, resize it and set its transparency
- Pull the words out of a whole YouTube video at once (free account needed)

PRACTISE WHAT YOU KEPT (no account needed)
- Quick rounds from the words you kept, right in the popup
- Fill-in-the-blank questions use the subtitle line you heard the word in, and a sentence builder ends each round
- Spaced review: words you miss come back sooner, words you know come back later
- After a few days, words you still remember are marked as learned
- The toolbar icon shows how many words are ready to review

WITH A FREE ACCOUNT (on the CineVocab website and in the popup)
- The words you kept on this device moved to your account, grouped by platform, show and episode
- Quizzes with levels, streaks and daily goals
- Daily challenge: the same words for everyone, once a day
- Private friend leagues and live duels with a 4-digit room code

PRIVACY
After you switch it on, the extension sends the subtitle line it reads to our server, and from there to Google Translate, to be translated. The subtitle sentence is not saved in our database. The individual words and their translations are saved to a shared translation dictionary (not linked to your name), together with the title and thumbnail address of the video they came from. Words you click are kept on your device, together with the subtitle line they appeared in and its translation, so practice can ask fill-in-the-blank questions. That copy of the line stays on your device. When you create or sign in to an account, the kept words (without those lines) are sent to it, and from then on the words you see are saved to your account. We also keep simple anonymous usage counters (such as daily request counts, approximate country, device type and operating system) to see whether the extension is used; they are not linked to an account. We never sell your data. You can delete your account and all your data at any time. Full policy: https://cinevocab.up.railway.app/privacy

CineVocab is an independent project. It is not affiliated with or endorsed by Amazon, Prime Video, Google, YouTube, Netflix or Udemy.

### Other fields
- Category: Education
- Language: English (add Turkish as an extra language with LISTING_TR.md)
- Website: https://cinevocab.up.railway.app
- Support: use your support email or the contact page on the site
- Graphics: the screenshots in this folder are from version 1.8.7 and must be re-taken for the 2.1 look before upload (1280x800, up to 5). Small promo tile 440x280, marquee 1400x560, store icon 128x128.

## Privacy tab

### Single purpose
Translate the subtitle words of videos as the user watches (after the user switches it on), and let the user keep the words they like for practice.

### Permission justifications
- storage: Saves the on/off switch, the chosen language pair, the subtitle box settings, the words the user keeps on their device (with the subtitle line they came from), a small cache of already translated words so they show up faster, and the optional sign-in key.
- identity: Optional "Continue with Google" sign-in. Opens Google's sign-in window and asks only for basic profile (openid, profile); no email address is requested.
- scripting: Starts the translation box on a site only after the user presses "Turn on for this site", and reads the addresses of the large video frames on the open page so the box also works in embedded players.
- activeTab: Lets the popup see the address of the open tab, and enable CineVocab on it only when the user asks.
- Host permission (https://cinevocab.up.railway.app/*): Sends the subtitle line to the CineVocab server to be translated, and saves the user's words to their account there.
- Optional host permissions (https://*/*, http://*/*): Not granted at install. Asked for one site at a time, only when the user presses "Turn on for this site", for that site and its video player's domain.
- Content script sites (primevideo.com, youtube.com, udemy.com, netflix.com): Reads the subtitle line that the video player is showing, so each word can be translated and shown in a box on top of the video.

### Remote code
No, I am not using remote code. (All JavaScript is inside the extension package.)

### Data usage
Tick these data types:
- Authentication information (the optional sign-in key)
- Website content (subtitle text, plus the title and thumbnail address of the video the words came from)

Tick all three statements: I do not sell user data to third parties; I do not use or transfer user data for purposes unrelated to the item's single purpose; I do not use or transfer user data to determine creditworthiness or for lending purposes.

Privacy policy URL: https://cinevocab.up.railway.app/privacy

### Notes for the reviewer (Test instructions field)
Translation is off after install and works without an account. Open the welcome page (it opens at install), keep Spanish to English selected, and press "Watch a Spanish video". This switches the extension on and opens YouTube search results filtered for captions. Open any video with Spanish captions, press CC if needed, and each subtitle word appears with its translation in a box on the video. Click a word to keep it: it appears under the extension icon, in the Words tab, without signing in. An account is optional (free sign-up in the popup).

## What changed since 2.0.3 (for your own notes; the store has no field for it)
- 2.2: practise the words you kept without an account (spaced review, typing from the 3rd step, "learned" after a few days, daily streak, count on the toolbar icon). Words that are not translated yet are not asked.
- 2.2: the "turn on subtitles" hint appears after 3 seconds instead of 8.
- Off after a fresh install; the welcome page button is the opt-in. People who updated from 2.0.3 keep the setting they had (2.0.3 switched on at install).
- One-screen welcome page with the language pair preselected from the browser language.
- Click a word to keep it, no account needed; the box shows how many you kept; Words tab lists them with the video time. Creating or signing in to an account moves them to it.
- New look: dark, one accent colour, flat surfaces.
- The popup no longer opens with the sign-in form.
