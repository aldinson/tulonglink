import { describe, expect, it } from "vitest";
import type { CreateEmergencyInput } from "@tulonglink/shared";
import { buildEmergencyMessage } from "./message.js";
import { createInMemoryRelayStore } from "./inMemoryRelayStore.js";
import { buildMessageSummary, diffKnownIds } from "./messageSummary.js";

function makePayload(incidentId: string, expiresAt: string): CreateEmergencyInput {
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

describe("diffKnownIds", () => {
  it("computes what to send and what to expect from the other side's summary", () => {
    const local = { knownIds: ["A123", "A124", "A125"] };
    const remote = { knownIds: ["A123", "A125", "A126"] };

    expect(diffKnownIds(local, remote)).toEqual({
      toSend: ["A124"],
      toRequest: ["A126"],
    });
  });

  it("is empty both ways when both sides already know the same set", () => {
    const summary = { knownIds: ["A123", "A124"] };
    expect(diffKnownIds(summary, summary)).toEqual({ toSend: [], toRequest: [] });
  });
});

describe("buildMessageSummary", () => {
  it("prunes expired messages from the store and excludes them from the summary (spec §25)", async () => {
    const now = new Date("2026-08-16T12:00:00.000Z");
    const live = await buildEmergencyMessage(
      makePayload("device-a:live", "2026-08-17T00:00:00.000Z"),
      "device-a",
      "2026-08-16T08:00:00.000Z"
    );
    const expired = await buildEmergencyMessage(
      makePayload("device-a:expired", "2026-08-16T00:00:00.000Z"),
      "device-a",
      "2026-08-15T08:00:00.000Z"
    );
    const store = createInMemoryRelayStore([live, expired]);

    const summary = await buildMessageSummary(store, now);

    expect(summary.knownIds).toEqual(["device-a:live"]);
    expect(await store.hasMessage("device-a:expired")).toBe(false);
  });
});
