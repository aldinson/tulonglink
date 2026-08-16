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
