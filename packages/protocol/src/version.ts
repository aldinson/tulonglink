/**
 * Wire protocol version, independent of the app release version and of
 * Emergency.messageVersion (which versions the record schema). Bump this
 * when the message envelope shape changes in a way peers must negotiate
 * (spec §21 handshake, §26 "unsupported protocol versions").
 */
export const PROTOCOL_VERSION = 1;

/**
 * Exact-match for now — there is only one version in the wild. Once a
 * v2 ships, this becomes the single place that decides which older
 * versions a device still interoperates with (spec §21 handshake,
 * §26 "unsupported protocol versions").
 */
export function isProtocolVersionSupported(version: number): boolean {
  return version === PROTOCOL_VERSION;
}
