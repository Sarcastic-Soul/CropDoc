@AGENTS.md

## EAS

EAS/Expo account for this project: **sarcastic-soul** (owner field set in
app.json). User runs `eas login`/`eas init`/`eas build` themselves — never
attempt EAS login or account-owning commands here.

## Builds

Never run `expo run:android`, `eas build`, `expo prebuild`, or any other
build/native-regeneration command. User builds and installs the app
themselves. Editing source/config files is fine; running the build is not.

Adding a native dependency (anything with Android/`android/` native code,
not pure JS) is fine via `npm install` — the checked-in `android/` folder's
autolinking picks it up on the user's own next `npx expo run:android`. Just
flag it in your reply so they know a rebuild (not just `npm run start`) is
needed, and if it's a from-source native build (e.g. `whisper.rn` compiles
whisper.cpp via CMake/NDK), say the first build after it will be slower
than usual.

## Android only

No app-store distribution planned, no Apple Developer account. Do not add
back: `app.json` `ios` config block, `package.json` `ios` script, iOS build
profiles/keys in `eas.json`, or `--platform ios`/`--platform all` in the CI
workflow (`.github/workflows/eas-deploy.yml` is pinned to `platform: android`
deliberately — `platform: all` will fail there with no Apple credentials
configured). Cross-platform `Platform.select({ios: ..., android: ...})`
branches in shared UI code (theme fonts, safe-area insets) are fine to leave
as-is — they're normal RN patterns, not iOS build/distribution surface.

