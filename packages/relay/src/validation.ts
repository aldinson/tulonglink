import { isProtocolVersionSupported, type EmergencyMessage } from "@tulonglink/protocol";
import { createEmergencySchema } from "@tulonglink/shared";
import { computePayloadHash } from "./message.js";
import { isExpired } from "./ttl.js";

/**
 * Spec §26: detect malformed, corrupted, replayed, and version-
 * incompatible messages. Replay detection itself is dedup's job
 * (handshake.ts checks `store.hasMessage` before saving) — this
 * function validates a single message on its own merits.
 *
 * Cryptographic signatures (§26 "should be used where appropriate")
 * are deliberately not checked here — that's a key-management concern
 * the spec puts in Phase 6 (Security), not Phase 3. Hash + schema +
 * version + TTL checks are the correct Phase-3-sized slice.
 */
export type ValidationFailureReason =
  | "UNSUPPORTED_PROTOCOL_VERSION"
  | "MALFORMED_PAYLOAD"
  | "HASH_MISMATCH"
  | "EXPIRED";

export type ValidationResult = { valid: true } | { valid: false; reason: ValidationFailureReason };

export async function validateEmergencyMessage(
  message: EmergencyMessage,
  now: Date = new Date()
): Promise<ValidationResult> {
  if (!isProtocolVersionSupported(message.protocolVersion)) {
    return { valid: false, reason: "UNSUPPORTED_PROTOCOL_VERSION" };
  }

  const parsed = createEmergencySchema.safeParse(message.payload);
  if (!parsed.success) {
    return { valid: false, reason: "MALFORMED_PAYLOAD" };
  }

  const expectedHash = await computePayloadHash(parsed.data);
  if (expectedHash !== message.payloadHash) {
    return { valid: false, reason: "HASH_MISMATCH" };
  }

  if (isExpired(message, now)) {
    return { valid: false, reason: "EXPIRED" };
  }

  return { valid: true };
}
