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

**Phase 5** (responder dashboard, spec §35-37) is implemented and
verified end-to-end against a real (in-memory) MongoDB — not just
simulated. STAFF/ADMIN users get a role-gated dashboard
(`apps/web/src/pages/dashboard/`) with a New/Critical/Active/Resolved
incident queue, a Leaflet map, and a detail view with
acknowledge/assign/start-progress/resolve/cancel actions and an audit
trail. Server-side, every status change is validated against an
explicit state machine (`services/api/src/services/incidentStatusMachine.ts`)
and recorded as an `IncidentEvent` reusing the same `DeliveryState`
vocabulary the resident-facing pipeline already uses. There is still no
path in the app to *create* a STAFF account (`npm run promote-user`,
below, is a local-dev-only stand-in) and no way for a resident's client
to pull status changes back down — see the decision records below for
both.

**Phase 6** (security, spec §27-28/§46/§48) is implemented in two parts.
Auth/device hardening: rate limiting on the OTP endpoints
(`express-rate-limit`), a per-code attempt cap in `MockOtpProvider`,
a fix for a real device-identity-hijack gap in `verifyOtp` (a `deviceId`
could previously be silently reassigned to a different account), and
ADMIN-only device revocation (`GET /api/devices`,
`POST /api/devices/:deviceId/revoke`, plus a small `/admin/devices`
page). Device signing: `packages/crypto` (Ed25519 via Web Crypto) is new
— `EmergencyMessage` now carries a `signature` and `originPublicKey`,
`packages/relay` signs on build and verifies on receipt, and every
existing relay test was updated to build messages with a real signing
keypair rather than an unsigned fixture. Server-side verification of
`originPublicKey` against a device's registered key is still deferred —
same reason as before: nothing hands the server a signed envelope yet,
pending the native BLE plugin and the Phase 4 gateway-wiring that also
depends on it.

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
  /crypto     Ed25519 device signing keys via Web Crypto (spec §26-27)
