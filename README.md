# TulongLink

TulongLink is an Android-first, offline-first emergency communication and
community relay network. See `TulongLink_ProjectSpecs.md` for the full
product/engineering specification and `CLAUDE.md` for engineering
priorities and working rules.

## Status

**Milestone 1** (Phase 1 + 2 foundation) is complete: monorepo, PWA
shell, Node/Mongo API, Docker Compose, IndexedDB, phone+OTP auth, and the
**online-only** emergency-reporting path with accurate delivery-state UI.

**Phase 3** (BLE protocol, spec §19-22/§53) is scoped and its
transport-independent half is implemented: `packages/relay` has the full
peer-handshake/message-summary-sync/dedup/TTL/validation engine, proven
via a simulated in-memory transport (multi-hop `A → B → C` relay and
cross-path deduplication, both integration-tested — see
`packages/relay/src/integration.test.ts`). The other half — the real
native BLE plugin — is not implemented: `apps/android/src/BleRelayPlugin.ts`
defines the interface it must satisfy, but there's no Android Studio/SDK
in this environment to build or verify Kotlin against. See
`apps/android/README.md` for exactly what's left and why it needs
physical devices.

**Phase 4** (multi-hop relay, spec §44-45/§48) is also scoped and
implemented at the same transport-independent layer: `packages/relay`
now prunes expired messages out of what it offers to peers (closing a
Phase 3 gap — an expired message no longer propagates forever), survives
a peer disconnecting mid-sync without losing already-transferred
progress (`SyncOutcome.interrupted`), and `packages/relay/src/gateway.ts`
uploads relayed messages to the server once a device has Internet,
without removing them from what it still offers to other peers. The full
`A → B → C → D → Server` chain — spec §44's minimum target and §47's
literal MVP proof — is integration-tested in simulation. No responder
dashboard yet; that's Phase 5.

## Layout

```text
/apps
  /web        React PWA (Vite, TS, Tailwind) — resident-facing app
  /android    Capacitor shell + BLE plugin interface (see apps/android/README.md)
/services
  /api        Node/TS/Express/Mongo REST API
/packages
  /shared     Types + zod validation shared by web and api
  /protocol   Transport-independent message envelope (spec §53)
  /sync       Persistence-agnostic sync queue orchestration (spec §32)
  /relay      BLE-agnostic peer sync + gateway engine: handshake, dedup, TTL,
              validation, interrupted-sync recovery, server upload (spec §19-22, §44-45)
```

`packages/database`, `packages/crypto`, `packages/ui` don't exist yet —
nothing outside `services/api` touches Mongo, nothing signs messages
(signatures are Phase 6, see `packages/relay/src/validation.ts`), and
there's only one UI consumer. They get created the moment a second
consumer needs them.

## Running locally

Requires Node 20+.

**Windows note:** `npm install` needs symlink (or NTFS junction) support
to link the workspace packages together. This was scaffolded from a
sandbox where the project directory sat on an **exFAT** drive, which
cannot create NTFS reparse points at all — `npm install` failed with
`EISDIR` on every attempt, regardless of privileges, `--install-links`,
or any other flag, until the same files were copied to an NTFS volume.
If `npm install` fails the same way for you, run `Get-Volume` in
PowerShell to check your drive's filesystem — if it's exFAT/FAT32, move
the project to an NTFS (or, on Linux/macOS, any normal) volume. This is
a filesystem limitation, not something the project's config can work
around: npm workspaces (like pnpm/yarn workspaces) fundamentally rely on
that link support.

```sh
npm install

# API + Mongo
cp services/api/.env.example services/api/.env
npm run dev:api                 # http://localhost:4000
npm run seed -w @tulonglink/api # seeds a "Demo Community" (never Napo — spec §9)

# Web
cp apps/web/.env.example apps/web/.env
npm run dev:web                 # http://localhost:5173
```

`npm run dev:api` expects a MongoDB instance at `MONGO_URI`
(`services/api/.env`); run one locally or via `docker compose up mongo`.

The Mock OTP provider logs the code to the API's console and — outside
`NODE_ENV=production` — also returns it in the `/api/auth/request-otp`
response body (`devOtp`) so local frontend work doesn't require tailing
server logs.

### Full stack via Docker Compose

```sh
cp .env.example .env   # fill in JWT_ACCESS_SECRET / JWT_REFRESH_SECRET
docker compose up --build
```

This brings up `mongo` + `api`. **Not verified in this environment** —
Docker wasn't available in the sandbox this was scaffolded in. Review the
compose file and `services/api/Dockerfile` before relying on them, and
expect to iron out rough edges on first run.

