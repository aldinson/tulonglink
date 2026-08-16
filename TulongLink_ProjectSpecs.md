# TulongLink — Project Specification

> This document is the authoritative product and engineering specification
> for the TulongLink project. When implementation decisions conflict with
> this specification, review the conflict before proceeding.

# TulongLink
## Offline-First Emergency Communication & Community Relay Network

**Project Status:** Initial Development  
**Target Platform:** Android  
**Application Architecture:** PWA + Android Native Connectivity Layer  
**Backend:** Node.js + TypeScript + MongoDB  
**Primary Communication:** Bluetooth Low Energy (BLE)  
**Deployment:** Cloud or community/local server, including Raspberry Pi  
**Initial Pilot:** Napo / Barangay Community  
**Product Vision:** A reusable emergency communication platform

---

# 1. Product Vision

TulongLink is an Android-first, offline-first emergency communication and community relay network.

Its primary purpose is to allow people to report emergencies even when Internet connectivity is unavailable.

The fundamental concept is:

> **When the Internet is down, the community itself becomes the network.**

A person's phone can create an emergency report without Internet access.

Nearby TulongLink-enabled phones can receive and relay that message from device to device until the message reaches a phone that has Internet connectivity.

That gateway phone uploads the emergency to the TulongLink backend, where barangay staff, tanods, responders, or administrators can receive and manage the incident.

Example:

```text
Resident A
    |
    | Emergency Report
    v
Phone A
OFFLINE
    |
    | Bluetooth
    v
Phone B
RELAY
    |
    | Bluetooth
    v
Phone C
RELAY
    |
    | Bluetooth
    v
Phone D
INTERNET
    |
    | HTTPS
    v
TulongLink Server
    |
    v
Barangay / Emergency Responder
```

The system is intended initially for Philippine communities but must be designed as a general-purpose platform.

---

# 2. Long-Term Product Goal

TulongLink should eventually support:

- Barangays
- Municipalities
- Schools
- Resorts
- Factories
- Construction sites
- Remote communities
- Events
- Disaster-response organizations
- Outdoor activities
- Industrial facilities
- Areas with unreliable mobile connectivity

The Napo deployment is the first real-world pilot, not the architectural limit of the product.

---

# 3. Core Product Principle

The system must NOT depend on Internet connectivity for its core emergency-reporting function.

There are four distinct connectivity conditions:

```text
1. Internet available
2. Internet unavailable
3. Nearby TulongLink devices available
4. No nearby TulongLink devices
```

The application must handle all four conditions.

An emergency report must be usable even when:

```text
Internet = OFF
```

If there are no nearby relay devices, the emergency must remain safely stored on the originating device until:

- Internet becomes available, or
- a TulongLink relay device becomes available.

---

# 4. Platform Strategy

## 4.1 Android Only

The initial product is Android-only.

Do not implement iOS at this stage.

## 4.2 PWA-First

The main application UI should be implemented as a Progressive Web App.

Preferred stack:

- React
- TypeScript
- Vite
- Tailwind CSS

## 4.3 Native Android Connectivity Layer

A pure browser PWA cannot reliably provide all capabilities required for:

- continuous BLE scanning
- BLE advertising
- background operation
- reliable peer-to-peer communication
- Android power-management handling

Therefore the application must use:

```text
React PWA
     |
     v
Application / Domain Layer
     |
     v
Native Android Bridge
     |
     +---- BLE scanning
     +---- BLE advertising
     +---- BLE connection
     +---- BLE data exchange
     +---- background relay service
     +---- native persistence where necessary
```

Capacitor or an equivalent Android wrapper may be used.

Do not abandon the PWA architecture.

The native layer should remain as small and modular as possible.

---

# 5. Transport Abstraction

The emergency protocol must not be tightly coupled to BLE.

Create a transport abstraction.

Conceptually:

```text
Transport
   |
   +-- BLETransport
   |
   +-- SMSTransport
   |
   +-- NearbyConnectionsTransport
   |
   +-- InternetTransport
```

BLE (§19–22, plus the broadcast alert layer in §57) is implemented
first. SMS (§58) and Nearby Connections (§59) are now planned, not
speculative — see those sections for the reasoning behind each.

Future transports should be possible without redesigning the emergency message protocol.

Further potential future transports:

- local Wi-Fi, outside the Nearby Connections abstraction
- other peer-to-peer technologies

---

# 6. Backend

Use:

- Node.js
- TypeScript
- MongoDB
- REST API
- HTTPS
- JWT or equivalent secure authentication
- Docker

The backend must be lightweight.

The architecture must support deployment to:

