# Oído — Spanish Listening Practice

A small static site for practicing listening recognition of the Spanish
alphabet (and, by extension, any other sound-based set — numbers are
included as a second example). Plain HTML/CSS/JS, no build step, deploys
directly to GitHub Pages.

Each round plays a sound, then shows four letters (or numbers) to choose
from. Answer choices are weighted toward the letters that give
non-heritage speakers the most trouble — g/j/h/y, s/c/z, m/n/ñ, b/v,
k/q — so those groups get drilled against each other instead of against
easy, unrelated letters.

Before quizzing, "Study sounds" opens a tap-any-tile grid of every item
in the chosen set, for untimed listening practice with no scoring.

## Structure

```
index.html            three screens: home, quiz, results
css/style.css
js/app.js             all quiz logic — reads the JSON files, nothing hardcoded
data/modules.json      the list of practice sets shown on the home screen
data/alphabet.json      one set: letters, their names, and confuse-groups
data/numbers.json       a second set, same shape, as an extension example
audio/alphabet/*.mp3    sound files, named to match each item's "id"
audio/numbers/*.mp3
scripts/generate_audio.py   batch-creates the mp3 files (see below)
```

## Running it

Any static file server works locally, e.g.:

```
python3 -m http.server 8000
```

then open `http://localhost:8000`. Opening `index.html` directly via
`file://` will not work — the browser blocks the `fetch()` calls that
load the JSON files.

## Deploying to GitHub Pages

1. Push this folder to a repository.
2. In the repo, go to **Settings → Pages**.
3. Under "Build and deployment," set Source to **Deploy from a branch**,
   pick the branch (usually `main`) and root folder (`/`), save.
4. The site is live at `https://<username>.github.io/<repo-name>/`
   within a minute or two.

No server-side code, database, or build process is involved.

## Adding a new practice set (e.g. days of the week)

1. Create `data/days.json` following the same shape as `data/alphabet.json`:
   an `id`, `title`, `audioPath`, `fallbackLang`, and an `items` array
   where each item has `id`, `label`, `spoken`, and an optional
   `confuseGroup` of other item ids to weight into the multiple choice.
2. Create the matching folder, `audio/days/`.
3. Add one line to `data/modules.json`:
   `{ "id": "days", "label": "Days of the week", "dataFile": "data/days.json" }`

That's the whole extension — no HTML or JS changes needed. The home
screen, question weighting, and results screen all read from the JSON.

## Generating the sound files without recording all of them

Recording 27+ letters (and again for every future set) by hand is the
slow path. Two better options, cheapest first:

**1. Batch neural TTS (recommended) — `scripts/generate_audio.py`**

Uses `edge-tts`, a free wrapper around Microsoft Edge's neural voices —
natural-sounding, no API key, no per-character cost. One run produces
every file for a whole set:

```
pip install -r scripts/requirements.txt
python scripts/generate_audio.py data/alphabet.json
python scripts/generate_audio.py data/numbers.json --voice es-MX-JorgeNeural
```

The script reads each item's `"spoken"` field (e.g. `"jota"` for the
letter J), synthesizes it, and saves it as `audio/alphabet/j.mp3` —
matching the filename the quiz already expects. Re-running only fills
in missing files unless `--overwrite` is passed. List other voices with
`edge-tts --list-voices | grep es-`; `es-ES-AlvaroNeural` (Spain) and
`es-MX-DaliaNeural` (Mexico) are both good starting points, useful if
separate Spain/Latin America accent sets are ever wanted.

**2. No files at all — built-in browser fallback**

The quiz already checks whether an audio file loads; if a file is
missing, it speaks the letter using the browser's own Spanish
text-to-speech voice (`speechSynthesis`) instead of failing. This means
the site is playable the moment it's deployed, before any audio has
been generated — useful for testing the quiz flow, and as a permanent
fallback in browsers with no voice installed for the target `mp3`s. A
small note appears on the results screen whenever that fallback was
used, as a reminder to fill in the real files.

