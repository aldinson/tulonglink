import type { CreateEmergencyInput } from "@tulonglink/shared";

/**
 * Transport-independent envelope (spec §53). Whether this travels over
 * HTTPS (now) or a BLE characteristic (Phase 3), the shape is the same —
 * only the transport that carries it differs.
 *
 * Still not constructed anywhere outside packages/relay: Milestone 1's
 * client->server path sends CreateEmergencyInput directly over HTTPS,
 * which already gets transport integrity from TLS and payload
 * validation from packages/shared's zod schema — this envelope, and the
 * signature below, matter once messages cross untrusted relay hops that
 * TLS doesn't cover (spec §26), which is what packages/relay's
 * tests exercise even though no real transport hands it one yet.
 */
export interface EmergencyMessage {
  messageId: string;
  originDeviceId: string;
  protocolVersion: number;
  timestamp: string;
  payload: CreateEmergencyInput;
  payloadHash: string;
  /**
   * Message-level TTL (spec §25), separate from `Emergency.expiresAt`
   * which is the same value at rest in the record store — duplicated
   * here so a relay hop can decide whether to keep propagating a
   * message without deserializing/looking up the full record.
   */
  expiresAt: string;
  /**
   * Ed25519 signature (base64url, `@tulonglink/crypto`) over
   * `(messageId, payloadHash, expiresAt)`, by the origin device's
   * private key — proves the message hasn't been altered since the
   * origin device signed it, closing the "malicious relay hop tampers
   * with a message" gap the Phase 3 decision record named as its one
   * open limitation (spec §26, §46).
   */
  signature: string;
  /**
   * The origin device's raw Ed25519 public key (base64url), travelling
   * with the message itself because, in a multi-hop relay, the verifier
   * is usually not the peer directly connected to the origin device —
   * there's no separate channel to fetch it from. This proves internal
   * self-consistency (signature matches this embedded key) but not, on
   * its own, that the key really belongs to `originDeviceId`; only the
   * server can cross-check that against its registration record, and
   * nothing wires a signed envelope to the server yet (see Phase 6's
   * decision record for why that's deliberately deferred).
   */
  originPublicKey: string;
}

/**
 * One acknowledgment event in the chain (spec §31). Each hop that
 * actually touches the message records its own receipt — a relay never
 * fabricates a server receipt on the server's behalf.
 */
export type ReceiptKind = "LOCAL" | "RELAY" | "GATEWAY" | "SERVER" | "RESPONDER";

export interface MessageReceipt {
  incidentId: string;
  kind: ReceiptKind;
  recordedByDeviceId: string;
  occurredAt: string;
}

/**
 * Phase 3 peer-handshake vocabulary (spec §21, §53). Kept in this
 * package (not packages/relay) because these are wire shapes, not
 * orchestration logic — packages/relay imports them the same way it
 * imports EmergencyMessage.
 *
 * CommunityAlert and Acknowledgement are deliberately not defined yet:
 * CommunityAlert has no producer/consumer until the Phase 5 responder
 * dashboard exists (spec §39), and Acknowledgement is the Phase 4
 * ack-propagation-through-the-mesh concept (spec §30-31), not part of
 * the two-peer sync sequence Phase 3 implements — that sequence (§21)
 * ends at "Store", with no wire-level ack step. Adding either now would
 * be a type with nothing to exercise it.
 */
export interface DeviceHello {
  deviceId: string;
  protocolVersion: number;
  /** Reserved for future transport/feature negotiation (§58 SMS, §59 Nearby Connections, §57 alert beacon) — empty until one of those lands. */
  capabilities: string[];
}

export interface SyncRequest {
  knownIds: string[];
}

export interface SyncResponse {
  knownIds: string[];
}

/** The envelope actually sent over a `PeerConnection` (packages/relay). */
export type RelayFrame =
  | { type: "DEVICE_HELLO"; hello: DeviceHello }
  | { type: "SYNC_REQUEST"; request: SyncRequest }
  | { type: "SYNC_RESPONSE"; response: SyncResponse }
  | { type: "EMERGENCY_MESSAGE"; message: EmergencyMessage };
