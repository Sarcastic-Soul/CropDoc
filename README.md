# CropDoc

Offline crop leaf disease detection. Point the camera at a leaf, get an
instant diagnosis and treatment steps — fully on-device, no internet
required. See `../BUILD-PLAN.md` for the full architecture and rationale.

**Android only.** No app-store distribution planned, no Apple Developer
account, no iOS builds/testing. Don't add iOS config, scripts, or build
profiles back in.

## Features

- **Diagnosis** — camera or gallery photo → on-device MobileNetV2 (`.tflite`)
  classification → bundled treatment steps. Works with no network at all.
- **Batch scan** — walk a field capturing leaf after leaf; each is classified
  immediately, then a summary screen flags the worst finding and per-disease
  counts before saving the whole batch to history as one group.
- **Progression tracking** — tag a scan with an optional plot/plant name;
  the Plot screen lists that tag's scans chronologically and flags whether
  the latest one looks better, worse, or unchanged vs. the previous one.
- **History** — paginated (loads 20 at a time, not the whole table), with a
  from/to date-range filter and batch scans grouped into one card.
- **Dosage calculator** — its own bottom tab. Pick a treatable disease, enter
  either plot size (m²/hectare/acre + spray water per hectare) or plant count
  (+ spray water per plant), get a product quantity from the bundled typical
  label rate. Clearly disclaimed as a typical rate, not a specific product's
  instructions. Can also scan a physical product label's printed dosage
  (on-device OCR) and flags whether it matches the bundled typical rate — see
  below.
- **Gemini second opinion** — optional, online-only, layered on top of the
  offline result (see below).
- **Ask (offline AI assistant)** — its own bottom tab. A small LLM
  (SmolLM2-360M-Instruct, GGUF) that answers farming questions fully
  on-device, no internet required once set up. Not bundled with the app —
  opt-in download (~370 MB) keeps the base install small; see below.
- **11 languages** — English plus Hindi, Spanish, Mandarin, Portuguese,
  Bengali, Indonesian, Swahili, Vietnamese, French, and Urdu (RTL), picked for
  large farming populations. A first-launch picker sets the language; it's
  changeable later in Settings. Diagnosis/treatment content is translated
  too, not just UI chrome.
- **Theme** — system/light/dark, in Settings.

Four bottom tabs: **Home** (scan/upload/batch entry points), **History**,
**Dosage**, **Ask**.

## Gemini second opinion

Each user supplies their own free-tier key in-app (Settings → Gemini second
opinion), stored via `expo-secure-store` (Android Keystore-backed), not
bundled with the app. An `EXPO_PUBLIC_*` env var would get inlined into the
JS bundle at build time — extractable in plaintext from the shipped
APK/AAB — so the app never ships with a key baked in.

## Ask (offline AI assistant)