- Cloud VPS
- Local community server
- Raspberry Pi
- Other Docker-compatible infrastructure

Do not introduce Kubernetes for the MVP.

---

# 7. Architecture

Use a modular monorepo architecture.

Suggested:

```text
/apps
    /web
    /android

/services
    /api

/packages
    /shared
    /protocol
    /crypto
    /sync
    /database
    /ui
```

The exact structure may be adjusted if there is a better engineering reason.

Separate:

- UI
- domain logic
- local persistence
- synchronization
- transport
- BLE implementation
- API communication
- authentication
- emergency protocol

The PWA UI must not directly depend on BLE implementation details.

---

# 8. User Roles

## 8.1 Resident

Normal community member.

Capabilities:

- Register
- Authenticate
- Create emergency
- View own emergencies
- View delivery status
- Receive emergency status updates
- Participate as relay node
- Receive official community alerts

## 8.2 Barangay Staff / Tanod

Community responder.

Capabilities:

- Authenticate
- View incidents
- Receive emergency alerts
- Acknowledge incidents
- Assign responders
- Change incident status
- Add notes
- View location
- View incident history
- Communicate status back to residents

## 8.3 Administrator

System/community administrator.

Capabilities:

- Manage users
- Manage responders
- Manage communities
- Manage emergency categories
- Configure system
- Revoke devices
- View system health
- View audit logs
- Manage community alerts

---

# 9. Community Model

The system must support multiple communities.

Each user should belong to a community.

Example:

```text
Community
    |
    +-- Users
    |
    +-- Responders
    |
    +-- Devices
    |
    +-- Incidents
    |
    +-- Alerts
```

The Napo community should be treated as the initial deployment.

Do not hard-code Napo into the system.

---

# 10. Registration

Registration uses mobile phone number + OTP.

Flow:

```text
Enter mobile number
       |
       v
Request OTP
       |
       v
Verify OTP
       |
       v
Create user
       |
       v
Register device
```

The phone number is the primary identity.

The architecture must allow an OTP provider to be changed later.

For development, implement an OTP abstraction/mock provider.

Do not hard-code a production SMS provider into the core authentication logic.

---

# 11. Device Identity

Each installation/device requires a unique device identifier.

Conceptually:

```text
User
  |
  +-- Device A
```

A user may eventually have multiple devices.

Device records should support:

- device ID
- user ID
- community ID
- protocol version
- registration timestamp
- last seen timestamp
- revoked status

Do not broadcast personally identifiable information over BLE.

---

# 12. Emergency Categories

Initial categories:

- Medical Emergency
- Fire
- Crime / Security
- Accident
- Missing Person
- Natural Disaster
- Flood
- Landslide
- Earthquake
- Rescue Required
- Other

Categories must be configurable.

---

# 13. Emergency Priority

Support:

```text
CRITICAL
HIGH
NORMAL
```

Critical emergencies receive higher relay priority.

The relay system must prioritize emergency traffic over ordinary synchronization traffic.

---

# 14. Emergency Creation

A resident must be able to create an emergency with no Internet.

Minimum fields:

```text
incidentId
originDeviceId
reporterId
communityId
category
description
priority
createdAt
originTimestamp
latitude
longitude
locationAccuracy
manualLocation
messageVersion
expiresAt
status
```

GPS is optional.

If GPS is unavailable:

- allow manual location
- do not prevent emergency submission

---

# 15. Emergency UI

The primary screen should be extremely simple.

Concept:

```text
--------------------------------
          TULONG LINK

        SEND HELP

     [ MEDICAL ]

     [ FIRE ]

     [ ACCIDENT ]

     [ SECURITY ]

     [ RESCUE ]

     [ OTHER ]
--------------------------------
```

SEND HELP is the Tulong/SOS trigger defined in §57: pressing it fires
the broadcast alert beacon immediately, in parallel with — not blocking
on — the category selection below.

After category selection:

```text
Emergency Type
Description
Location
Priority

[ SEND EMERGENCY ]
```

Emergency reporting should require as few interactions as reasonably possible.

---

# 16. Emergency Delivery States

Never display simply:

> "Emergency sent."

The application must distinguish between different delivery states.

Recommended states:

```text
LOCAL_ONLY
RELAYED
GATEWAY_RECEIVED
SERVER_RECEIVED
RESPONDER_ACKNOWLEDGED
ASSIGNED
IN_PROGRESS
RESOLVED
CANCELLED
EXPIRED
```

Example:

```text
EMERGENCY STATUS

✓ Saved on this phone
✓ Relayed to 2 nearby devices
✓ Received by TulongLink server
○ Waiting for responder acknowledgment
```

If only locally stored:

