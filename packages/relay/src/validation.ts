import { isProtocolVersionSupported, type EmergencyMessage } from "@tulonglink/protocol";
import { createEmergencySchema } from "@tulonglink/shared";
import { verifyBytes } from "@tulonglink/crypto";
import { computePayloadHash, signaturePayload } from "./message.js";
import { isExpired } from "./ttl.js";

/**
 * Spec §26: detect malformed, corrupted, replayed, and version-
 * incompatible messages. Replay detection itself is dedup's job
 * (handshake.ts checks `store.hasMessage` before saving) — this
 * function validates a single message on its own merits.
 *
 * The signature check (Phase 6) proves the message hasn't been altered
 * since the origin device signed it, using the public key embedded in
 * the message itself. It does not prove that key really belongs to
 * `originDeviceId` — only the server, which has the registered key on
 * file, can check that, and nothing wires a signed envelope to the
 * server yet (see the Phase 6 decision record in README.md).
 */
export type ValidationFailureReason =
  | "UNSUPPORTED_PROTOCOL_VERSION"
  | "MALFORMED_PAYLOAD"
  | "HASH_MISMATCH"
  | "INVALID_SIGNATURE"
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

  const signedBytes = signaturePayload(message.messageId, message.payloadHash, message.expiresAt);
  const signatureValid = await verifyBytes(message.originPublicKey, message.signature, signedBytes);
  if (!signatureValid) {
    return { valid: false, reason: "INVALID_SIGNATURE" };
  }

  if (isExpired(message, now)) {
    return { valid: false, reason: "EXPIRED" };
  }

  return { valid: true };
}
