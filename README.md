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
- [ ] Model conversion finished and dropped into `assets/model/`
- [ ] Gemini "second opinion" online enhancement (Stage 4)

## Development

Requires an EAS custom dev client — `react-native-fast-tflite` is a native
module, so Expo Go cannot run this app.

```sh
npx eas login                       # sarcastic-soul account owns this project
npx eas build --profile development --platform android
npx expo start --dev-client
```

## Model

The classifier (`assets/model/model.tflite`) is produced by the scripts in
`../model/` — see that directory for the conversion pipeline from the
Hugging Face checkpoint. Class list and treatment text live in
`assets/model/treatments.json`; any class outside the curated demo subset
falls back to generic guidance rather than crashing.
