import type { Request, Response } from "express";
import { DeviceModel } from "../models/Device.js";
import { HttpError } from "../middleware/errorHandler.js";

/** Spec §8.3: "Revoke devices" is an ADMIN capability — not resident
 * self-service (§8.1's capability list has no device management). */
export async function listDevices(req: Request, res: Response): Promise<void> {
  const auth = req.auth!;
  const devices = await DeviceModel.find({ communityId: auth.communityId }).sort({ lastSeenAt: -1 });
  res.status(200).json(devices);
}

export async function revokeDevice(req: Request, res: Response): Promise<void> {
  const auth = req.auth!;
  const device = await DeviceModel.findOne({ deviceId: req.params.deviceId! });
  if (!device || device.communityId !== auth.communityId) {
    throw new HttpError(404, "Device not found");
  }

  device.revoked = true;
  await device.save();
  res.status(200).json(device);
}
