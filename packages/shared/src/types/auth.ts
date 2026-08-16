export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  /** ISO timestamp; client uses this to decide whether it can operate offline-authenticated (§33). */
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
}

export interface AuthSession extends AuthTokens {
  userId: string;
  communityId: string;
  role: import("./user.js").UserRole;
}
