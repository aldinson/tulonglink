import type { webcrypto } from "node:crypto";
import { base64UrlToBytes, bytesToBase64Url } from "./encoding.js";

/**
 * Type-only import — `webcrypto.CryptoKey`/`CryptoKeyPair` mirror the
 * DOM `CryptoKey`/`CryptoKeyPair` shapes exactly (both implement the
 * same WebCrypto spec), so this stays structurally compatible with
 * `apps/web`'s browser `crypto.subtle` at runtime. It's needed because
 * this package's own tsconfig (no "DOM" lib — see tsconfig.base.json)
 * has no other name for these types, and adding "DOM" there would leak
 * browser globals into every Node-only package.
 */
type CryptoKey = webcrypto.CryptoKey;
type CryptoKeyPair = webcrypto.CryptoKeyPair;
export type JsonWebKey = webcrypto.JsonWebKey;

/**
 * Ed25519 device signing keys (spec §26/§27's "cryptographic signatures
 * should be used where appropriate"), via Web Crypto (`crypto.subtle`) —
 * the same API `packages/relay` already relies on for payload hashing,
 * so this adds no new runtime dependency and works identically in the
 * browser (apps/web) and Node (packages/relay's tests, and services/api
 * if it ever needs to verify server-side).
 *
 * Web Crypto's `extractable` flag applies to an entire generated key
 * pair, not per-key — there's no way to ask for "extractable public key,
 * non-extractable private key" in one `generateKey` call. Keys here are
 * generated extractable so the public key can be exported for the wire;
 * callers are responsible for never calling `exportKey` on the private
 * key and instead persisting the `CryptoKey` object directly (e.g. via
 * IndexedDB structured clone, as `apps/web` does). That is real but
 * softer protection than a private key that's hardware-non-extractable
 * by construction — the difference from native Android Keystore, which
 * only exists once the Phase 3 native BLE plugin does.
 */
const ALGORITHM = { name: "Ed25519" };

export interface DeviceKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export async function generateDeviceKeyPair(): Promise<DeviceKeyPair> {
  const pair = (await crypto.subtle.generateKey(ALGORITHM, true, ["sign", "verify"])) as CryptoKeyPair;
  return { publicKey: pair.publicKey, privateKey: pair.privateKey };
}

/** Raw 32-byte public key, base64url-encoded — this is what travels on the wire (`EmergencyMessage.originPublicKey`). */
export async function exportPublicKeyRaw(publicKey: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", publicKey);
  return bytesToBase64Url(new Uint8Array(raw));
}

export async function importPublicKeyRaw(encoded: string): Promise<CryptoKey> {
  const bytes = base64UrlToBytes(encoded);
  return crypto.subtle.importKey("raw", bytes, ALGORITHM, true, ["verify"]);
}

export async function signBytes(privateKey: CryptoKey, data: Uint8Array<ArrayBuffer>): Promise<string> {
  const signature = await crypto.subtle.sign(ALGORITHM, privateKey, data);
  return bytesToBase64Url(new Uint8Array(signature));
}

/** Verifies a base64url signature against base64url-encoded raw public key bytes. Never throws — a malformed key/signature is just an invalid one. */
export async function verifyBytes(
  publicKeyRaw: string,
  signature: string,
  data: Uint8Array<ArrayBuffer>
): Promise<boolean> {
  try {
    const publicKey = await importPublicKeyRaw(publicKeyRaw);
    return await crypto.subtle.verify(ALGORITHM, publicKey, base64UrlToBytes(signature), data);
  } catch {
    return false;
  }
}

/**
 * JWK (a plain JSON object), not "raw", for the *private* key —
 * `apps/web` persists this in IndexedDB, and a plain JSON-serializable
 * value round-trips there (including through `fake-indexeddb` in tests)
 * without depending on structured-clone support for opaque `CryptoKey`
 * objects. "raw" export generally isn't valid for private keys anyway;
 * JWK is the portable format Web Crypto supports for them.
 */
export async function exportPrivateKeyJwk(privateKey: CryptoKey): Promise<JsonWebKey> {
  return crypto.subtle.exportKey("jwk", privateKey);
}

export async function importPrivateKeyJwk(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey("jwk", jwk, ALGORITHM, true, ["sign"]);
}
