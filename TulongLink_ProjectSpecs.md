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
   +-- WiFiTransport
   |
   +-- InternetTransport
```

Only BLE needs to be implemented initially.

Future transports should be possible without redesigning the emergency message protocol.

Potential future transports include:

- Wi-Fi Direct
- Nearby Connections
- local Wi-Fi
- Internet
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

Sensitive emergency information should not be exposed through BLE advertisements.

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

# 57. Ultimate Vision

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