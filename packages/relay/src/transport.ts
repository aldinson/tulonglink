import type { RelayFrame } from "@tulonglink/protocol";

/**
 * The abstraction spec §5/§7 requires: everything in this package talks
 * to a peer only through this interface, never through BLE APIs
 * directly. A real Android implementation (apps/android, Phase 3
 * follow-up) adapts native GATT central/peripheral events to this
 * shape; `simulatedTransport.ts` in this package is the in-memory
 * implementation the test suite runs against instead of hardware
 * (CLAUDE.md Testing: "build simulated-transport abstractions").
 */
export interface PeerConnection {
  /**
   * The BLE-layer address this connection was made to — not yet a
   * verified TulongLink deviceId. `handshake.ts`'s DeviceHello exchange
   * is what actually establishes the peer's deviceId.
   */
  readonly peerId: string;
  send(frame: RelayFrame): Promise<void>;
  receive(): Promise<RelayFrame>;
  close(): Promise<void>;
}