**Known Raspberry Pi limitation:** the official `mongo` Docker image only
publishes 64-bit ARM (`arm64`) builds, i.e. Raspberry Pi 4/5 running a
64-bit OS. A 32-bit Raspberry Pi OS install cannot run this compose file
as-is; that would need a different database or a self-built MongoDB
image, neither of which is in scope here.

### Tests / typecheck

```sh
npm run test        # vitest across all workspaces
npm run typecheck    # tsc --noEmit across all workspaces
```

Verified passing (47/47 tests, clean typecheck, clean `vite build` with
the PWA service worker generated) on an NTFS copy of this tree, for the
reason noted above.

Mostly unit-level: `packages/shared`'s validation, `packages/sync`'s
queue logic, the API's token/OTP services, and the web app's offline
emergency-creation path (via `fake-indexeddb`). `packages/relay` adds
integration tests too — multi-hop relay, cross-path dedup, and the full
`A → B → C → D → Server` gateway chain, all over a simulated
transport/fake upload — but nothing here touches real Bluetooth hardware
or a real MongoDB. Add a Mongo integration suite (e.g. with
`mongodb-memory-server`) when that's worth the added dependency; a real
BLE proof needs the native plugin and physical devices (see
`apps/android/README.md`) and can't be a `vitest` suite at all.

## Architecture decisions (Milestone 1)

Format: Decision / Reason / Alternatives / Advantages / Limitations /
Migration path, per `CLAUDE.md`.

### Monorepo tooling: npm workspaces, no Turborepo/Nx
- **Reason:** only 3 apps/packages exist; a task runner isn't earning
  its keep yet (CLAUDE.md: avoid unnecessary dependencies).
- **Alternatives:** pnpm workspaces (new package manager to adopt),
  Turborepo/Nx (caching/pipelines, overkill at this scale).
- **Advantages:** zero extra tooling; npm is already required.
- **Limitations:** no build caching, and no automatic topological build
  ordering across packages — this is why `services/api` runs via `tsx`
  instead of a `tsc` build step (see below).
- **Migration path:** add Turborepo later without restructuring; the
  workspace layout is already compatible.

### `services/api` runs via `tsx`, not a `tsc` build
- **Reason:** `services/api` depends on `packages/shared|protocol|sync`,
  which ship as TypeScript source (`main`/`types` point at `src/`, no
  build step). A `tsc` build of the API would need those packages built
  first, and plain npm workspaces has no tool enforcing that order.
  `tsx` transpiles on import instead, sidestepping the ordering problem
  for both `npm run dev:api` and the Docker image.
- **Alternatives:** TypeScript project references with `tsc -b`
  (correct, but adds a second thing to keep in sync as packages
  change); bundling with esbuild/tsup.
- **Advantages:** one execution model for dev and "production" for this
  size of service; no dist/ artifacts to go stale.
- **Limitations:** no minification/dead-code elimination; each container
  transpiles TS at startup (negligible for a REST API this size).
- **Migration path:** revisit if/when the API needs a real bundled
  build (e.g. multi-stage optimized image, cold-start sensitivity).

### Delivery states shown in the UI stop at what Phase 1+2 can prove
- **Reason:** `RELAYED` / `GATEWAY_RECEIVED` are BLE-only events (Phase
  3/4). CLAUDE.md requires never implying a delivery event that didn't
  happen; the UI omits those states entirely rather than showing them
  stuck at a fake "0 devices, pending."
- **Migration path:** `packages/sync`'s queue and `packages/protocol`'s
  message envelope are already transport-agnostic, so Phase 3 adds relay
  states without redesigning the emergency lifecycle.

### `apps/android` is config-only, no generated native project
- See `apps/android/README.md`.

### `packages/relay` is a separate package from `packages/protocol`
- **Reason:** `packages/protocol` holds wire message *shapes* (pure
  data); the peer-handshake sequence (§21) is stateful *orchestration*
  — the same split `packages/sync` already draws for queue
  orchestration vs. the payload types it moves.
- **Alternatives:** put the handshake logic inside `packages/protocol`
  directly (rejected — conflates data shape with behavior, and
  `packages/protocol` is meant to be usable by any transport, including
  ones that never run this specific sync algorithm); put it in
  `apps/android` (rejected — it isn't BLE-specific, and CLAUDE.md
  requires no business logic in BLE-specific code).
- **Advantages:** fully unit/integration-testable without hardware
  (`packages/relay/src/simulatedTransport.ts`); a future SMS or Nearby
  Connections transport (spec §58-59) reuses it unchanged, same as
  `packages/sync` already does for Device→Server upload.
