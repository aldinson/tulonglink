import { generateDeviceKeyPair } from "@tulonglink/crypto";
import { describe, expect, it } from "vitest";
import type { CreateEmergencyInput } from "@tulonglink/shared";
import type { EmergencyMessage } from "@tulonglink/protocol";
import { buildEmergencyMessage } from "./message.js";
import { createInMemoryRelayStore } from "./inMemoryRelayStore.js";
import { createSimulatedPeerPair } from "./simulatedTransport.js";
import { runSync } from "./handshake.js";
import { runGatewayUpload } from "./gateway.js";
import type { RelayStore } from "./store.js";

/**
 * Spec §49: "Integration tests must simulate: A -> B, A -> B -> C."
 * This is the actual proof-of-concept for Phase 3's protocol layer —
 * simulated, not device-verified (see apps/android/README.md for what
 * that distinction means and what's still required before it's true on
 * real hardware).
 */
function makePayload(incidentId: string): CreateEmergencyInput {
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
    expiresAt: "2026-08-17T08:00:00.000Z",
  };
}

const signingKeys = await generateDeviceKeyPair();

async function sync(storeInitiator: RelayStore, storeResponder: RelayStore, initiatorId: string, responderId: string) {
  const [connInitiator, connResponder] = createSimulatedPeerPair(initiatorId, responderId);
  return Promise.all([
    runSync(connInitiator, storeInitiator, initiatorId, "INITIATOR"),
    runSync(connResponder, storeResponder, responderId, "RESPONDER"),
  ]);
}

describe("multi-hop relay (simulated)", () => {
  it("relays a message across two hops: A -> B -> C", async () => {
    const message = await buildEmergencyMessage(makePayload("device-a:msg-1"), "device-a", "2026-08-16T08:00:00.000Z", signingKeys);
    const storeA = createInMemoryRelayStore([message]);
    const storeB = createInMemoryRelayStore([]);
    const storeC = createInMemoryRelayStore([]);

    await sync(storeA, storeB, "device-a", "device-b");
    expect(await storeB.hasMessage("device-a:msg-1")).toBe(true);

    await sync(storeB, storeC, "device-b", "device-c");
    expect(await storeC.hasMessage("device-a:msg-1")).toBe(true);
  });

  it("does not duplicate a message that reaches C via two different paths (spec §24)", async () => {
    const message = await buildEmergencyMessage(makePayload("device-a:msg-1"), "device-a", "2026-08-16T08:00:00.000Z", signingKeys);
    const storeA = createInMemoryRelayStore([message]);
    const storeB = createInMemoryRelayStore([]);
    const storeD = createInMemoryRelayStore([]);
    const storeC = createInMemoryRelayStore([]);

    // A -> B -> C
    await sync(storeA, storeB, "device-a", "device-b");
    await sync(storeB, storeC, "device-b", "device-c");
    expect(await storeC.listKnownIds()).toEqual(["device-a:msg-1"]);

    // A -> D -> C: C's summary already includes the message, so D has
    // nothing left to send it — and even if it did, handshake.ts's
    // hasMessage check would still refuse to store it a second time.
    await sync(storeA, storeD, "device-a", "device-d");
    const [, outcomeC] = await sync(storeD, storeC, "device-d", "device-c");

    expect(outcomeC.storedMessageIds).toEqual([]);
    expect(await storeC.listKnownIds()).toEqual(["device-a:msg-1"]);
  });

  it("reaches the server through a gateway that isn't adjacent to the originator: A -> B -> C -> D -> Server (spec §44, §47)", async () => {
    const message = await buildEmergencyMessage(makePayload("device-a:msg-1"), "device-a", "2026-08-16T08:00:00.000Z", signingKeys);
    const storeA = createInMemoryRelayStore([message]);
    const storeB = createInMemoryRelayStore([]);
    const storeC = createInMemoryRelayStore([]);
    const storeD = createInMemoryRelayStore([]);

    await sync(storeA, storeB, "device-a", "device-b");
    await sync(storeB, storeC, "device-b", "device-c");
    await sync(storeC, storeD, "device-c", "device-d");
    expect(await storeD.hasMessage("device-a:msg-1")).toBe(true);

    // D is the only device with "Internet" in this scenario — B and C
    // never see the fake server at all.
    const serverReceived: EmergencyMessage[] = [];
    const result = await runGatewayUpload(storeD, async (m) => void serverReceived.push(m));

    expect(result.uploadedMessageIds).toEqual(["device-a:msg-1"]);
    expect(serverReceived.map((m) => m.messageId)).toEqual(["device-a:msg-1"]);
  });
});
