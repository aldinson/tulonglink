import { describe, expect, it } from "vitest";
import type { CreateEmergencyInput } from "@tulonglink/shared";
import type { EmergencyMessage } from "@tulonglink/protocol";
import { buildEmergencyMessage } from "./message.js";
import { createInMemoryRelayStore } from "./inMemoryRelayStore.js";
import { runGatewayUpload } from "./gateway.js";

function makePayload(incidentId: string, expiresAt = "2026-08-17T08:00:00.000Z"): CreateEmergencyInput {
  return {
    incidentId,
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
    expiresAt,
  };
}

const now = new Date("2026-08-16T12:00:00.000Z");

describe("runGatewayUpload", () => {
  it("uploads every not-yet-uploaded message and marks it uploaded", async () => {
    const m1 = await buildEmergencyMessage(makePayload("device-a:msg-1"), "device-a", "2026-08-16T08:00:00.000Z");
    const m2 = await buildEmergencyMessage(makePayload("device-a:msg-2"), "device-a", "2026-08-16T08:00:00.000Z");
    const store = createInMemoryRelayStore([m1, m2]);
    const uploaded: string[] = [];

    const result = await runGatewayUpload(
      store,
      async (message) => {
        uploaded.push(message.messageId);
      },
      now
    );

    expect(result.uploadedMessageIds.sort()).toEqual(["device-a:msg-1", "device-a:msg-2"]);
    expect(uploaded.sort()).toEqual(["device-a:msg-1", "device-a:msg-2"]);
    expect(await store.isUploaded("device-a:msg-1")).toBe(true);
  });

  it("does not upload a message twice, and does not remove it from the relay store", async () => {
    const message = await buildEmergencyMessage(makePayload("device-a:msg-1"), "device-a", "2026-08-16T08:00:00.000Z");
    const store = createInMemoryRelayStore([message]);
    const uploadCalls: string[] = [];

    await runGatewayUpload(store, async (m) => void uploadCalls.push(m.messageId), now);
    const second = await runGatewayUpload(store, async (m) => void uploadCalls.push(m.messageId), now);

    expect(uploadCalls).toEqual(["device-a:msg-1"]);
    expect(second.uploadedMessageIds).toEqual([]);
    // Still relayable to other peers — upload never retires a message.
    expect(await store.hasMessage("device-a:msg-1")).toBe(true);
  });

  it("leaves a failed upload for the next opportunity, without marking it uploaded", async () => {
    const message = await buildEmergencyMessage(makePayload("device-a:msg-1"), "device-a", "2026-08-16T08:00:00.000Z");
    const store = createInMemoryRelayStore([message]);

    const result = await runGatewayUpload(
      store,
      async () => {
        throw new Error("server unreachable");
      },
      now
    );

    expect(result.failedMessageIds).toEqual(["device-a:msg-1"]);
    expect(await store.isUploaded("device-a:msg-1")).toBe(false);
  });

  it("does not upload an expired message", async () => {
    const expired = await buildEmergencyMessage(
      makePayload("device-a:expired", "2026-08-16T00:00:00.000Z"),
      "device-a",
      "2026-08-15T08:00:00.000Z"
    );
    const store = createInMemoryRelayStore([expired]);
    const uploadFn = async (_message: EmergencyMessage) => {
      throw new Error("should not be called for an expired message");
    };

    const result = await runGatewayUpload(store, uploadFn, now);

    expect(result.uploadedMessageIds).toEqual([]);
    expect(result.failedMessageIds).toEqual([]);
  });
});
