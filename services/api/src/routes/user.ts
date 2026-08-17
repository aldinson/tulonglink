import { Router } from "express";
import { getMe, listStaff } from "../controllers/userController.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

export const userRouter = Router();

userRouter.get("/me", requireAuth, asyncHandler(getMe));
userRouter.get("/staff", requireAuth, requireRole(["STAFF", "ADMIN"]), asyncHandler(listStaff));
