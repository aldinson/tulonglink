import { describe, expect, it } from "vitest";
import type { CreateEmergencyInput } from "@tulonglink/shared";
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

describe("validateEmergencyMessage", () => {
  it("accepts a well-formed, unexpired, correctly-hashed message", async () => {
    const message = await buildEmergencyMessage(payload, "device-a", payload.createdAt);
    expect(await validateEmergencyMessage(message, now)).toEqual({ valid: true });
  });

  it("rejects an unsupported protocol version", async () => {
    const message = await buildEmergencyMessage(payload, "device-a", payload.createdAt);
    const result = await validateEmergencyMessage({ ...message, protocolVersion: 99 }, now);
    expect(result).toEqual({ valid: false, reason: "UNSUPPORTED_PROTOCOL_VERSION" });
  });

  it("rejects a malformed payload", async () => {
    const message = await buildEmergencyMessage(payload, "device-a", payload.createdAt);
    const malformed = {
      ...message,
      payload: { ...payload, category: "NOT_A_REAL_CATEGORY" },
    } as unknown as typeof message;
    const result = await validateEmergencyMessage(malformed, now);
    expect(result).toEqual({ valid: false, reason: "MALFORMED_PAYLOAD" });
  });

  it("rejects a payload/hash mismatch (corruption or tampering)", async () => {
    const message = await buildEmergencyMessage(payload, "device-a", payload.createdAt);
    const tampered = { ...message, payload: { ...payload, description: "tampered" } };
    const result = await validateEmergencyMessage(tampered, now);
    expect(result).toEqual({ valid: false, reason: "HASH_MISMATCH" });
  });

  it("rejects an expired message", async () => {
    const message = await buildEmergencyMessage(payload, "device-a", payload.createdAt);
    const result = await validateEmergencyMessage(message, new Date("2026-08-18T00:00:00.000Z"));
    expect(result).toEqual({ valid: false, reason: "EXPIRED" });
  });
});
