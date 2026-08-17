/**
 * Base64url, not hex — spec §43 asks for compact packets, and this is
 * roughly half the size of hex for the same bytes (a 32-byte Ed25519
 * public key is ~43 chars vs. 64 in hex; a 64-byte signature is ~86 vs.
 * 128), which matters once these travel inside a BLE payload budget.
 * `btoa`/`atob` are global in both browsers and Node (16+), so this
 * needs no extra dependency.
 */
export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
