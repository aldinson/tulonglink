/** Spec §11. */
export interface Device {
  deviceId: string;
  userId: string;
  communityId: string;
  protocolVersion: number;
  registeredAt: string;
  lastSeenAt: string;
  revoked: boolean;
}
