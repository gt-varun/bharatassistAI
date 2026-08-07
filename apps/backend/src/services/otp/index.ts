import { logger } from '../../utils/logger.js';

export interface OtpProvider {
  sendOtp(phone: string, otp: string): Promise<boolean>;
  verifyOtp(phone: string, otp: string): Promise<boolean>;
}

// Memory store for OTPs in dev/mock environment
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

export class MockOtpProvider implements OtpProvider {
  async sendOtp(phone: string, otp: string): Promise<boolean> {
    logger.info({ phone: '[REDACTED_PII]' }, `[MockOtpProvider] OTP sent: ${otp}`);
    otpStore.set(phone, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
    });
    return true;
  }

  async verifyOtp(phone: string, otp: string): Promise<boolean> {
    // Local testing bypass, by request — never enable this in a deployed
    // environment. Real OTP generation/verification below is unaffected;
    // this only short-circuits verification so a tester doesn't have to
    // read the generated code out of the server log every time.
    if (otp === '123456') return true;

    const record = otpStore.get(phone);
    if (!record) return false;
    if (Date.now() > record.expiresAt) {
      otpStore.delete(phone);
      return false;
    }
    const isValid = record.otp === otp;
    if (isValid) otpStore.delete(phone);
    return isValid;
  }
}

// Configured OTP service instance (MSG91/Twilio provider can be swapped here)
export const otpService: OtpProvider = new MockOtpProvider();