```text
Your emergency is saved on this phone.

TulongLink will attempt to relay it through
nearby devices or send it when Internet
connectivity becomes available.
```

The application must never falsely imply successful server delivery.

---

# 17. Emergency Lifecycle

Conceptually:

```text
CREATED
   |
   v
STORED_LOCALLY
   |
   v
RELAYING
   |
   v
GATEWAY_RECEIVED
   |
   v
SERVER_RECEIVED
   |
   v
ACKNOWLEDGED
   |
   v
ASSIGNED
   |
   v
IN_PROGRESS
   |
   v
RESOLVED
```

Not every incident must follow every state.

---

# 18. Offline Storage

Use IndexedDB or another suitable local database for the PWA.

Local data must survive:

- application restart
- device restart
- temporary network loss
- temporary Bluetooth loss

At minimum, local storage should contain:

```text
User
Device
Emergency
EmergencyEvent
RelayMessage
Peer
SyncQueue
DeliveryReceipt
Community
Responder
Configuration
```

---

# 19. Bluetooth Relay Network

This is the core innovation.

Every participating device can potentially act as:

1. Originator
2. Relay
3. Internet Gateway

Example:

```text
A -> B -> C -> D -> Server
```

Where:

```text
A = emergency originator
B = relay
C = relay
D = Internet gateway
```

---

# 20. BLE Discovery

TulongLink devices should periodically advertise their presence and scan for other participating devices.

Initial development target:

```text
approximately 3-second discovery/advertisement interval
```

This MUST be configurable.

Do not permanently hard-code the 3-second interval.

Battery optimization must be considered.

BLE advertisements must contain only minimal discovery metadata.

Do not advertise:

- name
- phone number
- emergency description
- exact GPS
- personal information

This applies without exception to ordinary discovery advertisements —
their only job is signaling that a TulongLink device is nearby, so they
have no reason to carry anything sensitive. §57 defines the one
deliberate exception: a separate, purpose-built alert-beacon
advertisement, and only because its sensitive fields are encrypted.

---

# 21. Peer Handshake

When two devices discover each other:

```text
Device A discovers Device B
          |
          v
Exchange protocol version
          |
          v
Exchange node/device identifiers
          |
          v
Exchange capabilities
          |
          v
Exchange message summaries
          |
          v
Determine missing messages
          |
          v
Transfer messages
          |
          v
Verify integrity
          |
          v
Store
```

Do not transfer the entire local database.

Use a compact synchronization protocol.

---

# 22. Message Synchronization

Example:

```text
Device A:
I have:
A123
A124
A125

Device B:
I have:
A123
A125

Device A:
Send A124

Device B:
Received A124
```

Use efficient message summaries.

The implementation may use:

- message IDs
- hashes
- version numbers
- sequence numbers
- timestamps

Choose an appropriate approach.

---

# 23. Message IDs

Every message requires a globally unique identifier.

Possible structure:

```text
<origin-device-id>:<sequence>
```

or UUID/ULID.

The exact format can be selected by the implementation.

IDs must survive relay across multiple devices.

---

# 24. Deduplication

Messages may travel through many paths.

Example:

```text
A -> B -> C
A -> D -> C
```

C may receive the same emergency twice.

The system must detect duplicates.

If a message ID is already known:

```text
DO NOT DUPLICATE
DO NOT PROCESS AGAIN
```

unless a newer version or required acknowledgment is being transmitted.

---

# 25. Message TTL

Messages must expire.

Store:

```text
createdAt
expiresAt
```

Critical messages may have longer TTL.

TTL must be configurable.

Expired messages must not continue propagating indefinitely.

---

# 26. Message Integrity

Every message must be validated.

At minimum:

```text
messageId
originDeviceId
timestamp
payload
payloadHash
protocolVersion
```

The system must detect:

- malformed messages
- corrupted messages
- replayed messages
- unsupported protocol versions

Cryptographic signatures should be used where appropriate.

---

# 27. Security

Implement:

- secure authentication
- device registration
- device revocation
- HTTPS
- secure local storage
- token expiration
- token refresh
- rate limiting
- replay protection
- message deduplication
- message validation

Sensitive emergency information should not be exposed through BLE advertisements — the one narrow, encrypted exception is the alert beacon defined in §57, which exists precisely because it is encrypted; an unencrypted alert beacon would violate this rule, not satisfy it.

Where practical, design the protocol so that relay devices can transport encrypted payloads without requiring access to sensitive contents.

---

# 28. Privacy

Minimize personal information exchanged between nearby devices.

BLE discovery should use only minimal metadata.

Do not broadcast:

- phone number
- user name
- description
- exact coordinates
- medical information

