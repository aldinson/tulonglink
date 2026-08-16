import { describe, expect, it } from "vitest";
import type { CreateEmergencyInput } from "@tulonglink/shared";
import { buildEmergencyMessage, computePayloadHash } from "./message.js";

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

describe("computePayloadHash", () => {
  it("is stable regardless of key order", async () => {
    const reordered = Object.fromEntries(
      Object.entries(payload).reverse()
    ) as unknown as CreateEmergencyInput;

    expect(await computePayloadHash(reordered)).toBe(await computePayloadHash(payload));
  });

  it("changes when a field changes", async () => {
    const mutated: CreateEmergencyInput = { ...payload, description: "different" };
    expect(await computePayloadHash(mutated)).not.toBe(await computePayloadHash(payload));
  });
});

describe("buildEmergencyMessage", () => {
  it("reuses incidentId as messageId and computes a matching hash", async () => {
    const message = await buildEmergencyMessage(payload, "device-a", "2026-08-16T08:00:00.000Z");

    expect(message.messageId).toBe(payload.incidentId);
    expect(message.expiresAt).toBe(payload.expiresAt);
    expect(message.payloadHash).toBe(await computePayloadHash(payload));
  });
});