- **Limitations:** none yet identified; revisit if a transport turns out
  to need a materially different sync sequence, not just a different
  `PeerConnection`.
- **Migration path:** none needed — this is additive to the existing
  package layout.

### Message integrity uses a payload hash now; signatures wait for Phase 6
- **Reason:** spec §26 requires detecting malformed/corrupted/replayed/
  version-mismatched messages, all of which a SHA-256 payload hash +
  zod schema + protocol-version + TTL check catch without any key
  infrastructure. Signatures additionally prove *who* sent a message,
  which needs device key issuance/storage/rotation — a Phase 6
  (Security) concern the spec itself separates out.
- **Alternatives:** build signing now alongside hashing (rejected —
  no key-management package exists yet, and CLAUDE.md/dev rule #15 say
  not to build ahead of the phase that needs it).
- **Advantages:** zero new dependencies (`crypto.subtle.digest` is
  available in both the browser and Node); still catches every failure
  mode spec §26 lists except a malicious device tampering payload *and*
  hash together, which only a signature actually prevents.
- **Limitations:** a compromised or malicious relay hop could forge a
  self-consistent (hash matches its own tampered payload) message right
  now — acceptable for Phase 3's scope (proving the relay mechanism
  works) but must close before field deployment.
- **Migration path:** Phase 6 adds a signature field to `EmergencyMessage`
  and a check in `packages/relay/src/validation.ts` alongside the
  existing hash check, without changing the handshake sequence.

### Gateway upload is a new function, not a reuse of `packages/sync`'s `processSyncQueue`
- **Reason:** `processSyncQueue` removes an item from its store once
  upload succeeds — correct for Milestone 1's Device→Server queue, wrong
  for relayed messages: a device that successfully uploads a message to
  the server must keep offering that same message to peers that haven't
  seen it yet (spec §45). Upload status and "still relayable" are
  genuinely different, simultaneously-true facts about one message.
- **Alternatives:** generalize `processSyncQueue` with a "remove on
  success" flag (rejected — adds a parameter that exists solely to
  support a case its own docstring says isn't its job, for one caller);
  keep messages in two separate stores, one for relay and one for
  upload (rejected — that's the actual duplicate-source-of-truth
  problem `packages/sync`'s own header comment already warned against
  avoiding).
- **Advantages:** `RelayStore.markUploaded`/`isUploaded` sit right next
  to the data they describe; `runGatewayUpload` reads as exactly what it
  does — upload whatever a device holds that the server doesn't have
  yet — without also explaining why that's not deleting anything.
- **Limitations:** two small pieces of near-identical retry-on-failure
  logic now exist in the codebase (`processSyncQueue` and
  `runGatewayUpload`) instead of one. Deliberate, given the semantic
  mismatch above — see CLAUDE.md: three similar lines beat a premature
  shared abstraction.
- **Migration path:** none anticipated; revisit only if a third queue
  with the same "never remove, just mark" shape shows up.

### Interrupted sync returns a partial result instead of throwing
- **Reason:** spec §42 requires tolerating "relay device disappearing"
  and "partial synchronization." A real BLE disconnect will make
  `PeerConnection.send`/`receive` reject; letting that propagate out of
  `runSync` would hand a future caller managing many simultaneous peer
  connections (the native bridge) an exception instead of the messages
  that *did* transfer before the drop.
- **Advantages:** the fix cost nothing structural — messages were
  already being stored one at a time, not batched, so the only real
  change was tracking `sentMessageIds` incrementally too and wrapping
  the sequence in try/catch. `SyncOutcome.interrupted` makes "this
  connection didn't finish cleanly" visible to the caller without it
  needing to catch anything itself.
- **Limitations:** a message that was mid-transfer (sent but the
  receiver hadn't finished validating/storing it) is simply absent from
  both sides' next summary and gets re-offered on the next connection —
  no explicit resume-from-where-it-left-off logic. Acceptable: spec §45
  already assumes exactly this kind of retry-via-next-opportunity.

### Auth: OTP + swappable provider, JWT with offline-tolerant session
- **Reason:** spec §10 requires the OTP provider to be swappable (mock
  ships now); spec §33 requires the app to open offline for a previously
  authenticated user without blocking on token validity.
- **Limitations:** device revocation takes up to one access-token
  lifetime (`JWT_ACCESS_TTL_MINUTES`, default 15 min) to take effect,
  since `requireAuth` doesn't hit the database per request — see the
  comment in `services/api/src/middleware/auth.ts`.
