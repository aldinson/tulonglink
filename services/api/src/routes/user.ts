import { Router } from "express";
import { getMe } from "../controllers/userController.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

export const userRouter = Router();

userRouter.get("/me", requireAuth, asyncHandler(getMe));
