@AGENTS.md

## EAS

EAS/Expo account for this project: **sarcastic-soul** (owner field set in
app.json). User runs `eas login`/`eas init`/`eas build` themselves — never
attempt EAS login or account-owning commands here.

## Android only

No app-store distribution planned, no Apple Developer account. Do not add
back: `app.json` `ios` config block, `package.json` `ios` script, iOS build
profiles/keys in `eas.json`, or `--platform ios`/`--platform all` in the CI
workflow (`.github/workflows/eas-deploy.yml` is pinned to `platform: android`
deliberately — `platform: all` will fail there with no Apple credentials
configured). Cross-platform `Platform.select({ios: ..., android: ...})`
branches in shared UI code (theme fonts, safe-area insets) are fine to leave
as-is — they're normal RN patterns, not iOS build/distribution surface.