The one exception is the encrypted alert beacon in §57 — sensitive
fields only ever leave a device in cleartext form via a BLE
advertisement if this rule is being violated.

The relay network should transport emergency payloads securely.

---

# 29. GPS

When creating an emergency:

1. Attempt GPS acquisition.
2. Save coordinates if available.
3. Save accuracy.
4. Save location timestamp.
5. Allow manual location.
6. Do not block emergency submission because GPS is unavailable.

Fields:

```text
latitude
longitude
accuracy
altitude
locationTimestamp
manualLocation
```

---

# 30. Gateway Behavior

Any TulongLink device with Internet access may act as a gateway.

Example:

```text
A OFFLINE
 |
B OFFLINE
 |
C INTERNET
 |
SERVER
```

C should discover unsynchronized emergency messages and upload them.

After successful upload:

```text
SERVER_RECEIVED
```

should be recorded.

Acknowledgment should propagate back through the relay network where possible.

---

# 31. Acknowledgment Model

Distinguish:

```text
Local receipt
Relay receipt
Gateway receipt
Server receipt
Responder acknowledgment
```

Example:

```text
CREATED
   ↓
RELAYED
   ↓
SERVER_RECEIVED
   ↓
RESPONDER_ACKNOWLEDGED
```

These are separate events.

---

# 32. Sync Direction

The synchronization architecture must support:

```text
Device -> Device
Device -> Server
Server -> Device
```

Device-to-device sync is primarily for relay.

Device-to-server sync is for gateway delivery.

Server-to-device sync is for:

- status updates
- acknowledgments
- community alerts
- responder updates

---

# 33. Offline Authentication

Previously authenticated users should be able to use the application while offline.

Do not require an Internet connection merely to open the application after successful registration.

The security model must define:

- token expiration
- refresh behavior
- local authentication state
- device revocation behavior

---

# 34. Network State

Show clear network state:

```text
Internet Connected
Internet Unavailable
Nearby Relay Available
Offline / No Relay
Synchronizing
Synchronized
```

The UI must accurately represent whether an emergency has:

- merely been stored
- been relayed
- reached the server
- been acknowledged by a responder

---

# 35. Responder Dashboard

Create a responsive PWA dashboard for barangay staff.

Dashboard features:

- New incidents
- Critical incidents
- Active incidents
- Resolved incidents
- Map
- Incident details
- Reporter
- Location
- Timestamp
- Priority
- Status
- Assigned responder
- Incident history
- Audit trail

---

# 36. Incident Management

Support:

```text
NEW
ACKNOWLEDGED
ASSIGNED
IN_PROGRESS
RESOLVED
CANCELLED
EXPIRED
```

Every status change should generate an event.

---

# 37. Responder Assignment

A staff member can assign an incident to:

- Tanod
- Medical responder
- Fire responder
- Rescue responder
- Other configured responder

Record:

```text
incidentId
responderId
assignedBy
assignedAt
```

---

# 38. Notifications

Resident notifications:

- Server received emergency
- Responder acknowledged
- Responder assigned
- Incident resolved

Responder notifications:

- New critical emergency
- New incident
- Assignment
- Incident update

Do not assume push notifications work without Internet.

Offline notification behavior must respect Android/PWA limitations.

---

# 39. Community Alerts

Administrators should eventually be able to send official community alerts.

Examples:

```text
EARTHQUAKE WARNING

Please evacuate to the designated
evacuation area.
```

Alerts should be capable of being distributed through:

- Internet
- local relay network where technically feasible

This feature may initially be behind a feature flag.

---

# 40. Backend MongoDB Collections

Initial collections:

```text
users
devices
communities
incidents
incident_events
responders
delivery_receipts
community_alerts
audit_logs
configurations
```

Use appropriate indexes.

At minimum:

```text
incidentId
communityId
status
priority
createdAt
reporterId
deviceId
```

Use geospatial indexes if appropriate for incident mapping.

`configurations` additionally needs the per-community fields defined in
§58.5 (SMS responder numbers, SMS feature flag) to support the SMS
transport.

---

# 41. API

Authentication:

```text
POST /api/auth/request-otp
POST /api/auth/verify-otp
POST /api/auth/refresh
POST /api/auth/logout
```

User:

```text
GET /api/users/me
PATCH /api/users/me
```

Incidents:

```text
POST /api/incidents
GET /api/incidents
GET /api/incidents/:id
PATCH /api/incidents/:id
POST /api/incidents/:id/acknowledge
POST /api/incidents/:id/assign
POST /api/incidents/:id/resolve
```

Synchronization:

```text
POST /api/sync
POST /api/delivery-receipts
```

