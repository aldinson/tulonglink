import type { AuthSession } from "@tulonglink/shared";
import { getConfig, setConfig, deleteConfig } from "../db/db.js";

const SESSION_KEY = "authSession";

/**
 * Stored in IndexedDB, not localStorage — one storage layer for all
 * offline-capable state, and IndexedDB is not readable by a same-origin
 * script the way localStorage is trivially dumped, which fits spec §27's
 * "secure local storage" requirement a little better. This is not
 * encryption; a compromised device with debugger access can still read
 * it. Full at-rest encryption is a Phase 6 hardening item.
 */
export async function getSession(): Promise<AuthSession | undefined> {
  return getConfig<AuthSession>(SESSION_KEY);
}

export async function setSession(session: AuthSession): Promise<void> {
  await setConfig(SESSION_KEY, session);
}

export async function clearSession(): Promise<void> {
  await deleteConfig(SESSION_KEY);
}

export function isAccessTokenValid(session: AuthSession, now = new Date()): boolean {
  return new Date(session.accessTokenExpiresAt).getTime() > now.getTime();
}

export function isRefreshTokenValid(session: AuthSession, now = new Date()): boolean {
  return new Date(session.refreshTokenExpiresAt).getTime() > now.getTime();
}
