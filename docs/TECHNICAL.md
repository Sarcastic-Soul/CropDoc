# CropDoc: technical notes

Deeper implementation notes behind the [README](../README.md): why things
are built the way they are, library limitations, and build/CI details.

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
- A farmer can attach one past scan's diagnosis to a specific outgoing
  message via the leaf icon in the input bar, which opens
  `DiagnosisAttachPicker` — a modal that browses real scan history (not a
  capped list of distinct disease names), since a farmer with hundreds of
  scans needs to find one, not skim a chip row. Attaching text only, never
  a photo — the LLM is text-only. Multi-turn history is capped at the last
  6 turns (`MAX_HISTORY_TURNS` in `src/lib/llm/engine.ts`).
- Conversations persist to SQLite (`conversations` /
  `conversation_messages` tables in `src/lib/db.ts`), grouped by day/time.
  The hamburger icon opens `ChatHistorySidebar` to browse and resume any
  past conversation; the "+" icon starts a new one.
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
- Grounding is capped at 3 treatment blocks (attached scan + up to 2
  retrieved matches) for the same reason history is capped at 6 turns:
  SmolLM2-360M's architectural ceiling is 8192 tokens, but its benchmarks are
  weak (MMLU ~33%, GSM8K ~7%) with no published guidance on reliable context
  length, so the prompt budget stays in the low hundreds of tokens rather
  than pushing toward that ceiling.
- Every assistant answer is read aloud (`expo-speech`, on-device OS TTS, no
  network) — toggle in the Ask tab header, or tap the small speaker badge on
  the top-right corner of any answer bubble to replay/stop it individually.
  Aimed at farmers who can't comfortably read the screen.
- **Voice input (speech-to-text)** — a mic button in the input row. Tap to
  record, tap again to stop; the recording is transcribed on-device via
  `whisper.rn` (`ggml-tiny.bin`, ~78 MB, its own opt-in download separate
  from the chat LLM) and the result fills the text input for the farmer to
  review or edit — it never auto-sends. Android's `MediaRecorder` (what
  `expo-audio`/`expo-av` use) can't produce raw WAV/PCM at all, and
  whisper.cpp's file loader only reads WAV, so recording goes through
  `@fugood/react-native-audio-pcm-stream` (via `whisper.rn`'s own
  `AudioPcmStreamAdapter`, not its heavier realtime/VAD pipeline) for raw
  PCM capture, which gets wrapped into a WAV file by hand
  (`src/lib/stt/recorder.ts`). Transcription language is passed as the
  app's current UI language rather than left on `auto`, for better
  accuracy. Model lives under Settings alongside the chat LLM, removable
  the same way.

## Label scan (Dosage calculator)

Crop and disease are chosen via cascading dropdowns
(`src/components/dropdown-field.tsx`) driven by `CROPS`/`LABEL_TO_CROP` in
`src/lib/model/labels.ts`, which cover all 38 model classes — not just the
ones with curated dosage data, so a disease outside that curated subset is
still selectable and just shows a "no dosage data" state rather than being
hidden.

The label camera is the app's own `CameraView` screen (`src/app/camera.tsx`,
opened with `mode=label-scan`) — the same in-app camera used for leaf
diagnosis, not the OS's stock camera via `expo-image-picker`. It hands the
captured photo back to the Dosage tab (`labelScanUri` route param) for OCR.

`@react-native-ml-kit/text-recognition` runs Google ML Kit's *bundled*
on-device text recognizer (`com.google.mlkit:text-recognition`, not the
Play-Services-downloaded variant) — no network, no first-run model download,
adds to APK size instead. `src/lib/dosage/label-ocr.ts` regex-matches a
per-liter application rate out of the raw OCR text (requires an explicit
`/L` or "per litre" denominator specifically so it doesn't grab the
bottle's net-volume figure printed elsewhere on the same label) and flags
whether it falls inside the bundled typical-rate range for the selected
disease. Script selection (`Latin`/`Devanagari`/`Chinese`) follows the
app's current language; Bengali and Urdu aren't among the 5 scripts this
library supports at all, so labels in those scripts fall back to (weaker)
Latin recognition — a library limitation, not something fixable at the app
level.

## CI: auto build / OTA update

`.github/workflows/eas-deploy.yml` runs on every push to `main` (this repo
*is* the app now — no more path filter needed). It uses Expo's official
`continuous-deploy-fingerprint` action:
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

The classifier (`assets/model/model.tflite`) is converted from the Hugging
Face checkpoint `linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification`
(PyTorch → ONNX → `onnx2tf` → TFLite, NHWC float32). The model outputs raw
logits; softmax is applied app-side in `src/lib/model/inference.ts`. Input
preprocessing is center-crop → 224×224 → `(x / 127.5) - 1`, matching the
checkpoint's `image_mean`/`image_std` of 0.5. Class list and treatment text live in
`assets/model/treatments/` (one JSON file per supported language,
`en.json` is the source of truth for keys/structure); all 38 classes have a
curated entry.

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
`llama.rn`, `@react-native-ml-kit/text-recognition`, `expo-speech`,
`whisper.rn`, and `@fugood/react-native-audio-pcm-stream` are native
modules — after pulling changes that touch any of them, or after editing
`app.json`'s `plugins`, you need `npx expo run:android` (or a fresh EAS
build), not just a Metro reload / `npm run start`. `whisper.rn` compiles
whisper.cpp from source via CMake/NDK (no prebuilt `jniLibs`), so the first
build after adding it is noticeably slower than usual.

Local and EAS builds are both pinned to `arm64-v8a` only (set by
`plugins/with-android-build-tuning.js`, along with Gradle heap and build-cache
tuning); `npm run android:lite` (`scripts/android-lite.sh`) additionally caps
the build's CPU and RAM so an 8 GB laptop stays usable. `llama.rn` only ships
prebuilt native libraries for `arm64-v8a` and `x86_64`, and arm64 covers
virtually all modern Android phones, but the build won't install on 32-bit
devices.
