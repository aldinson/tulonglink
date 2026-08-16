import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthSession } from "@tulonglink/shared";
import { setSession, clearSession } from "./session.js";
import { createEmergency, listEmergencies, listEmergencyEvents } from "./emergencyService.js";

const fakeSession: AuthSession = {
  userId: "U1",
  communityId: "demo-community",
  role: "RESIDENT",
  accessToken: "a",
  refreshToken: "r",
  accessTokenExpiresAt: new Date(Date.now() + 60_000).toISOString(),
  refreshTokenExpiresAt: new Date(Date.now() + 60_000).toISOString(),
};

describe("createEmergency", () => {
  beforeEach(async () => {
    await setSession(fakeSession);
    // createEmergency fires an opportunistic sync attempt; stub fetch so
    // it fails fast (as if offline) instead of hitting a real network.
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  });

  afterEach(async () => {
    await clearSession();
    vi.unstubAllGlobals();
  });

  it("stores the emergency as LOCAL_ONLY without any network access", async () => {
    const emergency = await createEmergency({
      category: "MEDICAL",
      description: "Person collapsed",
      priority: "CRITICAL",
      latitude: null,
      longitude: null,
      locationAccuracy: null,
      altitude: null,
      locationTimestamp: null,
      manualLocation: false,
    });

    expect(emergency.deliveryState).toBe("LOCAL_ONLY");
    expect(emergency.reporterId).toBe("U1");
    expect(emergency.communityId).toBe("demo-community");

    const stored = await listEmergencies();
    expect(stored.some((e) => e.incidentId === emergency.incidentId)).toBe(true);
  });

  it("records a LOCAL_ONLY event for the audit trail", async () => {
    const emergency = await createEmergency({
      category: "FIRE",
      description: "House fire",
      priority: "HIGH",
      latitude: 10.1,
      longitude: 123.1,
      locationAccuracy: 15,
      altitude: null,
      locationTimestamp: new Date().toISOString(),
      manualLocation: false,
    });

    const events = await listEmergencyEvents(emergency.incidentId);
    expect(events).toHaveLength(1);
    expect(events[0]?.state).toBe("LOCAL_ONLY");
  });

  it("refuses to create an emergency with no local session", async () => {
    await clearSession();
    await expect(
      createEmergency({
        category: "OTHER",
        description: "test",
        priority: "NORMAL",
        latitude: null,
        longitude: null,
        locationAccuracy: null,
        altitude: null,
        locationTimestamp: null,
        manualLocation: false,
      })
    ).rejects.toThrow();
  });

  it("never blocks creation on missing GPS (manual/absent location)", async () => {
    const emergency = await createEmergency({
      category: "MISSING_PERSON",
      description: "test",
      priority: "NORMAL",
      latitude: null,
      longitude: null,
      locationAccuracy: null,
      altitude: null,
      locationTimestamp: null,
      manualLocation: true,
    });
    expect(emergency.latitude).toBeNull();
    expect(emergency.deliveryState).toBe("LOCAL_ONLY");
  });
});
