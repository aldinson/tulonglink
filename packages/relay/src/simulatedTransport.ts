import type { RelayFrame } from "@tulonglink/protocol";
import type { PeerConnection } from "./transport.js";

/** Single-consumer async FIFO — the minimal primitive a simulated duplex link needs. */
function createChannel<T>() {
  const queue: T[] = [];
  const waiters: Array<(value: T) => void> = [];
  return {
    push(item: T): void {
      const waiter = waiters.shift();
      if (waiter) waiter(item);
      else queue.push(item);
    },
    next(): Promise<T> {
      const item = queue.shift();
      if (item !== undefined) return Promise.resolve(item);
      return new Promise((resolve) => waiters.push(resolve));
    },
  };
}

/**
 * An in-memory `PeerConnection` pair standing in for two Android devices
 * connected over BLE. This is what lets packages/relay's handshake and
 * multi-hop logic be fully unit/integration tested without physical
 * Bluetooth hardware. It proves the protocol logic works; it does not
 * and cannot prove real BLE behavior (radio range, GATT MTU limits,
 * Android's central/peripheral dual-role constraints) — that requires
 * the native implementation and real devices (see apps/android/README.md).
 */
export function createSimulatedPeerPair(peerIdA: string, peerIdB: string): [PeerConnection, PeerConnection] {
  const toA = createChannel<RelayFrame>();
  const toB = createChannel<RelayFrame>();

  const connA: PeerConnection = {
    peerId: peerIdB,
    async send(frame) {
      toB.push(frame);
    },
    async receive() {
      return toA.next();
    },
    async close() {},
  };

  const connB: PeerConnection = {
    peerId: peerIdA,
    async send(frame) {
      toA.push(frame);
    },
    async receive() {
      return toB.next();
    },
    async close() {},
  };

  return [connA, connB];
}