Community alerts:

```text
POST /api/community-alerts
GET /api/community-alerts
GET /api/community-alerts/:id
```

The API may be refined during implementation.

---

# 42. Failure Handling

The application must tolerate:

- Internet unavailable
- server unavailable
- Bluetooth disabled
- Bluetooth temporarily unavailable
- GPS unavailable
- application restart
- device restart
- relay device disappearing
- battery loss
- duplicate messages
- corrupted messages
- expired messages
- partial synchronization

Emergency data must survive restarts.

---

# 43. Battery Requirements

Relay networking must be battery-conscious.

Requirements:

- configurable scanning interval
- configurable advertising interval
- prioritize emergency traffic
- avoid unnecessary transfers
- avoid duplicate transfers
- use compact packets
- use opportunistic synchronization
- avoid continuously transmitting large data

Create configuration constants rather than hard-coding behavior.

---

# 44. Multi-Hop Requirement

The system must support multiple relay hops.

Minimum target:

```text
A -> B -> C -> D -> Server
```

The system must not assume that the gateway is directly adjacent to the originator.

---

# 45. Routing Philosophy

Do not initially implement a complicated routing algorithm.

Use opportunistic store-and-forward.

A device should:

1. Discover peers.
2. Exchange message summaries.
3. Transfer missing messages.
4. Store them.
5. Continue advertising/scanning.
6. Forward messages to future peers.

Future versions may introduce more sophisticated routing.

---

# 46. Security Against Relay Abuse

The system must eventually defend against:

- message flooding
- replay attacks
- fake emergency generation
- unauthorized devices
- malformed packets
- excessive relay traffic

Implement reasonable MVP safeguards.

Do not attempt to solve every theoretical security problem before producing a working prototype.

---

# 47. Initial MVP

The first MVP must prove the fundamental technology.

Use four Android devices:

```text
A = Resident
B = Relay
C = Relay
D = Internet Gateway
```

Conditions:

```text
A = No Internet
B = No Internet
C = No Internet
D = Internet
```

A creates:

```text
MEDICAL EMERGENCY
```

Expected:

```text
A
 |
Bluetooth
 v
B
 |
Bluetooth
 v
C
 |
Bluetooth
 v
D
 |
Internet
 v
TulongLink Server
```

The server must receive and store the emergency.

The responder dashboard must display it.

This is the primary proof-of-concept.

---

# 48. MVP Development Phases

## Phase 1 — Foundation

Implement:

- monorepo
- React PWA
- Android wrapper
- Node API
- TypeScript
- MongoDB
- Docker Compose
- local persistence
- authentication abstraction

## Phase 2 — Emergency Reporting

Implement:

- user
- device
- community
- emergency creation
- GPS
- local storage
- online synchronization
- delivery state

## Phase 3 — BLE Protocol

Implement:

- BLE discovery
- device handshake
- protocol version
- peer identification
- message summaries
- message transfer
- validation
- deduplication

## Phase 4 — Multi-Hop Relay

Implement:

- store-and-forward
- TTL
- relay queue
- retry
- gateway detection
- server synchronization

## Phase 5 — Responder Dashboard

Implement:

- incident list
- critical incident view
- incident details
- map
- status
- responder assignment
- audit trail

## Phase 6 — Security

Implement:

- authentication hardening
- secure device registration
- message integrity
- encryption where appropriate
- replay protection
- rate limiting
- device revocation

## Phase 7 — Field Testing

Test physically using multiple Android devices.

Primary test:

```text
A -> B -> C -> D -> Server
```

---

# 49. Automated Testing

Unit tests must cover:

- message creation
- message IDs
- serialization
- deserialization
- validation
- deduplication
- TTL
- synchronization
- retry
- acknowledgments
- malformed messages
- replay detection

Integration tests must simulate:

```text
A -> B
A -> B -> C
A -> B -> C -> D -> Server
```

Build a simulated relay environment where practical.

---

# 50. Documentation

Maintain:

```text
README.md
ARCHITECTURE.md
PROTOCOL.md
SECURITY.md
DATABASE.md
API.md
DEVELOPMENT.md
TESTING.md
ROADMAP.md
```

Every major architectural decision should document:

1. Decision
2. Reason
3. Alternatives
4. Advantages
5. Limitations
6. Future migration path

---

# 51. Development Rules

Claude Code must:

1. Inspect the repository before changing anything.
2. Avoid unnecessary dependencies.
3. Avoid unnecessary infrastructure.
4. Keep the project lightweight.
5. Use TypeScript.
6. Keep PWA and native layers modular.
7. Write tests for critical logic.
8. Run linting.
9. Run type checking.
10. Run tests after significant changes.
11. Keep documentation updated.
12. Never claim a feature works without testing it.
13. Clearly identify Android limitations.
14. Prefer incremental implementation.
15. Avoid building unused features before the MVP works.

