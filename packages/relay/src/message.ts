import { PROTOCOL_VERSION, type EmergencyMessage } from "@tulonglink/protocol";
import type { CreateEmergencyInput } from "@tulonglink/shared";
import { exportPublicKeyRaw, signBytes, type DeviceKeyPair } from "@tulonglink/crypto";

/**
 * Key order shouldn't change what a payload hashes to — two devices
 * that independently reconstruct the same logical payload (e.g. after
 * JSON round-tripping over BLE) must get the same hash. `payload` is
 * always a flat object of primitives/null (see createEmergencySchema),
 * so a shallow key sort is sufficient; this intentionally isn't a
 * general canonical-JSON implementation.
 */
function stableStringify(value: Record<string, unknown>): string {
  const sortedEntries = Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${JSON.stringify(value[key])}`);
  return `{${sortedEntries.join(",")}}`;
}

export async function computePayloadHash(payload: CreateEmergencyInput): Promise<string> {
  const bytes = new TextEncoder().encode(stableStringify(payload));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * What the signature actually covers: the message's identity, content
 * commitment, and TTL — not the full payload bytes again, since
 * `payloadHash` already commits to those. Binding `messageId` and
 * `expiresAt` stops a relay hop from lifting a valid signature onto a
 * different message ID or a stretched TTL.
 */
export function signaturePayload(messageId: string, payloadHash: string, expiresAt: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(`${messageId}|${payloadHash}|${expiresAt}`);
}

/**
 * Builds the wire envelope for a locally-created emergency (spec §53).
 * `messageId` reuses `payload.incidentId` rather than minting a second
 * ID — it's already globally unique and relay-safe (spec §23; see
 * apps/web/src/services/emergencyService.ts).
 */
export async function buildEmergencyMessage(
  payload: CreateEmergencyInput,
  originDeviceId: string,
  timestamp: string,
  signingKeys: DeviceKeyPair
): Promise<EmergencyMessage> {
  const payloadHash = await computePayloadHash(payload);
  const expiresAt = payload.expiresAt;
  const messageId = payload.incidentId;

  const [signature, originPublicKey] = await Promise.all([
    signBytes(signingKeys.privateKey, signaturePayload(messageId, payloadHash, expiresAt)),
    exportPublicKeyRaw(signingKeys.publicKey),
  ]);

  return {
    messageId,
    originDeviceId,
    protocolVersion: PROTOCOL_VERSION,
    timestamp,
    payload,
    payloadHash,
    expiresAt,
    signature,
    originPublicKey,
  };
}
