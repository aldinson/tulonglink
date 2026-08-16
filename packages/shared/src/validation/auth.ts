import { z } from "zod";

/** E.164-ish: leading +, 8-15 digits. Deliberately loose — real carrier
 * validation belongs to the OTP provider, not this schema. */
const phoneNumber = z.string().regex(/^\+[1-9]\d{7,14}$/, "Phone number must be in E.164 format, e.g. +639171234567");

export const requestOtpSchema = z.object({
  phoneNumber,
});

export const verifyOtpSchema = z.object({
  phoneNumber,
  code: z.string().length(6),
  communityId: z.string().min(1),
  deviceId: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
