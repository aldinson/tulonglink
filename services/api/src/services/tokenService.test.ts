import { describe, expect, it } from "vitest";
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "./tokenService.js";

describe("tokenService", () => {
  it("round-trips an access token", () => {
    const { token } = signAccessToken({
      userId: "U1",
      communityId: "demo-community",
      role: "RESIDENT",
      deviceId: "D1",
    });
    const claims = verifyAccessToken(token);
    expect(claims.userId).toBe("U1");
    expect(claims.communityId).toBe("demo-community");
    expect(claims.role).toBe("RESIDENT");
    expect(claims.deviceId).toBe("D1");
  });

  it("round-trips a refresh token", () => {
    const { token } = signRefreshToken({ userId: "U1", deviceId: "D1" });
    const claims = verifyRefreshToken(token);
    expect(claims.userId).toBe("U1");
    expect(claims.deviceId).toBe("D1");
  });

  it("rejects a refresh token when verified as an access token", () => {
    const { token } = signRefreshToken({ userId: "U1", deviceId: "D1" });
    expect(() => verifyAccessToken(token)).toThrow();
  });

  it("rejects a tampered token", () => {
    const { token } = signAccessToken({
      userId: "U1",
      communityId: "demo-community",
      role: "RESIDENT",
      deviceId: "D1",
    });
    const tampered = token.slice(0, -1) + (token.endsWith("a") ? "b" : "a");
    expect(() => verifyAccessToken(tampered)).toThrow();
  });
});
