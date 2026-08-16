import type { AuthSession } from "@tulonglink/shared";
import { clearSession, getSession, isAccessTokenValid, isRefreshTokenValid, setSession } from "./session.js";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

/** Thrown when the refresh token itself is gone/expired/revoked — the
 * caller must send the resident back to login. Distinct from ApiError so
 * callers can tell "the server said no" apart from "you must sign in
 * again," without inspecting status codes. */
export class SessionExpiredError extends Error {}

async function rawFetch(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
}

async function parseOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ?? `Request failed with status ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function refreshAccessToken(session: AuthSession): Promise<AuthSession> {
  if (!isRefreshTokenValid(session)) {
    await clearSession();
    throw new SessionExpiredError();
  }
  const res = await rawFetch("/api/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken: session.refreshToken }),
  });
  if (!res.ok) {
    await clearSession();
    throw new SessionExpiredError();
  }
  const tokens = await res.json();
  const updated: AuthSession = { ...session, ...tokens };
  await setSession(updated);
  return updated;
}

/**
 * Public network call — no session required (e.g. request-otp,
 * verify-otp, listing communities for registration).
 */
export async function publicFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await rawFetch(path, options);
  return parseOrThrow<T>(res);
}

/** Authenticated call. Transparently refreshes an expired access token
 * once before attaching it; throws SessionExpiredError if the session
 * can't be salvaged. Never touches local emergency data on failure —
 * that's the caller's IndexedDB state, untouched by auth outcomes. */
export async function authedFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  let session = await getSession();
  if (!session) throw new SessionExpiredError();

  if (!isAccessTokenValid(session)) {
    session = await refreshAccessToken(session);
  }

  const res = await rawFetch(path, {
    ...options,
    headers: { Authorization: `Bearer ${session.accessToken}`, ...options.headers },
  });

  if (res.status === 401) {
    // Access token was rejected despite looking unexpired client-side
    // (clock skew, or the device was revoked mid-session) — try one
    // refresh-and-retry before giving up.
    session = await refreshAccessToken(session);
    const retry = await rawFetch(path, {
      ...options,
      headers: { Authorization: `Bearer ${session.accessToken}`, ...options.headers },
    });
    return parseOrThrow<T>(retry);
  }

  return parseOrThrow<T>(res);
}
