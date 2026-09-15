# CropDoc

Offline crop leaf disease detection. Point the camera at a leaf, get an
instant diagnosis and treatment steps — fully on-device, no internet
required. See `../BUILD-PLAN.md` for the full architecture and rationale.

## Status

Stage 2 (app core) in progress:

- [x] Expo Router app skeleton (Scan / History tabs + Diagnosis modal)
- [x] Camera capture (`expo-camera`)
- [x] On-device preprocessing (center-crop + resize + normalize)
- [x] `react-native-fast-tflite` wired up, awaiting `assets/model/model.tflite`
- [x] Local scan history (`expo-sqlite`)
- [x] Bundled treatment lookup (`assets/model/treatments.json`)
- [x] Model conversion finished and dropped into `assets/model/` (see `../model/README.md`)
- [x] Gemini "second opinion" online enhancement (Stage 4) — `gemini-3.6-flash`, direct REST call, online-only, optional
- [ ] Real on-device camera-photo validation (PyTorch/TFLite parity already verified on random input)

## Gemini second opinion

Requires `EXPO_PUBLIC_GEMINI_API_KEY` in `app/.env` (copy `.env.example`, get a
free-tier key from [Google AI Studio](https://aistudio.google.com/apikey)).
Ships client-side per the no-backend architecture — the key is embedded in
the bundle, so restrict it in AI Studio and keep it on the free tier.

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
preview` only if no existing build matches it, and always publishes an OTA
update to the `preview` channel/branch otherwise. That action's own README
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
`assets/model/treatments.json`; any class outside the curated demo subset
falls back to generic guidance rather than crashing.
