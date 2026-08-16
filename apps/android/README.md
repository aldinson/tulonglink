# TulongLink Android shell

This is deliberately **not** a generated Android Studio/Gradle project yet.
Milestone 1 has no BLE work (that's Phase 3 — see
`TulongLink_ProjectSpecs.md` §19-22), so there is nothing yet for a native
bridge to expose. Generating the full native project now would be
thousands of lines of boilerplate with no plugin to add to it, and it
can't be built or verified in a plain dev shell without Android
Studio/the Android SDK installed.

## What's here

- `capacitor.config.ts` — points Capacitor at `apps/web`'s production
  build (`webDir: "../web/dist"`).
- `package.json` — `@capacitor/core` + `@capacitor/cli` only.
  `@capacitor/android` is deliberately not installed yet — it bundles a
  full native Android platform template (deep Java package paths that,
  on Windows, tripped `npm install`'s symlink/cleanup step when it was
  tried during scaffolding). `npx cap add android` (below) installs it
  on demand when it's actually needed.

## Bringing up the real native project (Phase 3)

When BLE work starts:

```sh
npm run build -w @tulonglink/web   # produces apps/web/dist
cd apps/android
npx cap add android                # installs @capacitor/android, generates the Android Studio project
npx cap sync android
```

Then add the native BLE plugin (scanning/advertising/background relay)
as its own small, modular Capacitor plugin per
`CLAUDE.md`'s PWA/Android boundary section — keep it isolated behind a
clean interface the PWA calls, with no emergency-protocol business logic
inside it (spec §5, §52).

Until then, the PWA (`apps/web`) runs fine standalone in a mobile
browser for the online-only reporting path this milestone implements.