---

# 52. Important Android Constraint

Do NOT assume that a PWA running inside a browser can reliably perform continuous background BLE mesh networking.

The Android native layer is required for reliable:

- BLE scanning
- BLE advertising
- BLE communication
- background relay
- Android lifecycle handling

The PWA remains responsible for:

- user interface
- application workflows
- emergency creation
- responder dashboard
- business logic where practical

The native layer should expose a clean interface to the PWA.

---

# 53. Protocol Abstraction

Define transport-independent messages such as:

```text
DeviceHello
SyncRequest
SyncResponse
EmergencyMessage
MessageReceipt
Acknowledgement
CommunityAlert
```

The same protocol should eventually work over different transports.

---

# 54. Data Flow

## Online Emergency

```text
Resident
   |
PWA
   |
Local DB
   |
API
   |
MongoDB
   |
Responder Dashboard
```

## Offline Emergency

```text
Resident
   |
PWA
   |
Local DB
   |
Native Relay Layer
   |
BLE
   |
Peer Device
   |
Local DB
```

## Gateway

```text
Relay Device
   |
Internet Available
   |
API
   |
MongoDB
   |
Responder Dashboard
```

---

# 55. Example Emergency

```json
{
  "incidentId": "INC-DEVICE123-000001",
  "communityId": "napo",
  "category": "MEDICAL",
  "priority": "CRITICAL",
  "description": "Person collapsed and needs assistance",
  "latitude": 10.123456,
  "longitude": 123.123456,
  "locationAccuracy": 12,
  "createdAt": "2026-08-16T08:00:00Z",
  "expiresAt": "2026-08-17T08:00:00Z"
}
```

This is an illustrative example only.

Do not hard-code Napo or these coordinates.

---

# 56. Product Naming

Official application name:

**TulongLink**

Meaning:

- Tulong = help
- Link = connection

Suggested tagline:

**The community becomes the network.**

Alternative tagline:

**When the Internet is down, help stays connected.**

---

# 57. Encrypted Broadcast Alert Layer

## 57.1 Purpose

A second delivery tier alongside the connection-based relay in §19–22.
Its only job is speed: get an alarm to every nearby TulongLink device —
including one that never opens a connection, never becomes a relay hop,
and is just passing by — as fast as physically possible.

This does not replace the connection-based relay. It runs alongside it.
The broadcast alert carries a compact "something is wrong nearby"
signal; the full incident record still propagates through the existing
multi-hop store-and-forward mechanism.

## 57.2 Trigger

SEND HELP (§15) is a single Tulong/SOS action. Pressing it:

1. Immediately begins transmitting the alert beacon (57.3).
2. Opens the category/description flow (§14–15) in parallel, not as a
   blocking prerequisite.
3. Once category/description are provided, or a short timeout elapses
   with a default category, the full EmergencyMessage (§53) is created
   locally and enters the normal relay pipeline (§19–22).

The alert beacon must never wait on category selection. A resident who
presses Tulong and immediately loses the ability to interact with the
phone has still triggered an alert.

## 57.3 Alert beacon mechanism

Distinct from the standard peer-discovery advertisement in §20. A
dedicated advertisement type, identified by its own service UUID,
broadcasting an encrypted payload — received by passive BLE scanning
alone, no GATT connection required.

Advertisement contents (BLE 5 extended advertising target; see 57.6 for
devices without it):

```text
alertServiceUuid   (fixed, identifies this as a TulongLink alert)
protocolVersion
shortMessageId     (truncated form of the full message ID)
priority           (CRITICAL / HIGH / NORMAL — unencrypted, so a
                    receiving device can prioritize without decrypting
                    first)
encryptedPayload:
    latitude
    longitude
    locationAccuracy
    category
    originTimestamp
authTag            (integrity check over the encrypted payload)
```

Everything else follows the rules already established for discovery
advertisements: no device name, no phone number, no description text.

## 57.4 Encryption

Payload encryption uses a symmetric key issued per community at device
registration (§10), while the device still has Internet access, and
stored in Android Keystore rather than application storage.

Only devices enrolled in that community can decrypt an alert broadcast
from it. A device outside the community, or any non-TulongLink BLE
scanner, receives ciphertext.

This does not replace per-device message signing (§26); it solves a
different problem. Signing proves who sent a message. This encryption
hides the sensitive fields from anyone who isn't a legitimate recipient
in the first place — necessary here specifically because, unlike a GATT
connection, a BLE advertisement has no access control: anyone with any
BLE receiver in range can capture it.

