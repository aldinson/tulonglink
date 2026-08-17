import { afterEach, describe, expect, it } from "vitest";
import { exportPublicKeyRaw, signBytes, verifyBytes } from "@tulonglink/crypto";
import { deleteConfig } from "../db/db.js";
import { getOrCreateDeviceSigningKeys } from "./deviceKeyService.js";

describe("getOrCreateDeviceSigningKeys", () => {
  afterEach(async () => {
    await deleteConfig("deviceSigningKeys");
  });

  it("generates a keypair that can sign and verify", async () => {
    const { privateKey, publicKey } = await getOrCreateDeviceSigningKeys();
    const publicKeyRaw = await exportPublicKeyRaw(publicKey);
    const message = new TextEncoder().encode("test message");

    const signature = await signBytes(privateKey, message);
    await expect(verifyBytes(publicKeyRaw, signature, message)).resolves.toBe(true);
  });

  it("reuses the same key across calls instead of generating a new one each time", async () => {
    const first = await getOrCreateDeviceSigningKeys();
    const second = await getOrCreateDeviceSigningKeys();

    const firstPublicKeyRaw = await exportPublicKeyRaw(first.publicKey);
    const secondPublicKeyRaw = await exportPublicKeyRaw(second.publicKey);
    expect(secondPublicKeyRaw).toBe(firstPublicKeyRaw);
  });
});
