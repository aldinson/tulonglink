import { Schema, model } from "mongoose";
import type { Device } from "@tulonglink/shared";

const deviceSchema = new Schema<Device>({
  deviceId: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  communityId: { type: String, required: true, index: true },
  protocolVersion: { type: Number, required: true },
  registeredAt: { type: String, required: true },
  lastSeenAt: { type: String, required: true },
  revoked: { type: Boolean, required: true, default: false },
});

export const DeviceModel = model<Device>("Device", deviceSchema, "devices");
