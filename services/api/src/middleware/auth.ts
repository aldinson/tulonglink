import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken, type AccessTokenClaims } from "../services/tokenService.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AccessTokenClaims;
    }
  }
}

/**
 * Revocation check happens at refresh time (services/api/src/controllers/authController.ts),
 * not per-request here — that would mean a DB round trip on every
 * authenticated call. A revoked device therefore stays usable for up to
 * one access-token lifetime (JWT_ACCESS_TTL_MINUTES, default 15 min)
 * after revocation. That bound is deliberate per spec §33's token
 * expiration/refresh model; tighten it later if the pilot needs
 * faster revocation.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing bearer token" });
    return;
  }
  try {
    req.auth = verifyAccessToken(header.slice("Bearer ".length));
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