```

`packages/database`, `packages/ui` don't exist yet — nothing outside
`services/api` touches Mongo, and there's only one UI consumer. They
get created the moment a second consumer needs them.

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

# Responder dashboard access: register normally (request-otp/verify-otp), then
# promote that phone number — there's no in-app way to do this yet (Phase 6):
npm run promote-user -w @tulonglink/api -- +639171234567 STAFF

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

**HTTPS (spec §27):** the API itself speaks plain HTTP — TLS termination
is a deployment-infra concern (reverse proxy, e.g. Caddy/nginx/Traefik,
or the hosting platform), not application code. Building a Node-level
HTTPS server here would cut against the Raspberry-Pi-friendly,
infra-light design this whole section already assumes. Whatever sits in
front of `services/api` in production must terminate TLS; this compose
file does not do that for you.

### Tests / typecheck

```sh
npm run test        # vitest across all workspaces
npm run typecheck    # tsc --noEmit across all workspaces
```

Verified passing (83/83 tests, clean typecheck, clean `vite build` with
the PWA service worker generated) on an NTFS copy of this tree, for the
reason noted above.

Mostly unit-level: `packages/shared`'s validation, `packages/sync`'s
queue logic, the API's token/OTP services, and the web app's offline
emergency-creation path (via `fake-indexeddb`). `packages/relay` adds
integration tests too — multi-hop relay, cross-path dedup, and the full
`A → B → C → D → Server` gateway chain, all over a simulated
transport/fake upload — still nothing here touches real Bluetooth
hardware. `services/api` also has real Mongo-backed controller
integration tests (`mongodb-memory-server` + `supertest`) for the Phase
5 incident-action endpoints and Phase 6's auth/device endpoints. `packages/crypto`'s
Ed25519 sign/verify/tamper-detection tests run against Node's real
WebCrypto (proven reliable already via `packages/relay`'s hash tests),
and `apps/web`'s key-storage test runs the same code under jsdom's
WebCrypto — both passed with no mocking needed. A real BLE proof still
needs the native plugin and physical devices (see
`apps/android/README.md`) and can't be a `vitest` suite at all.

Phases 5 and 6 were additionally verified live against a real
(in-memory) MongoDB, driven end-to-end with `curl`: Phase 5's full
register → promote → create → acknowledge → assign → start-progress
(`PATCH`) → resolve → audit-trail flow; Phase 6's rate limiter (10
requests succeed, the 11th gets `429`), the device-hijack rejection
(`409` on a live hijack attempt), and the full list/revoke/blocked-relogin
device-revocation flow (`403` on the revoked device's next login). The
dashboard's own React components (Phase 5's queue/detail pages, Phase
6's `/admin/devices` page) were verified by typecheck, a clean
production build, and confirming every new module transforms without
error through the Vite dev server; there was no browser control
available in this session to click through the UI itself, so that
specific layer — does it *render and look* right — is unverified and
should be checked in a real browser before relying on it.

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

### A responder is an existing STAFF/ADMIN user, not a separate roster entity
- **Reason:** spec §40 lists a `responders` collection and §37 wants
  assignment to a typed responder (Tanod/Medical/Fire/Rescue/Other), but
  admin-managed roster CRUD is explicitly §8.3's "Manage responders" —
  Phase 6. Modeling assignment as "an existing STAFF/ADMIN user, tagged
  with a `responderType` at assignment time" satisfies §37's fields
  (`incidentId`/`responderId`/`assignedBy`/`assignedAt`, stored directly
  on the incident) without a second collection nothing yet manages.
- **Alternatives:** a real `responders` collection with its own CRUD
  (rejected — that's Phase 6's admin tooling, out of proportion to what
  Phase 5's dashboard needs); letting `assign` take a free-text name
  (rejected — no referential integrity, nothing to validate against).
- **Advantages:** reuses `UserModel`/roles that already exist; assigning
  to a nonexistent or resident account is rejected server-side
  (`assignIncident`, `services/api/src/controllers/incidentController.ts`).
- **Limitations:** "Fire responder" or "Rescue responder" as external
  contacts with no TulongLink login (a real possibility per §37's list)
  aren't representable yet — only existing staff accounts are assignable.
- **Migration path:** Phase 6's roster, if it adds one, can extend
  `responderType`/assignment without touching the incident schema or
  the status machine — assignment already treats it as opaque metadata.

### Status transitions never fabricate a skipped intermediate event
- **Reason:** the resident-facing `DeliveryStatus` pipeline
  (`apps/web/src/components/DeliveryStatus.tsx`) only reads
  `Emergency.deliveryState` (one field), not the event history, so it
  renders correctly whether or not every intermediate status was
  individually recorded. That freed the state machine
  (`services/api/src/services/incidentStatusMachine.ts`) to allow
  `NEW → ASSIGNED` directly, recording exactly one `ASSIGNED` event —
  not a synthesized `ACKNOWLEDGED` event staff never actually performed.
- **Reason (cont.):** CLAUDE.md's delivery-accuracy principle ("never
  imply an event happened that didn't") applies to the staff-facing
  audit trail as much as the resident-facing pipeline — a fabricated
  acknowledgment would be exactly the kind of implied-but-false event
  that principle rules out, even though nothing outside this codebase
  would likely notice.
- **Advantages:** the audit trail is always literally true; the allowed-
  transitions table stays small (no "acknowledge-then-assign" special
  case to encode).
- **Limitations:** a dashboard view that assumed every incident has an
  `ACKNOWLEDGED` event before `ASSIGNED` would be wrong — none should be
  built that way; query actual status/events, don't assume the sequence.

### `PATCH /api/incidents/:id` carries the two actions with no dedicated route
- **Reason:** spec §41 lists `PATCH /api/incidents/:id` alongside the
  three named action endpoints but doesn't say what it's for. Rather
  than invent a `/cancel` endpoint the spec never names,
  `patchIncidentSchema` restricts the generic PATCH to exactly the two
  transitions with no dedicated route (`IN_PROGRESS`, `CANCELLED`) —
  using the literal endpoint list instead of extending it.
- **Migration path:** if a fourth named action becomes worth its own
  route later, move it out of the PATCH allowlist the same way
  acknowledge/assign/resolve already have their own routes.

### Rate limiting is skipped under `NODE_ENV=test`, not loosened
- **Reason:** the integration test suite exercises many auth/incident
  flows in quick succession against one shared `app` instance (same
  simulated IP) — a first pass at the OTP rate limiter (10 requests per
  15 minutes, applied to both `request-otp` and `verify-otp`) made a
  legitimate 3-step test scenario trip `429` well before any real abuse
  pattern would. Raising the production limit to accommodate that would
  have weakened the actual security value for no real reason.
- **Alternatives:** give each test its own `createApp()` instance so
  rate-limiter state doesn't accumulate (rejected — bigger change to
  every existing test file's structure, for a problem the `skip` flag
  solves in one place); raise the limit until tests stop failing
  (rejected — the number would end up chosen by test convenience, not
  by what's actually a reasonable production limit).
- **Advantages:** the production limiter is tuned for production
  reasoning (cost control + brute-force resistance, spec §27), completely
  independent of how many requests any given test happens to make.
- **Limitations:** the rate limiter itself is therefore never exercised
  by the automated suite — it was verified live instead (see Tests
  section above). If it regresses, only that live check or production
  traffic would catch it.

### `verifyOtp` rejects re-registering a `deviceId` to a different account
- **Reason:** found by inspection, not reported — `DeviceModel` was
  upserted by `deviceId` with no check that it wasn't already bound to
  someone else, so any client that learned another device's ID could
  silently take it over on its next `verify-otp` call. Spec §11 treats
  `deviceId` as a stable identity; §27 asks for "secure device
  registration" directly.
- **Advantages:** closes the gap with a single ownership check, no
  schema change, and a genuine reinstall (same user, same device) is
  unaffected since it hits the same-owner branch.
- **Limitations:** a user who loses a device and later wants that exact
  `deviceId` back has no path to reclaim it (device IDs are meant to be
  per-installation — see the "Device revocation" record below for the
  actual recovery path: a new device generates a new ID).

### `packages/crypto` is a new package; device revocation is ADMIN-only
- **Reason:** this is the "second consumer" moment `README.md` already
  flagged as the trigger for creating `packages/crypto` — both
  `apps/web` (signs) and `packages/relay` (verifies) need the same
  Ed25519 primitives. Device revocation is scoped to ADMIN specifically
  because that's what spec §8.3 actually lists ("Revoke devices"); §8.1's
  resident capability list has no device-management entry, so this
  isn't resident self-service, even though "I lost my phone" self-revoke
  would be user-friendly — the spec draws that line, not a convenience
  judgment call.
- **Limitations (crypto):** Web Crypto's `extractable` flag applies to
  a whole generated key pair, not per-key, so the private key is
  generated extractable rather than truly non-exportable — real
  hardware-backed non-extractability only arrives with native Android
  Keystore (Phase 3's still-pending native plugin). The private key is
  stored as an exported JWK in IndexedDB (not the raw `CryptoKey`
  object) specifically so it round-trips identically in a real browser
  and under `fake-indexeddb` in tests — see
  `packages/crypto/src/deviceKeys.ts` and
  `apps/web/src/services/deviceKeyService.ts`.
- **Migration path:** once BLE relay wiring exists, the server can
  cross-check a message's `originPublicKey` against a device's
  registered key at gateway-upload time — nothing about today's design
  needs to change for that, it's purely an additional check.

### Auth: OTP + swappable provider, JWT with offline-tolerant session
- **Reason:** spec §10 requires the OTP provider to be swappable (mock
  ships now); spec §33 requires the app to open offline for a previously
  authenticated user without blocking on token validity.
- **Limitations:** device revocation takes up to one access-token
  lifetime (`JWT_ACCESS_TTL_MINUTES`, default 15 min) to take effect,
  since `requireAuth` doesn't hit the database per request — see the
  comment in `services/api/src/middleware/auth.ts`.