Either path can be mixed: generate the alphabet with `edge-tts` and
leave a future set on the fallback voice until it's worth recording
properly.

## Notes on the confuse-groups

`confuseGroup` in each JSON file is what drives the "special attention"
behavior — when a letter has entries there, the multiple-choice options
are pulled from that list first (falling back to a random letter only
if the group is smaller than needed). Adjust these lists directly in
the JSON to change which letters get drilled against each other.

## Days and months

`data/days.json` and `data/months.json` follow the same shape as the
other sets, each with its own `audio/days/` and `audio/months/` folder.
Weekday and month names that sound alike (martes/jueves/viernes,
sábado/domingo, junio/julio, septiembre/octubre/noviembre/diciembre)
are set as each other's answer choices via `confuseGroup`, the same way
letters are.

## IPA consonants, vowels & diphthongs

`data/english-consonants.json`, `spanish-consonants.json`,
`english-vowels.json` and `spanish-vowels.json` cover the phoneme
inventories for both languages, using IPA symbols as the on-screen
label (e.g. `θ`, `ʃ`, `ɲ`, `ai̯`). Each has its own audio folder
(`audio/english-consonants/`, etc.) and confuse-groups for classic
near-minimal-pair mix-ups: p/b, θ/ð/f, tʃ/dʒ/ʃ, s/z on the English
side; b/p, ɲ/n, ʎ~ʝ/y, and the tap/trill ɾ/r pair on the Spanish side.
The `spoken` field carries a short carrier syllable (`"pa"`, `"tha"`,
`"cha"`) rather than the IPA symbol itself, since that is what the
speech-synthesis fallback and `generate_audio.py` actually read aloud;
`item.label` is what's shown and quizzed on.

## Customizing which sounds are included

Every set now has a "Customize which sounds are included" link on the
home screen. It opens a checklist of every item in that set — unchecking
one removes it from both the quiz question pool and its multiple-choice
options, and from the study screen, for that set. The choice is saved
per set in the browser (`localStorage`) and remembered next time. The
recorder page is unaffected — every item stays recordable regardless of
what's checked here.

## English translations for days and months

`data/days.json` and `data/months.json` items carry a `"gloss"` field
(`"Wednesday"`, `"January"`, etc.). The "Show English translations when
available" checkbox on the home screen, when on, prints that gloss under
the Spanish word on both the quiz answer buttons and the study-screen
tiles, for any set that has one. It's off by default and has no effect
on sets without a `gloss` field (letters, numbers, IPA).

## Number sets and the recorder page

`data/numbers-30.json`, `numbers-100.json` and `numbers-1000.json` are
generated by `python scripts/generate_numbers.py` and all share
`audio/numbers/`, so each number is recorded once. Teen/tens pairs
(13/30, 14/40 ...) are set as each other's answer choices.

`recorder.html` lets anyone pick a set, tap an item and record it. Files
are stored in the browser (IndexedDB) and the quiz uses them immediately.
**Download all as ZIP** produces `audio/<set>/<id>.webm` (or `.m4a` on
Safari) — unzip into the repo root or upload the `audio` folder to GitHub
and commit, and every visitor hears them.

## Common nouns with pixel-art buttons

`data/nouns.json` holds 90 common nouns (el libro, el mapa, la mochila,
el bolígrafo, el coche, la llave, la camisa, la ropa, la mesa, la receta
first). Quiz answers are 16x16 pixel pictures; the Spanish word stays
hidden in the quiz (so the answer is heard, not read) and shows on the
study tiles. Each picture is a short drawing script (`r` rectangle, `c`
circle, `l` line, `p` pixels, colour letters) drawn in the browser by
`js/pixelart.js` — no image files.

To add or change a noun, edit the table in `scripts/generate_nouns.py`
and run `python scripts/generate_nouns.py` (or edit an `art` string
directly in `data/nouns.json` and refresh). Wrong answers come from the
same category (food, animals, home ...) first. Record the sounds with
`recorder.html` or `generate_audio.py data/nouns.json`; files are named
by id, e.g. `audio/nouns/libro.mp3`.
