import crypto from "crypto";

export const OTP_EXPIRY_MINUTES = 5;
export const MAX_OTP_ATTEMPTS = 5;

/**
 * Normalizes Indian phone numbers to 10 standard digits.
 * Accepts formats: "90000 00001", "9000000001", "+919000000001", "91-9000000001".
 */
export function normalizePhone(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, "");
  if (digits.length === 10) {
    return digits;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.substring(2);
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.substring(1);
  }
  return digits;
}

/**
 * Validates whether a normalized phone number matches Indian mobile format (10 digits starting with 6-9).
 */
export function isValidPhone(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(phone);
}

/**
 * Generates an OTP. In demo mode or if DEMO_OTP is configured, returns the demo OTP.
 */
export function generateOtp(): string {
  if (process.env.DEMO_OTP) {
    return process.env.DEMO_OTP;
  }
  return "123456";
}

/**
 * Deterministic SHA-256 hash of phone + OTP code.
 * Ensures plain-text OTPs are never stored in the database.
 */
export function hashOtpCode(phone: string, code: string): string {
  return crypto
    .createHash("sha256")
    .update(`${phone}:${code.trim()}`)
    .digest("hex");
}

export interface VerifyOtpResult {
  valid: boolean;
  error?: "EXPIRED" | "MAX_ATTEMPTS_EXCEEDED" | "INVALID_CODE" | "ALREADY_CONSUMED";
}

/**
 * Pure evaluation function for OTP challenge verification.
 */
export function evaluateOtpChallenge(params: {
  inputCode: string;
  phone: string;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  consumedAt: Date | null;
  now?: Date;
}): VerifyOtpResult {
  const { inputCode, phone, codeHash, expiresAt, attempts, consumedAt, now = new Date() } = params;

  if (consumedAt !== null) {
    return { valid: false, error: "ALREADY_CONSUMED" };
  }

  if (attempts >= MAX_OTP_ATTEMPTS) {
    return { valid: false, error: "MAX_ATTEMPTS_EXCEEDED" };
  }

  if (now.getTime() > expiresAt.getTime()) {
    return { valid: false, error: "EXPIRED" };
  }

  const expectedHash = hashOtpCode(phone, inputCode);
  if (expectedHash !== codeHash) {
    return { valid: false, error: "INVALID_CODE" };
  }

  return { valid: true };
}
