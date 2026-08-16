/**
 * Wire protocol version, independent of the app release version and of
 * Emergency.messageVersion (which versions the record schema). Bump this
 * when the message envelope shape changes in a way peers must negotiate
 * (spec §21 handshake, §26 "unsupported protocol versions").
 */
export const PROTOCOL_VERSION = 1;
