import type { CreateEmergencyInput } from "@tulonglink/shared";

/**
 * Transport-independent envelope (spec §53). Whether this travels over
 * HTTPS (now) or a BLE characteristic (Phase 3), the shape is the same —
 * only the transport that carries it differs.
 *
 * Not yet constructed or verified anywhere: Milestone 1's client->server
 * path sends CreateEmergencyInput directly over HTTPS, which already
 * gets transport integrity from TLS and payload validation from
 * packages/shared's zod schema. This type exists now because spec §53
 * asks for the message vocabulary to be defined early, but the
 * build/verify/hash logic around it (payloadHash, signatures) is real
 * work that belongs with Phase 3, when messages start crossing
 * untrusted relay hops that TLS doesn't cover (spec §26).
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
