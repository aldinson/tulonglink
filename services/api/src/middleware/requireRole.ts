import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@tulonglink/shared";
import { HttpError } from "./errorHandler.js";

/** Must run after `requireAuth` — relies on `req.auth` being populated. */
export function requireRole(roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      throw new HttpError(403, "Insufficient role");
    }
    next();
  };
}
