import { describe, expect, it } from "vitest";
import { isExpired } from "./ttl.js";

describe("isExpired", () => {
  const now = new Date("2026-08-16T12:00:00.000Z");

  it("is false before expiresAt", () => {
    expect(isExpired({ expiresAt: "2026-08-16T12:00:01.000Z" }, now)).toBe(false);
  });

  it("is true exactly at expiresAt", () => {
    expect(isExpired({ expiresAt: "2026-08-16T12:00:00.000Z" }, now)).toBe(true);
  });

  it("is true after expiresAt", () => {
    expect(isExpired({ expiresAt: "2026-08-16T11:59:59.000Z" }, now)).toBe(true);
  });
});
