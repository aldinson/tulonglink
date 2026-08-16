import type { Request, Response } from "express";
import { ulid } from "ulid";
import { PROTOCOL_VERSION } from "@tulonglink/protocol";
import type { RequestOtpInput, VerifyOtpInput, RefreshInput } from "@tulonglink/shared";
import { env } from "../config/env.js";
import { UserModel } from "../models/User.js";
import { DeviceModel } from "../models/Device.js";
import { CommunityModel } from "../models/Community.js";
import { MockOtpProvider, type OtpProvider } from "../services/otpProvider.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../services/tokenService.js";
import { HttpError } from "../middleware/errorHandler.js";

// Single shared instance: OTP state must persist across requests within
// the process. Swap for a real provider here when one exists — nothing
// else in this file needs to change.
export const otpProvider: OtpProvider = new MockOtpProvider();

export async function requestOtp(req: Request, res: Response): Promise<void> {
  const { phoneNumber } = req.body as RequestOtpInput;
  await otpProvider.requestOtp(phoneNumber);

  const devOtp =
    env.NODE_ENV !== "production" && otpProvider instanceof MockOtpProvider
      ? otpProvider.peekCode(phoneNumber)
      : undefined;

  res.status(200).json({ message: "OTP sent", ...(devOtp ? { devOtp } : {}) });
}

export async function verifyOtp(req: Request, res: Response): Promise<void> {
  const { phoneNumber, code, communityId, deviceId } = req.body as VerifyOtpInput;

  const valid = await otpProvider.verifyOtp(phoneNumber, code);
  if (!valid) throw new HttpError(401, "Invalid or expired OTP");

  const community = await CommunityModel.findOne({ communityId });
  if (!community) throw new HttpError(400, "Unknown community");

  let user = await UserModel.findOne({ phoneNumber });
  if (!user) {
    user = await UserModel.create({
      userId: ulid(),
      phoneNumber,
      communityId,
      role: "RESIDENT",
      createdAt: new Date().toISOString(),
    });
  }

  const existingDevice = await DeviceModel.findOne({ deviceId });
  if (existingDevice?.revoked) throw new HttpError(403, "Device has been revoked");

  const now = new Date().toISOString();
  await DeviceModel.findOneAndUpdate(
    { deviceId },
    {
      $set: {
        userId: user.userId,
        communityId: user.communityId,
        protocolVersion: PROTOCOL_VERSION,
        lastSeenAt: now,
        revoked: false,
      },
      $setOnInsert: { registeredAt: now },
    },
    { upsert: true }
  );

  const access = signAccessToken({
    userId: user.userId,
    communityId: user.communityId,
    role: user.role,
    deviceId,
  });
  const refresh = signRefreshToken({ userId: user.userId, deviceId });

  res.status(200).json({
    userId: user.userId,
    communityId: user.communityId,
    role: user.role,
    accessToken: access.token,
    accessTokenExpiresAt: access.expiresAt.toISOString(),
    refreshToken: refresh.token,
    refreshTokenExpiresAt: refresh.expiresAt.toISOString(),
  });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body as RefreshInput;

  let claims;
  try {
    claims = verifyRefreshToken(refreshToken);
  } catch {
    throw new HttpError(401, "Invalid or expired refresh token");
  }

  const [user, device] = await Promise.all([
    UserModel.findOne({ userId: claims.userId }),
    DeviceModel.findOne({ deviceId: claims.deviceId }),
  ]);
  if (!user || !device) throw new HttpError(401, "Account or device no longer exists");
  if (device.revoked) throw new HttpError(403, "Device has been revoked");

  device.lastSeenAt = new Date().toISOString();
  await device.save();

  const access = signAccessToken({
    userId: user.userId,
    communityId: user.communityId,
    role: user.role,
    deviceId: device.deviceId,
  });
  // Rotate the refresh token too, so a stolen-but-unused old one stops working.
  const newRefresh = signRefreshToken({ userId: user.userId, deviceId: device.deviceId });

  res.status(200).json({
    accessToken: access.token,
    accessTokenExpiresAt: access.expiresAt.toISOString(),
    refreshToken: newRefresh.token,
    refreshTokenExpiresAt: newRefresh.expiresAt.toISOString(),
  });
}

/**
 * Stateless JWTs mean there's no server-side session to destroy. Real
 * revocation (stolen refresh token, lost phone) goes through device
 * revocation (Device.revoked, checked above and in requireAuth's
 * documented bound), not logout. This endpoint exists so the client has
 * a clear "I'm done" call site and so a future token-blocklist (Phase 6
 * security hardening) has somewhere to plug in without an API shape
 * change.
 */
export async function logout(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: "Logged out" });
}
