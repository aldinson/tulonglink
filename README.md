# TulongLink

TulongLink is an Android-first, offline-first emergency communication and
community relay network. See `TulongLink_ProjectSpecs.md` for the full
product/engineering specification and `CLAUDE.md` for engineering
priorities and working rules.

## Status

**Milestone 1** (Phase 1 + 2 foundation) is scaffolded: monorepo, PWA
shell, Node/Mongo API, Docker Compose, IndexedDB, phone+OTP auth, and the
**online-only** emergency-reporting path with accurate delivery-state UI.
There is no BLE, no relay, and no responder dashboard yet — that's
Phase 3 onward.

## Layout

```text
/apps
  /web        React PWA (Vite, TS, Tailwind) — resident-facing app
  /android    Capacitor shell (config only; see apps/android/README.md)
/services
  /api        Node/TS/Express/Mongo REST API
/packages
  /shared     Types + zod validation shared by web and api
  /protocol   Transport-independent message envelope (spec §53)
  /sync       Persistence-agnostic sync queue orchestration (spec §32)
```

`packages/database`, `packages/crypto`, `packages/ui` don't exist yet —
nothing outside `services/api` touches Mongo, nothing signs messages
(that starts with BLE in Phase 3), and there's only one UI consumer.
They get created the moment a second consumer needs them.

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

Verified passing (22/22 tests, clean typecheck, clean `vite build` with
the PWA service worker generated) on an NTFS copy of this tree, for the
reason noted above.

Unit-level only right now: `packages/shared`'s validation, `packages/sync`'s
queue logic, the API's token/OTP services, and the web app's offline
emergency-creation path (via `fake-indexeddb`). There is no integration
suite hitting a real MongoDB yet — add one (e.g. with
`mongodb-memory-server`) when that's worth the added dependency.

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

### Auth: OTP + swappable provider, JWT with offline-tolerant session
- **Reason:** spec §10 requires the OTP provider to be swappable (mock
  ships now); spec §33 requires the app to open offline for a previously
  authenticated user without blocking on token validity.
- **Limitations:** device revocation takes up to one access-token
  lifetime (`JWT_ACCESS_TTL_MINUTES`, default 15 min) to take effect,
  since `requireAuth` doesn't hit the database per request — see the
  comment in `services/api/src/middleware/auth.ts`.
