/**
 * Spec §10: the OTP provider must be swappable, and no production SMS
 * provider is hard-coded into core auth logic. Milestone 1 ships only
 * the mock — a real provider (e.g. Twilio, Semaphore for PH numbers)
 * plugs in later by implementing this same interface and swapping it in
 * authController's construction, with no changes to the auth flow itself.
 */
export interface OtpProvider {
  requestOtp(phoneNumber: string): Promise<void>;
  verifyOtp(phoneNumber: string, code: string): Promise<boolean>;
}

const OTP_TTL_MS = 5 * 60 * 1000;
const CODE_LENGTH = 6;

interface PendingOtp {
  code: string;
  expiresAt: number;
}

/**
 * In-memory, single-process only — acceptable for local dev and the
 * single-container Raspberry Pi deployment target, but will not work
 * across multiple API replicas. A production provider (external SMS
 * service) sidesteps this entirely since it doesn't need shared state.
 */
export class MockOtpProvider implements OtpProvider {
  private pending = new Map<string, PendingOtp>();

  async requestOtp(phoneNumber: string): Promise<void> {
    const code = Math.floor(Math.random() * 10 ** CODE_LENGTH)
      .toString()
      .padStart(CODE_LENGTH, "0");
    this.pending.set(phoneNumber, { code, expiresAt: Date.now() + OTP_TTL_MS });
    // eslint-disable-next-line no-console
    console.log(`[MockOtpProvider] OTP for ${phoneNumber}: ${code}`);
  }

  async verifyOtp(phoneNumber: string, code: string): Promise<boolean> {
    const entry = this.pending.get(phoneNumber);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.pending.delete(phoneNumber);
      return false;
    }
    const matches = entry.code === code;
    if (matches) this.pending.delete(phoneNumber);
    return matches;
  }

  /**
   * Dev-only escape hatch so local frontend work doesn't require tailing
   * server logs. Not part of the OtpProvider interface — a real provider
   * has no equivalent, and authController only calls this behind a
   * non-production environment check.
   */
  peekCode(phoneNumber: string): string | null {
    return this.pending.get(phoneNumber)?.code ?? null;
  }
}
