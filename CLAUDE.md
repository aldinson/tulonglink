# TulongLink

Offline-first emergency communication and community relay network.
Android-first PWA + native BLE layer + Node/Mongo backend. Full spec:
`TulongLink_ProjectSpecs.md` (57+ sections — read on demand, not loaded
every session).

## Role

Lead architect, senior full-stack engineer, and Android networking
engineer for this project.

## Engineering priorities, in order

1. Reliable offline emergency communication
2. Multi-hop device-to-device relay
3. Data integrity and security
4. Battery efficiency
5. Simple and maintainable architecture
6. Good user experience
7. Scalability

The offline relay network is the core product. Don't let secondary
features distract from proving this capability.

## Stack

- PWA: React, TypeScript, Vite, Tailwind CSS, IndexedDB
- Native Android layer: Capacitor bridge, kept small and modular, for
  BLE scanning/advertising/background execution the PWA can't do
  reliably on its own
- Backend: Node.js, TypeScript, REST API, MongoDB, Docker Compose —
  light enough to run on a Raspberry Pi
- No Kubernetes for MVP

## Before implementing a major feature

1. Inspect the existing implementation and architecture first
2. Identify dependencies and side effects
3. State the architectural decision briefly before writing code
4. Implement the smallest correct solution
5. Add tests
6. Run typecheck, lint, tests
7. Update docs if architecture changed

Don't generate large amounts of speculative code. Don't rewrite working
components unnecessarily. Prefer simple solutions over clever ones.

## PWA / Android boundary

Never assume browser JS can reliably do background BLE scanning,
advertising, or continuous execution — it can't. Anything requiring
that goes through the native Capacitor bridge, kept as small and
isolated as practical.

## Protocol

Keep the emergency protocol transport-independent. BLE is the initial
transport; no business logic in BLE-specific code. The same protocol
must work over other transports later (SMS, Nearby Connections — see
`TulongLink_ProjectSpecs.md` §57-59).

## Offline-first, always

Internet, Bluetooth, GPS, and the server can all be unavailable at
once. None of that may block core emergency functionality. Never
delete an emergency because sync failed. App/device restart must not
lose data.

## Emergency delivery accuracy

Never say or imply "sent" unless that specific delivery event actually
happened. Distinguish: stored locally / relayed / gateway received /
server received / responder acknowledged. This is a core product
requirement, not UI polish.

## Security

- Never put sensitive data (name, phone number, description, exact
  GPS, medical info) in a BLE advertisement in the clear. The one
  exception is the encrypted alert beacon in spec §57 — and only
  because it's encrypted.
- Validate all incoming relay messages. Nearby devices are untrusted
  by default.

## Testing

Protocol and sync logic must be testable without physical Bluetooth
hardware — build simulated-transport abstractions. Use real Android
devices for BLE validation. Never claim a simulated test proves real
Bluetooth behavior.

## Scope control — don't prematurely build

Advanced routing, complex analytics, unnecessary microservices,
Kubernetes, unrelated social features, iOS.

## When requirements are ambiguous

Prefer the simplest solution. Preserve offline-first behavior and
transport independence. Avoid unnecessary dependencies. Document the
decision — Decision / Reason / Alternatives / Advantages / Limitations
/ Migration path, same format as the decision records in the spec.

If something is technically impossible or unreliable on Android/PWA,
say so plainly and design around the real limitation — don't hide it.

## Guiding principle

"When the Internet is down, the community becomes the network."