## 57.5 Amendment to §20 / §27 / §28

The existing rule — BLE advertisements must never carry exact GPS or
other sensitive fields — continues to apply without exception to
ordinary peer-discovery advertisements. Their only job is signaling
that a TulongLink device is nearby; they have no reason to carry
anything sensitive, ever.

The alert beacon defined here is the one deliberate, narrow exception,
and only because the sensitive fields inside it are encrypted per 57.4.
An unencrypted alert beacon is not a smaller violation of §20/§27/§28 —
it is exactly the violation those sections exist to prevent, and must
never ship.

## 57.6 Propagation and degradation

Receiving devices SHOULD re-broadcast a received alert beacon for a
bounded number of hops / bounded TTL, reusing the TTL and
deduplication mechanics already defined in §23–25 — a beacon is a very
small, broadcast-only message, and needs the same duplicate suppression
any other relayed message needs, or a busy area produces an advertising
storm.

Devices without BLE 5 extended advertising support can still receive
and act on the alert layer at reduced fidelity: legacy 31-byte
advertisements are tight but workable for a truncated ID, priority, and
a smaller encrypted payload using fixed-point rather than
floating-point coordinates. Devices that cannot advertise at all in
this mode simply rely on the connection-based relay for the full
message, as already designed. No device is excluded from TulongLink by
lacking this capability — it degrades, it doesn't gate.

## 57.7 Decision record

- **Decision:** add a connectionless, encrypted BLE advertisement tier
  for the initial alert, separate from the connection-based relay.
- **Reason:** a GATT peripheral link generally serves one central
  connection at a time; broadcast reception has no such limit, and gets
  the alarm to a crowd — the highest-value scenario — without a
  connection queue.
- **Alternatives considered:** GATT-only delivery (already designed,
  §19–22) — kept as the transport for the full record; unencrypted
  broadcast (rejected, see 57.5).
- **Advantages:** faster alert delivery than any connection-based
  approach can offer; works for a device that never connects to
  anything; lower implementation risk than the multi-hop GATT relay,
  since it needs only advertise + scan, not the peripheral+central dual
  role under validation in the Milestone 0 spike.
- **Limitations:** legacy-advertising devices get a smaller payload;
  community-key compromise would expose that community's alert
  payloads, mitigated by Keystore-backed storage and, longer-term, key
  rotation at next sync — full instant revocation across an offline
  mesh remains an open limitation, as already noted in §46.
- **Future migration path:** if extended advertising proves unreliable
  on target hardware during field testing, fall back to a shorter
  fixed-point-encoded payload within the legacy 31-byte budget rather
  than abandoning the broadcast tier.

---

# 58. SMS Transport

## 58.1 Purpose

A fourth transport, alongside BLE, Nearby Connections (§59), and
Internet (§6/§41).

Reaches a responder's ordinary phone with no TulongLink installation
required on their end. Works at signal levels too weak for data. A
gateway-delivery fallback, not a replacement for the API upload defined
in §30/§41.

## 58.2 When it fires

Any device acting as a gateway (§30) that detects SMS-capable signal
attempts SMS delivery to the community's configured responder number,
in parallel with the normal HTTPS upload attempt — whichever succeeds
first still results in a delivery receipt (§16, §31).

Do not treat SMS as inferior evidence of delivery. Record which
transport actually succeeded — §16's delivery states gain an
`SMS_SENT` state, distinct from `SERVER_RECEIVED` — a resident should
know their SMS-only community responder was reached even before the
server confirms receipt through the normal path.

## 58.3 Payload

SMS has no room for the full JSON incident record. Compact, fixed-order
text format:

```text
TULONGLINK|<shortMessageId>|<category>|<priority>|<lat>,<lon>|<timestamp>
```

Kept inside a single GSM-7 segment (160 characters) wherever possible.
Concatenated multi-segment SMS is allowed as a fallback, not the
default — it costs more and is less reliable on constrained networks.

## 58.4 Permission model

Sending SMS programmatically on Android requires either the app be the
user's default SMS handler, or a Google Play exception granted for
exactly this use case — neither guaranteed, and Play's review of the
exception is case-by-case, not automatic.

Two build-time delivery modes, chosen by distribution channel:

- **Direct build** (sideloaded / pilot deployment, e.g. Napo): request
  `SEND_SMS`, send automatically and silently. No Play Store
  distribution involved, so the restriction above does not apply.
- **Play Store build** (future commercial distribution): default to an
  SMS intent that pre-fills the message in the resident's own SMS app
  for a one-tap manual send. Requires no special permission. If the
  Play exception is later granted for this build, upgrade to automatic
  send.

