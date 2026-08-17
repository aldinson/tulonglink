import { describe, expect, it } from "vitest";
import type { CreateEmergencyInput } from "@tulonglink/shared";
import { generateDeviceKeyPair } from "@tulonglink/crypto";
import { buildEmergencyMessage } from "./message.js";
import { validateEmergencyMessage } from "./validation.js";

const payload: CreateEmergencyInput = {
  incidentId: "device-a:11111111-1111-1111-1111-111111111111",
  originDeviceId: "device-a",
  communityId: "demo-community",
  category: "MEDICAL",
  description: "Person collapsed and needs assistance",
  priority: "CRITICAL",
  createdAt: "2026-08-16T08:00:00.000Z",
  originTimestamp: "2026-08-16T08:00:00.000Z",
  latitude: 10.123456,
  longitude: 123.123456,
  locationAccuracy: 12,
  altitude: null,
  locationTimestamp: null,
  manualLocation: false,
  messageVersion: 1,
  expiresAt: "2026-08-17T08:00:00.000Z",
};

const now = new Date("2026-08-16T09:00:00.000Z");
const signingKeys = await generateDeviceKeyPair();

describe("validateEmergencyMessage", () => {
  it("accepts a well-formed, unexpired, correctly-hashed, correctly-signed message", async () => {
    const message = await buildEmergencyMessage(payload, "device-a", payload.createdAt, signingKeys);
    expect(await validateEmergencyMessage(message, now)).toEqual({ valid: true });
  });

  it("rejects an unsupported protocol version", async () => {
    const message = await buildEmergencyMessage(payload, "device-a", payload.createdAt, signingKeys);
    const result = await validateEmergencyMessage({ ...message, protocolVersion: 99 }, now);
    expect(result).toEqual({ valid: false, reason: "UNSUPPORTED_PROTOCOL_VERSION" });
  });

  it("rejects a malformed payload", async () => {
    const message = await buildEmergencyMessage(payload, "device-a", payload.createdAt, signingKeys);
    const malformed = {
      ...message,
      payload: { ...payload, category: "NOT_A_REAL_CATEGORY" },
    } as unknown as typeof message;
    const result = await validateEmergencyMessage(malformed, now);
    expect(result).toEqual({ valid: false, reason: "MALFORMED_PAYLOAD" });
  });

  it("rejects a payload/hash mismatch (corruption or tampering)", async () => {
    const message = await buildEmergencyMessage(payload, "device-a", payload.createdAt, signingKeys);
    const tampered = { ...message, payload: { ...payload, description: "tampered" } };
    const result = await validateEmergencyMessage(tampered, now);
    expect(result).toEqual({ valid: false, reason: "HASH_MISMATCH" });
  });

  it("rejects a message signed by a different key than the one it's presented with", async () => {
    const message = await buildEmergencyMessage(payload, "device-a", payload.createdAt, signingKeys);
    const impostor = await generateDeviceKeyPair();
    const impostorMessage = await buildEmergencyMessage(payload, "device-a", payload.createdAt, impostor);
    // A tampered originPublicKey, with the original (now-mismatched) signature — simulates a
    // relay hop trying to re-attribute the message to a different device's key.
    const swapped = { ...message, originPublicKey: impostorMessage.originPublicKey };
    const result = await validateEmergencyMessage(swapped, now);
    expect(result).toEqual({ valid: false, reason: "INVALID_SIGNATURE" });
  });

  it("rejects a message with the signature stripped/altered", async () => {
    const message = await buildEmergencyMessage(payload, "device-a", payload.createdAt, signingKeys);
    const result = await validateEmergencyMessage({ ...message, signature: "not-a-real-signature" }, now);
    expect(result).toEqual({ valid: false, reason: "INVALID_SIGNATURE" });
  });

  it("rejects an expired message", async () => {
    const message = await buildEmergencyMessage(payload, "device-a", payload.createdAt, signingKeys);
    const result = await validateEmergencyMessage(message, new Date("2026-08-18T00:00:00.000Z"));
    expect(result).toEqual({ valid: false, reason: "EXPIRED" });
  });
});
