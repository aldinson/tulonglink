import jwt from "jsonwebtoken";
import type { UserRole } from "@tulonglink/shared";
import { env } from "../config/env.js";

export interface AccessTokenClaims {
  userId: string;
  communityId: string;
  role: UserRole;
  deviceId: string;
}

export interface RefreshTokenClaims {
  userId: string;
  deviceId: string;
}

const ACCESS_TTL_SECONDS = env.JWT_ACCESS_TTL_MINUTES * 60;
const REFRESH_TTL_SECONDS = env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60;

export function signAccessToken(claims: AccessTokenClaims): { token: string; expiresAt: Date } {
  const token = jwt.sign(claims, env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_TTL_SECONDS });
  return { token, expiresAt: new Date(Date.now() + ACCESS_TTL_SECONDS * 1000) };
}

export function signRefreshToken(claims: RefreshTokenClaims): { token: string; expiresAt: Date } {
  const token = jwt.sign(claims, env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_TTL_SECONDS });
  return { token, expiresAt: new Date(Date.now() + REFRESH_TTL_SECONDS * 1000) };
}

export function verifyAccessToken(token: string): AccessTokenClaims {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenClaims & jwt.JwtPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenClaims {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenClaims & jwt.JwtPayload;
}
