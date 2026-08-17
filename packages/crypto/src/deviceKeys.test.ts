import { describe, expect, it } from "vitest";
import {
  exportPrivateKeyJwk,
  exportPublicKeyRaw,
  generateDeviceKeyPair,
  importPrivateKeyJwk,
  signBytes,
  verifyBytes,
} from "./deviceKeys.js";

const message = new TextEncoder().encode("device-a:msg-1|abc123hash|2026-08-17T00:00:00.000Z");

describe("device signing keys", () => {
  it("signs data such that the matching public key verifies it", async () => {
    const { publicKey, privateKey } = await generateDeviceKeyPair();
    const publicKeyRaw = await exportPublicKeyRaw(publicKey);
    const signature = await signBytes(privateKey, message);

    await expect(verifyBytes(publicKeyRaw, signature, message)).resolves.toBe(true);
  });

  it("rejects a signature once the signed data is tampered with", async () => {
    const { publicKey, privateKey } = await generateDeviceKeyPair();
    const publicKeyRaw = await exportPublicKeyRaw(publicKey);
    const signature = await signBytes(privateKey, message);

    const tampered = new TextEncoder().encode("device-a:msg-1|tampered-hash|2026-08-17T00:00:00.000Z");
    await expect(verifyBytes(publicKeyRaw, signature, tampered)).resolves.toBe(false);
  });

  it("rejects a signature verified against the wrong public key", async () => {
    const signer = await generateDeviceKeyPair();
    const impostor = await generateDeviceKeyPair();
    const impostorPublicKeyRaw = await exportPublicKeyRaw(impostor.publicKey);
    const signature = await signBytes(signer.privateKey, message);

    await expect(verifyBytes(impostorPublicKeyRaw, signature, message)).resolves.toBe(false);
  });

  it("never throws on a malformed public key or signature — just fails verification", async () => {
    await expect(verifyBytes("not-a-real-key", "not-a-real-signature", message)).resolves.toBe(false);
  });

  it("round-trips the exported public key through base64url without altering it", async () => {
    const { publicKey } = await generateDeviceKeyPair();
    const encoded = await exportPublicKeyRaw(publicKey);
    // base64url only: no '+', '/', or padding '='.
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("round-trips the private key through a JWK (apps/web's IndexedDB storage format) and still signs correctly", async () => {
    const { publicKey, privateKey } = await generateDeviceKeyPair();
    const publicKeyRaw = await exportPublicKeyRaw(publicKey);

    const jwk = await exportPrivateKeyJwk(privateKey);
    const restoredPrivateKey = await importPrivateKeyJwk(jwk);
    const signature = await signBytes(restoredPrivateKey, message);

    await expect(verifyBytes(publicKeyRaw, signature, message)).resolves.toBe(true);
  });
});
