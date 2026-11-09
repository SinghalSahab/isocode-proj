import { describe, it, expect } from "vitest";
import {
  normalizePhone,
  isValidPhone,
  hashOtpCode,
  evaluateOtpChallenge,
  MAX_OTP_ATTEMPTS,
} from "@/lib/auth/otp";
import { signSession, verifySession } from "@/lib/auth/session";
import { ScopedDataAccess } from "@/lib/db/scoped";
import { Role } from "@prisma/client";

describe("Phone Normalization & Validation", () => {
  it("normalizes diverse Indian mobile phone input styles", () => {
    expect(normalizePhone("9000000001")).toBe("9000000001");
    expect(normalizePhone("90000 00001")).toBe("9000000001");
    expect(normalizePhone("+91 90000 00001")).toBe("9000000001");
    expect(normalizePhone("91-90000-00001")).toBe("9000000001");
    expect(normalizePhone("09000000001")).toBe("9000000001");
  });

  it("validates 10-digit Indian mobile numbers", () => {
    expect(isValidPhone("9000000001")).toBe(true);
    expect(isValidPhone("8123456789")).toBe(true);
    expect(isValidPhone("7987654321")).toBe(true);
    expect(isValidPhone("6123456789")).toBe(true);
    // Invalid: begins with 1-5 or wrong length
    expect(isValidPhone("1234567890")).toBe(false);
    expect(isValidPhone("90000")).toBe(false);
    expect(isValidPhone("90000000001")).toBe(false);
  });
});

describe("OTP Verification Lifecycle", () => {
  const phone = "9000000001";
  const code = "123456";
  const codeHash = hashOtpCode(phone, code);
  const now = new Date("2026-11-09T10:00:00Z");
  const expiresAt = new Date("2026-11-09T10:05:00Z"); // 5 mins later

  it("verifies matching OTP within expiry", () => {
    const result = evaluateOtpChallenge({
      inputCode: "123456",
      phone,
      codeHash,
      expiresAt,
      attempts: 0,
      consumedAt: null,
      now,
    });
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("rejects wrong OTP code", () => {
    const result = evaluateOtpChallenge({
      inputCode: "999999",
      phone,
      codeHash,
      expiresAt,
      attempts: 1,
      consumedAt: null,
      now,
    });
    expect(result.valid).toBe(false);
    expect(result.error).toBe("INVALID_CODE");
  });

  it("rejects expired OTP", () => {
    const expiredNow = new Date("2026-11-09T10:06:00Z"); // 6 mins later
    const result = evaluateOtpChallenge({
      inputCode: "123456",
      phone,
      codeHash,
      expiresAt,
      attempts: 0,
      consumedAt: null,
      now: expiredNow,
    });
    expect(result.valid).toBe(false);
    expect(result.error).toBe("EXPIRED");
  });

  it("rejects challenge after maximum 5 attempts", () => {
    const result = evaluateOtpChallenge({
      inputCode: "123456",
      phone,
      codeHash,
      expiresAt,
      attempts: MAX_OTP_ATTEMPTS,
      consumedAt: null,
      now,
    });
    expect(result.valid).toBe(false);
    expect(result.error).toBe("MAX_ATTEMPTS_EXCEEDED");
  });

  it("rejects already consumed OTP challenge", () => {
    const result = evaluateOtpChallenge({
      inputCode: "123456",
      phone,
      codeHash,
      expiresAt,
      attempts: 1,
      consumedAt: new Date("2026-11-09T10:01:00Z"),
      now,
    });
    expect(result.valid).toBe(false);
    expect(result.error).toBe("ALREADY_CONSUMED");
  });
});

describe("JWT Sessions & Access Control", () => {
  it("signs and verifies session tokens via jose", async () => {
    const payload = {
      userId: "user-123",
      phone: "9000000001",
      role: Role.retailer,
      retailerId: "ret-123",
      name: "Ramesh Gupta",
      preferredLang: "hi",
    };

    const token = await signSession(payload);
    expect(typeof token).toBe("string");

    const verified = await verifySession(token);
    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe(payload.userId);
    expect(verified?.phone).toBe(payload.phone);
    expect(verified?.role).toBe(Role.retailer);
    expect(verified?.retailerId).toBe(payload.retailerId);
  });

  it("rejects tampered or forged JWT tokens", async () => {
    const payload = {
      userId: "user-123",
      phone: "9000000001",
      role: Role.retailer,
      retailerId: "ret-123",
      name: "Ramesh Gupta",
      preferredLang: "hi",
    };
    const token = await signSession(payload);
    const tampered = token.slice(0, -6) + "abcdef";
    const result = await verifySession(tampered);
    expect(result).toBeNull();
  });
});

describe("IDOR Protection & Query Scoping", () => {
  const retailerSession = {
    userId: "user-ret-1",
    phone: "9000000001",
    role: Role.retailer,
    retailerId: "ret-001",
    name: "Gupta Kirana",
    preferredLang: "hi",
  };

  it("automatically attaches retailerId to where clause", () => {
    const scoped = new ScopedDataAccess(retailerSession);
    const where = scoped.scopeOrderWhere({ status: "PENDING_REVIEW" });
    expect(where).toEqual({
      status: "PENDING_REVIEW",
      retailerId: "ret-001",
    });
  });

  it("throws IDOR_VIOLATION when retailer attempts to access another store data", () => {
    const scoped = new ScopedDataAccess(retailerSession);
    expect(() => scoped.assertRetailerMatch("ret-001")).not.toThrow();
    expect(() => scoped.assertRetailerMatch("ret-002")).toThrow(/IDOR_VIOLATION/);
  });

  it("blocks non-retailer role from calling retailer scoped query", () => {
    const deskSession = {
      userId: "user-desk-1",
      phone: "9000000010",
      role: Role.desk,
      retailerId: null,
      name: "Amit Desk",
      preferredLang: "en",
    };
    const scoped = new ScopedDataAccess(deskSession);
    expect(() => scoped.getRetailerId()).toThrow(/UNAUTHORIZED_RETAILER_ACCESS/);
  });
});

