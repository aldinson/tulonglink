import {
  exportPrivateKeyJwk,
  exportPublicKeyRaw,
  generateDeviceKeyPair,
  importPrivateKeyJwk,
  importPublicKeyRaw,
  type JsonWebKey,
} from "@tulonglink/crypto";
import { getConfig, setConfig } from "../db/db.js";

const STORAGE_KEY = "deviceSigningKeys";

interface StoredDeviceKeys {
  privateKeyJwk: JsonWebKey;
  publicKeyRaw: string;
}

/**
 * A device's Ed25519 signing identity (spec §26/§27), generated once
 * and reused for the life of the installation. Stored the same way the
 * session is (`apps/web/src/services/session.ts`) — IndexedDB, not
 * localStorage — as a JWK rather than the raw `CryptoKey` object, so it
 * round-trips through structured clone the same way in a real browser
 * and under `fake-indexeddb` in tests, without depending on
 * IndexedTest/browser support for cloning opaque native objects.
 *
 * This is real but softer protection than a hardware-backed
 * non-extractable key: see the limitation noted in
 * `packages/crypto/src/deviceKeys.ts`. True Keystore-backed storage
 * only exists once the native BLE layer (Phase 3) does.
 */
export async function getOrCreateDeviceSigningKeys() {
  const stored = await getConfig<StoredDeviceKeys>(STORAGE_KEY);
  if (stored) {
    return {
      privateKey: await importPrivateKeyJwk(stored.privateKeyJwk),
      publicKey: await importPublicKeyRaw(stored.publicKeyRaw),
    };
  }

  const { privateKey, publicKey } = await generateDeviceKeyPair();
  const record: StoredDeviceKeys = {
    privateKeyJwk: await exportPrivateKeyJwk(privateKey),
    publicKeyRaw: await exportPublicKeyRaw(publicKey),
  };
  await setConfig(STORAGE_KEY, record);
  return { privateKey, publicKey };
}