The active mode is a compile-time configuration flag, not a runtime
toggle — an automatic-send path must never be reachable in a build that
hasn't actually been granted the exception.

## 58.5 Configuration

Each community's `configurations` record (§40) needs:

```text
smsResponderNumbers   (one or more numbers, community-configured)
smsEnabled            (feature flag; some communities may not want this)
```

## 58.6 Decision record

- **Decision:** add SMS as a formal transport for gateway delivery.
- **Reason:** reaches a responder even if they run no software at all,
  and works below the signal threshold data requires — genuinely new
  resilience, not a convenience feature.
- **Alternatives considered:** data-only gateway delivery (already
  designed; kept as the primary path) — SMS is additive, not a
  replacement.
- **Advantages:** no dependency on the responder having a smartphone or
  app; works on weaker signal than data.
- **Limitations:** Play Store distribution constrains automatic
  sending (58.4); SMS payload size forces a lossy summary, not the full
  record — the full record still needs the data/API path eventually.
- **Future migration path:** the server could additionally expose an
  inbound SMS number/shortcode as a second ingest path, independent of
  any device — not required for MVP, worth revisiting once the primary
  device-to-responder-phone path is proven.

---

# 59. Nearby Connections Escalation Transport

## 59.1 Purpose

A higher-throughput, longer-range transport for scenarios BLE alone
cannot carry well — a crowded evacuation center, a deliberate community
response event. Built on Android's Nearby Connections API, not a
hand-rolled Wi-Fi hotspot bridge.

## 59.2 Why Nearby Connections instead of raw Wi-Fi hotspot toggling

Simultaneous Wi-Fi client + hotspot mode ("STA+AP concurrency") exists
in Android but is chipset/OEM-dependent, not universal — some devices
get true simultaneous operation, some share one radio with degraded
throughput, some don't support it at all. On the mixed, largely
budget-tier Android hardware this project targets, "everyone turn on
both" will work unpredictably device to device, with no clear way for a
non-technical resident to know which case their phone falls into.

Nearby Connections solves the same underlying problem — proximity data
exchange beyond BLE's range/throughput — by negotiating the best
transport combination (BLE, Wi-Fi Direct, local hotspot) per device
pair at runtime, and degrading gracefully to whatever is actually
available instead of failing outright.

## 59.3 Activation model

Not always-on. A resident or barangay staff member explicitly enables
"Community Wi-Fi Hub" mode — a deliberate, visible toggle, not a
background default — given its materially higher battery cost than the
base BLE relay (§43).

Typical activation: barangay staff at an evacuation center, or a
resident during a known, ongoing community response event.

## 59.4 Relationship to the base relay

Additive. When active, it runs alongside — not instead of — the BLE
relay (§19–22) and the alert beacon (§57). The same EmergencyMessage /
protocol types (§53) travel over whichever transport is available;
Nearby Connections is a `Transport` implementation like `BLETransport`,
selected by the same transport abstraction (§5).

## 59.5 Decision record

- **Decision:** use Nearby Connections API for the higher-throughput
  transport tier; do not hand-roll Wi-Fi hotspot bridging.
- **Reason:** avoids taking on inconsistent, hard-to-diagnose behavior
  across the exact device mix this project targets (59.2).
- **Alternatives considered:** manual Wi-Fi hotspot + client toggling
  as originally proposed — rejected for the reasons in 59.2; Wi-Fi
  Direct used directly, without Nearby Connections' negotiation layer —
  rejected as reinventing what Nearby Connections already provides.
- **Advantages:** graceful degradation instead of hard failure on
  unsupported hardware; one API surface instead of hand-rolled
  transport-selection logic.
- **Limitations:** still meaningfully more battery cost than BLE, hence
  the opt-in model (59.3); adds a dependency on Google Play services,
  which needs confirming against this project's minimum supported
  Android/Play-services baseline before Phase 4 implementation.
- **Future migration path:** none anticipated; revisit only if Nearby
  Connections itself is deprecated.

---

# 60. Ultimate Vision

TulongLink should eventually become a resilient communication platform where:

```text
                 INTERNET
                    |
          +---------+---------+
          |                   |
       Gateway              Gateway
          |                   |
      +---+---+           +---+---+
      |       |           |       |
    Phone   Phone       Phone   Phone
      |       |
    Phone   Phone
      |
   OFFLINE
   RESIDENT
```

The fundamental promise:

> **When conventional communications fail, nearby devices can help keep the community connected.**

Build the MVP around this principle.

Do not allow feature expansion to compromise the core emergency-relay capability.