A local LLM (`SmolLM2-360M-Instruct`, Q8_0 GGUF, ~370 MB) that runs fully
on-device via `llama.rn` (CPU-only — this library's GPU offload is iOS-only,
so Android always runs CPU inference; fine at this model size). Not bundled
with the app: the Ask tab walks the user through download → one-time setup
(loads the model into memory, can take a couple of minutes the first time) →
ready. Downloaded model lives in app-private storage
(`expo-file-system`'s `File`/`Directory`/`Paths` API) and can be removed from
the same screen to reclaim space.

Grounding is deliberately small, not a full RAG pipeline, but it is real
vector search, not just string matching:
- The farmer picks which past scan (if any) to ground answers on, via a chip
  row above the chat — multi-turn (last 6 turns, `MAX_HISTORY_TURNS` in
  `src/lib/llm/engine.ts`).
- `src/lib/llm/embeddings.ts` embeds all 38 treatment classes once per
  language using the *same already-loaded chat model* (`llama.rn`'s
  `context.embedding()`, no second model shipped) and caches the vectors in
  SQLite (`treatment_embeddings` table, keyed by label+language+model so
  switching the downloadable LLM can't silently mix incompatible vectors).
  A farmer's question is embedded the same way and ranked by cosine
  similarity — this indexing pass runs once in the background right after
  setup (shown as "Indexing…") and never blocks the chat.
- `src/lib/llm/retrieval.ts` is the keyword-overlap fallback used before the
  index has warmed up, or if an `embedding()` call errors — always available,
  never throws.
- Grounding is capped at 3 treatment blocks (selected scan + up to 2
  retrieved matches) for the same reason history is capped at 6 turns:
  SmolLM2-360M's architectural ceiling is 8192 tokens, but its benchmarks are
  weak (MMLU ~33%, GSM8K ~7%) with no published guidance on reliable context
  length, so the prompt budget stays in the low hundreds of tokens rather
  than pushing toward that ceiling.
- Every assistant answer is read aloud (`expo-speech`, on-device OS TTS, no
  network) — toggle in the Ask tab header, or tap any answer bubble to
  replay/stop it individually. Aimed at farmers who can't comfortably read
  the screen. Voice *input* (speech-to-text) was investigated
  (`whisper.rn` + `@fugood/react-native-audio-pcm-stream`) and dropped: its
  Android PCM-capture path doesn't actually write the WAV file its own
  TypeScript types claim it does — confirmed by reading the native module
  source, not just the docs — so it would have shipped untested. TTS output
  alone was the safer bet this close to the deadline.

## Label scan (Dosage calculator)

`@react-native-ml-kit/text-recognition` runs Google ML Kit's *bundled*
on-device text recognizer (`com.google.mlkit:text-recognition`, not the
Play-Services-downloaded variant) — no network, no first-run model download,
adds to APK size instead. Point the camera at a physical product's printed
label; `src/lib/dosage/label-ocr.ts` regex-matches a per-liter application
rate out of the raw OCR text (requires an explicit `/L` or "per litre"
denominator specifically so it doesn't grab the bottle's net-volume figure
printed elsewhere on the same label) and flags whether it falls inside the
bundled typical-rate range for the selected disease. Script selection
(`Latin`/`Devanagari`/`Chinese`) follows the app's current language; Bengali
and Urdu aren't among the 5 scripts this library supports at all, so labels
in those scripts fall back to (weaker) Latin recognition — a library
limitation, not something fixable at the app level.

## Development

Requires an EAS custom dev client — `react-native-fast-tflite` is a native
module, so Expo Go cannot run this app.

```sh
npx eas login                       # sarcastic-soul account owns this project
npx eas build --profile development --platform android
npx expo start --dev-client
```

## CI: auto build / OTA update

`.github/workflows/eas-deploy.yml` runs on every push to `main` that touches
`app/`. It uses Expo's official `continuous-deploy-fingerprint` action:
computes this commit's native fingerprint, starts a new `eas build --profile
preview --platform android` only if no existing build matches it, and always
publishes an OTA update to the `preview` channel/branch otherwise (Android
only — iOS is out of scope, see above). That action's own README
flags it as **experimental / not yet production-ready** — worth knowing, not
a reason to avoid it here.

One-time setup (needs your EAS login, do this yourself):

```sh
cd app
npx eas login
npx eas init                    # links the project (owner: sarcastic-soul)
npx eas update:configure        # installs expo-updates config, sets app.json "updates.url"
npx eas channel:create preview  # if it doesn't already exist
npx eas build --profile preview --platform android   # one manual build first —
                                                       # the action needs an existing
                                                       # build to compare fingerprints against
```

Then in the GitHub repo: **Settings → Secrets and variables → Actions**, add
`EXPO_TOKEN` (generate at https://expo.dev/settings/access-tokens).

## Model

The classifier (`assets/model/model.tflite`) is produced by the scripts in
`../model/` — see that directory for the conversion pipeline from the
Hugging Face checkpoint. Class list and treatment text live in
`assets/model/treatments/` (one JSON file per supported language,
`en.json` is the source of truth for keys/structure); any class outside the
curated demo subset falls back to generic guidance rather than crashing.

## Internationalization

UI strings live in `src/lib/i18n/locales/*.json` (one file per language,
loaded via `i18next`/`react-i18next`), and treatment/diagnosis content lives
in `assets/model/treatments/*.json` the same way — `getTreatment()` in
`src/lib/model/treatments.ts` picks the active language's table, defaulting
to the app's current `i18n.language`. Adding a language means adding both a
locale file and a treatments file with the exact same keys as the English
ones, then registering the language in `src/lib/i18n/index.ts`'s
`SUPPORTED_LANGUAGES` list.

The 10 non-English translations were AI-generated and structurally verified
(keys, `{{placeholder}}` tokens, severity/unit enums all match the English
source across every locale) — not yet reviewed by native speakers. Worth a
pass before this ships anywhere real.

## Native modules / rebuilding

`@react-native-community/datetimepicker`, `react-native-fast-tflite`,
`llama.rn`, `@react-native-ml-kit/text-recognition`, and `expo-speech` are
native modules — after pulling changes that touch any of them, or after
editing `app.json`'s `plugins`, you need `npx expo run:android` (or a fresh
EAS build), not just a Metro reload.

Local Gradle builds are pinned to `arm64-v8a` only
(`android/gradle.properties` and the `ORG_GRADLE_PROJECT_reactNativeArchitectures`
env var) to avoid OOM on memory-constrained dev machines — covers virtually
all modern Android phones, but won't install on x86 emulators or 32-bit
devices. EAS builds are unaffected and still build all ABIs.
