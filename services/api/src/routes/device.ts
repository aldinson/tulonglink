import { Router } from "express";
import { listDevices, revokeDevice } from "../controllers/deviceController.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

export const deviceRouter = Router();

deviceRouter.use(requireAuth, requireRole(["ADMIN"]));
deviceRouter.get("/", asyncHandler(listDevices));
deviceRouter.post("/:deviceId/revoke", asyncHandler(revokeDevice));
