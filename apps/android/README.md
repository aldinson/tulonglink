# TulongLink Android shell

This is deliberately **not** a generated Android Studio/Gradle project yet.
There is still no native Android project for a Kotlin implementation to
live in. Generating one now would be thousands of lines of boilerplate
with no plugin to add to it, and it can't be built or verified in a
plain dev shell without Android Studio/the Android SDK installed —
neither is available in this dev sandbox.

## What's here

- `capacitor.config.ts` — points Capacitor at `apps/web`'s production
  build (`webDir: "../web/dist"`).
- `src/BleRelayPlugin.ts` — the Capacitor plugin **interface** a native
  BLE implementation must satisfy (Phase 3, spec §19-22): advertising,
  scanning, per-peer GATT connect/disconnect, and raw frame send/receive
  as native events. This is the boundary CLAUDE.md's PWA/Android section
  requires — the only place BLE-specific concepts are named at all. No
  emergency-protocol logic lives on this side of it; that's all in
  `packages/relay`, which is fully unit/integration-tested against a
  simulated transport and knows nothing about BLE (see that package's
  source for the actual protocol implementation: handshake, message
  summary/diff sync, dedup, TTL, validation).
- `package.json` — `@capacitor/core` + `@capacitor/cli` only.
  `@capacitor/android` is deliberately not installed yet — it bundles a
  full native Android platform template (deep Java package paths that,
  on Windows, tripped `npm install`'s symlink/cleanup step when it was
  tried during scaffolding). `npx cap add android` (below) installs it
  on demand when it's actually needed.

## Bringing up the real native project

```sh
npm run build -w @tulonglink/web   # produces apps/web/dist
cd apps/android
npx cap add android                # installs @capacitor/android, generates the Android Studio project
npx cap sync android
```

**Before writing the Kotlin implementation**, run a hardware spike: confirm
a single Android device can simultaneously advertise (peripheral/GATT
server) and scan/connect to other peers (central/GATT client). This dual
role is a known Android BLE risk area (see `TulongLink_ProjectSpecs.md`
§57.7), and the whole multi-hop relay depends on it working. This needs
Android Studio and at least two physical devices — neither available
here — so it's follow-up work for whoever picks up the native side, not
something completed in this pass.

Once that's confirmed, implement `BleRelayPlugin` in Kotlin and adapt its
events to a `packages/relay` `PeerConnection` per connected peer — the
protocol logic on the other side of that adapter is already written and
tested.

**A note on what "tested" means here:** `packages/relay`'s test suite
proves the sync/dedup/validation logic is correct against a simulated
transport. It does not and cannot prove anything about real BLE
behavior — radio range, GATT MTU limits, advertising reliability, the
central/peripheral dual-role question above. Per CLAUDE.md, never treat
the simulated tests as evidence the native layer works; that only comes
from running the real implementation on real devices (spec §47's
four-device MVP proof, Phase 7 field testing).

Until the native implementation exists, the PWA (`apps/web`) runs fine
standalone in a mobile browser for the online-only reporting path
Milestone 1 implements.
