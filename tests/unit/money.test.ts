import { describe, it, expect } from "vitest";
import {
  rupeesToPaise,
  paiseToRupees,
  roundHalfUp,
  formatINR,
  toBigIntPaise,
  fromBigIntPaise,
} from "@/lib/money/paise";
import { calculateCasePricePaise, piecesToCases } from "@/lib/money/units";

describe("Money Helpers (Paise & INR)", () => {
  it("converts decimal rupees to integer paise accurately", () => {
    expect(rupeesToPaise(8.1)).toBe(810);
    expect(rupeesToPaise(101.5)).toBe(10150);
    expect(rupeesToPaise(118.0)).toBe(11800);
    expect(rupeesToPaise(0)).toBe(0);
    expect(rupeesToPaise(0.01)).toBe(1);
  });

  it("converts integer paise to decimal rupees", () => {
    expect(paiseToRupees(810)).toBe(8.1);
    expect(paiseToRupees(10150)).toBe(101.5);
    expect(paiseToRupees(77760)).toBe(777.6);
  });

  it("applies deterministic half-up rounding (roundHalfUp)", () => {
    expect(roundHalfUp(10.5)).toBe(11);
    expect(roundHalfUp(10.49)).toBe(10);
    expect(roundHalfUp(10.51)).toBe(11);
    expect(roundHalfUp(0.5)).toBe(1);
    expect(roundHalfUp(0.499)).toBe(0);
    expect(roundHalfUp(-10.5)).toBe(-11);
  });

  it("formats currency using Indian numbering system (Lakhs & Crores)", () => {
    expect(formatINR(0)).toBe("₹0.00");
    expect(formatINR(810)).toBe("₹8.10");
    expect(formatINR(77760)).toBe("₹777.60");
    expect(formatINR(203000)).toBe("₹2,030.00");
    expect(formatINR(1015000)).toBe("₹10,150.00");
    expect(formatINR(12345678)).toBe("₹1,23,456.78");
    expect(formatINR(1000000000)).toBe("₹1,00,00,000.00"); // 1 Crore
    expect(formatINR(-50000)).toBe("-₹500.00");
    expect(formatINR(50000, { includeSymbol: false })).toBe("500.00");
    expect(formatINR(50000, { hidePaiseIfZero: true })).toBe("₹500");
  });

  it("converts cleanly across BigInt boundary", () => {
    const bigintVal = toBigIntPaise(1234567890);
    expect(typeof bigintVal).toBe("bigint");
    expect(fromBigIntPaise(bigintVal)).toBe(1234567890);
  });
});

describe("Unit & Case Pricing (Assumption A1 / A-PRICE-UNIT)", () => {
  it("computes exact case prices from the sample brief data", () => {
    // Glucose biscuit 75 g: 8.10 per piece, 96 pieces per case -> ₹777.60
    const biscuitCase = calculateCasePricePaise(rupeesToPaise(8.1), 96);
    expect(biscuitCase).toBe(77760);
    expect(formatINR(biscuitCase)).toBe("₹777.60");

    // Detergent powder 1 kg: 101.50 per piece, 20 pieces per case -> ₹2,030.00
    const detergentCase = calculateCasePricePaise(rupeesToPaise(101.5), 20);
    expect(detergentCase).toBe(203000);
    expect(formatINR(detergentCase)).toBe("₹2,030.00");

    // Tea leaf 250 g: 118.00 per piece, 40 pieces per case -> ₹4,720.00
    const teaCase = calculateCasePricePaise(rupeesToPaise(118.0), 40);
    expect(teaCase).toBe(472000);
    expect(formatINR(teaCase)).toBe("₹4,720.00");
  });

  it("handles piecesToCases divisibility validation", () => {
    // 96 pieces of biscuits = exactly 1 case
    expect(piecesToCases(96, 96)).toEqual({ exact: true, cases: 1, remainder: 0 });
    // 100 pieces of biscuits = 1 case with 4 remainder
    expect(piecesToCases(100, 96)).toEqual({ exact: false, cases: 1, remainder: 4 });
    // 40 pieces of detergent (20/case) = 2 cases
    expect(piecesToCases(40, 20)).toEqual({ exact: true, cases: 2, remainder: 0 });
  });
});

