import { describe, expect, it } from "vitest";
import { createEmergencySchema } from "./emergency.js";

const base = {
  incidentId: "DEV123:000001",
  originDeviceId: "DEV123",
  communityId: "demo-community",
  category: "MEDICAL" as const,
  description: "Person collapsed and needs assistance",
  priority: "CRITICAL" as const,
  createdAt: "2026-08-16T08:00:00.000Z",
  originTimestamp: "2026-08-16T08:00:00.000Z",
  latitude: 10.123456,
  longitude: 123.123456,
  locationAccuracy: 12,
  altitude: null,
  locationTimestamp: "2026-08-16T08:00:00.000Z",
  manualLocation: false,
  messageVersion: 1,
  expiresAt: "2026-08-17T08:00:00.000Z",
};

describe("createEmergencySchema", () => {
  it("accepts a valid emergency with GPS", () => {
    expect(createEmergencySchema.safeParse(base).success).toBe(true);
  });

  it("accepts a valid emergency with no GPS (manual location)", () => {
    const result = createEmergencySchema.safeParse({
      ...base,
      latitude: null,
      longitude: null,
      locationAccuracy: null,
      locationTimestamp: null,
      manualLocation: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown category", () => {
    const result = createEmergencySchema.safeParse({ ...base, category: "UFO_SIGHTING" });
    expect(result.success).toBe(false);
  });

  it("rejects a reporterId field being trusted from the client", () => {
    // reporterId is not part of the schema at all — even if present, it's ignored,
    // never trusted from the payload.
    const parsed = createEmergencySchema.parse({ ...base, reporterId: "attacker-supplied" });
    expect((parsed as Record<string, unknown>).reporterId).toBeUndefined();
  });

  it("rejects out-of-range latitude", () => {
    const result = createEmergencySchema.safeParse({ ...base, latitude: 999 });
    expect(result.success).toBe(false);
  });

  it("rejects an empty description", () => {
    const result = createEmergencySchema.safeParse({ ...base, description: "" });
    expect(result.success).toBe(false);
  });
});
