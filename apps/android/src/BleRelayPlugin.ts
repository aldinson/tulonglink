/**
 * The Capacitor plugin interface a real native implementation must
 * satisfy. This is the boundary CLAUDE.md's PWA/Android section
 * requires: the only place BLE-specific concepts (advertising,
 * scanning, GATT connections) are named at all. No emergency-protocol
 * business logic belongs on this side of the boundary — that all lives
 * in packages/relay, which knows nothing about BLE.
 *
 * Not implemented yet. `npx cap add android` hasn't been run in this
 * repo (see README.md in this directory) — there is no native Android
 * project for a Kotlin implementation to live in. When that happens,
 * the native side adapts its GATT central/peripheral events to this
 * shape, and a small adapter on the TypeScript side wraps it as a
 * packages/relay `PeerConnection` per peer.
 */
export interface BleRelayPlugin {
  /** Begin advertising this device as a TulongLink peer (spec §20). Minimal, non-sensitive metadata only. */
  startAdvertising(options: { intervalMs: number }): Promise<void>;
  stopAdvertising(): Promise<void>;

  /** Begin scanning for other TulongLink peers (spec §20). */
  startScanning(options: { intervalMs: number }): Promise<void>;
  stopScanning(): Promise<void>;

  /** Open a GATT connection to a discovered peer, identified by its BLE-layer address. */
  connectToPeer(options: { peerId: string }): Promise<void>;
  disconnectFromPeer(options: { peerId: string }): Promise<void>;

  /** Send raw bytes (an encoded RelayFrame) to a connected peer. */
  sendFrame(options: { peerId: string; bytes: Uint8Array }): Promise<void>;

  addListener(eventName: "peerDiscovered", listenerFunc: (event: { peerId: string }) => void): Promise<{ remove: () => void }>;
  addListener(
    eventName: "frameReceived",
    listenerFunc: (event: { peerId: string; bytes: Uint8Array }) => void
  ): Promise<{ remove: () => void }>;
  addListener(eventName: "peerDisconnected", listenerFunc: (event: { peerId: string }) => void): Promise<{ remove: () => void }>;
}
