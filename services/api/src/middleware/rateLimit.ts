import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

// Integration tests exercise many auth/incident flows in quick
// succession against one shared `app` instance (same simulated IP) —
// rate limiting is a production/dev concern, not something the test
// suite should have to work around, same reasoning as the `devOtp`
// exposure gate in authController.
const skipInTest = () => env.NODE_ENV === "test";

/**
 * Spec §27 "rate limiting". `request-otp` in particular costs real money
 * once a real SMS provider is behind it (spec §10) — this limiter exists
 * as much to control that cost as to slow brute-forcing, independent of
 * `MockOtpProvider`'s own per-code attempt cap (defense in depth: this
 * limits by IP before a request even reaches the OTP provider).
 */
export const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: { error: "Too many requests, please try again later" },
});

/** A loose backstop for the rest of the API — not a substitute for the stricter auth limiters above. */
export const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: { error: "Too many requests, please try again later" },
});
