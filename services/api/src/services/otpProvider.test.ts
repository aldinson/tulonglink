import { describe, expect, it, vi } from "vitest";
import { MockOtpProvider } from "./otpProvider.js";

describe("MockOtpProvider", () => {
  it("verifies a code that was just requested", async () => {
    const provider = new MockOtpProvider();
    await provider.requestOtp("+639171234567");
    const code = provider.peekCode("+639171234567");
    expect(code).toMatch(/^\d{6}$/);
    await expect(provider.verifyOtp("+639171234567", code!)).resolves.toBe(true);
  });

  it("rejects an incorrect code", async () => {
    const provider = new MockOtpProvider();
    await provider.requestOtp("+639171234567");
    await expect(provider.verifyOtp("+639171234567", "000000")).resolves.toBe(false);
  });

  it("rejects verifying a number that never requested a code", async () => {
    const provider = new MockOtpProvider();
    await expect(provider.verifyOtp("+639170000000", "123456")).resolves.toBe(false);
  });

  it("consumes the code so it cannot be reused", async () => {
    const provider = new MockOtpProvider();
    await provider.requestOtp("+639171234567");
    const code = provider.peekCode("+639171234567")!;
    await expect(provider.verifyOtp("+639171234567", code)).resolves.toBe(true);
    await expect(provider.verifyOtp("+639171234567", code)).resolves.toBe(false);
  });

  it("invalidates the code after 5 incorrect attempts, even if the 6th guess is correct", async () => {
    const provider = new MockOtpProvider();
    await provider.requestOtp("+639171234567");
    const code = provider.peekCode("+639171234567")!;

    for (let i = 0; i < 5; i++) {
      await expect(provider.verifyOtp("+639171234567", "000000")).resolves.toBe(false);
    }
    await expect(provider.verifyOtp("+639171234567", code)).resolves.toBe(false);
  });

  it("rejects an expired code", async () => {
    vi.useFakeTimers();
    try {
      const provider = new MockOtpProvider();
      await provider.requestOtp("+639171234567");
      const code = provider.peekCode("+639171234567")!;
      vi.advanceTimersByTime(6 * 60 * 1000);
      await expect(provider.verifyOtp("+639171234567", code)).resolves.toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
