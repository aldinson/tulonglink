import type { AuthSession } from "@tulonglink/shared";
import { publicFetch } from "./apiClient.js";
import { clearSession, getSession, setSession } from "./session.js";
import { getOrCreateDeviceId } from "./deviceId.js";

export async function requestOtp(phoneNumber: string): Promise<{ devOtp?: string }> {
  return publicFetch("/api/auth/request-otp", {
    method: "POST",
    body: JSON.stringify({ phoneNumber }),
  });
}

export async function verifyOtp(
  phoneNumber: string,
  code: string,
  communityId: string
): Promise<AuthSession> {
  const deviceId = await getOrCreateDeviceId();
  const result = await publicFetch<{
    userId: string;
    communityId: string;
    role: AuthSession["role"];
    accessToken: string;
    accessTokenExpiresAt: string;
    refreshToken: string;
    refreshTokenExpiresAt: string;
  }>("/api/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ phoneNumber, code, communityId, deviceId }),
  });

  const session: AuthSession = result;
  await setSession(session);
  return session;
}

export async function logout(): Promise<void> {
  await clearSession();
}

/**
 * Whether the app can be opened at all (spec §33: previously
 * authenticated users must not need Internet just to open the app).
 * Deliberately does NOT check token expiry — a device that's been fully
 * offline for weeks should still open to its own cached data. Server
 * calls will separately surface SessionExpiredError when they actually
 * need a live token.
 */
export async function hasLocalSession(): Promise<boolean> {
  return (await getSession()) !== undefined;
}

export async function getCurrentSession(): Promise<AuthSession | undefined> {
  return getSession();
}
