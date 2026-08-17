import { Router } from "express";
import { requestOtpSchema, verifyOtpSchema, refreshSchema } from "@tulonglink/shared";
import { requestOtp, verifyOtp, refresh, logout } from "../controllers/authController.js";
import { validateBody } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { otpRateLimiter } from "../middleware/rateLimit.js";

export const authRouter = Router();

authRouter.post("/request-otp", otpRateLimiter, validateBody(requestOtpSchema), asyncHandler(requestOtp));
authRouter.post("/verify-otp", otpRateLimiter, validateBody(verifyOtpSchema), asyncHandler(verifyOtp));
authRouter.post("/refresh", validateBody(refreshSchema), asyncHandler(refresh));
authRouter.post("/logout", asyncHandler(logout));
