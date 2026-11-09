import { describe, it, expect } from "vitest";
import {
  evaluateLineScheme,
  computeFreeQty,
  computeMaxOrderableQty,
  priceCart,
  type SchemeConfig,
} from "@/lib/schemes/engine";

describe("Scheme Engine: Core Rules & Formulas", () => {
  const detergentScheme: SchemeConfig = {
    kind: "SLAB_DISCOUNT",
    slabs: [{ minQty: 5, percentBp: 300 }], // 3% off 5+
  };

  const biscuitScheme: SchemeConfig = {
    kind: "FREE_GOODS",
    buyQty: 10,
    freeQty: 1,
    repeating: true,
  };

  const teaScheme: SchemeConfig = {
    kind: "NONE",
  };

  it("calculates exact Detergent 1kg slab discount (sample from brief)", () => {
    // 5 cases of Detergent 1kg @ ₹2,030.00/case (203000 paise)
    const result = evaluateLineScheme({
      qtyCases: 5,
      casePricePaise: 203000,
      gstRateBp: 1800,
      scheme: detergentScheme,
      availableStockCases: 85,
    });

    expect(result.orderedQty).toBe(5);
    expect(result.freeQty).toBe(0);
    expect(result.totalDispatchQty).toBe(5);
    // Gross: 5 * 2,030.00 = 10,150.00 (1015000 paise)
    expect(result.grossPaise).toBe(1015000);
    // Discount: 3% of 10,150.00 = 304.50 (30450 paise)
    expect(result.discountPaise).toBe(30450);
    // Net: 10,150.00 - 304.50 = 9,845.50 (984550 paise)
    expect(result.netPaise).toBe(984550);
    // GST (18% on net 9,845.50): 984550 * 18 / 100 = 177219 paise (₹1,772.19)
    expect(result.gstPaise).toBe(177219);
    // Total incl GST: 9,845.50 + 1,772.19 = 11,617.69 (1161769 paise)
    expect(result.totalPaise).toBe(1161769);
    expect(result.stockOk).toBe(true);
    expect(result.nextSlabHint).toBeNull();
  });

  it("handles Detergent below slab threshold with next slab hint", () => {
    // 4 cases of Detergent: no discount, hint to add 1 more case
    const result = evaluateLineScheme({
      qtyCases: 4,
      casePricePaise: 203000,
      gstRateBp: 1800,
      scheme: detergentScheme,
      availableStockCases: 85,
    });

    expect(result.discountPaise).toBe(0);
    expect(result.netPaise).toBe(4 * 203000);
    expect(result.nextSlabHint).toEqual({
      key: "HINT_ADD_MORE_SLAB",
      params: { needed: 1, percent: 3 },
    });
  });

  it("calculates exact Glucose Biscuit free goods tiers (sample from brief)", () => {
    const casePrice = 77760; // ₹777.60

    // 9 cases: 0 free, hint 1 more
    const r9 = evaluateLineScheme({
      qtyCases: 9,
      casePricePaise: casePrice,
      gstRateBp: 1800,
      scheme: biscuitScheme,
      availableStockCases: 340,
    });
    expect(r9.freeQty).toBe(0);
    expect(r9.totalDispatchQty).toBe(9);
    expect(r9.nextSlabHint).toEqual({
      key: "HINT_ADD_MORE_FREE",
      params: { needed: 1, freeQty: 1 },
    });

    // 10 cases: 1 free, dispatch 11, gross = 10 * 77760 = 777600
    const r10 = evaluateLineScheme({
      qtyCases: 10,
      casePricePaise: casePrice,
      gstRateBp: 1800,
      scheme: biscuitScheme,
      availableStockCases: 340,
    });
    expect(r10.freeQty).toBe(1);
    expect(r10.totalDispatchQty).toBe(11);
    expect(r10.grossPaise).toBe(777600);
    expect(r10.discountPaise).toBe(0); // free goods are not a cash discount
    expect(r10.netPaise).toBe(777600);
    expect(r10.gstPaise).toBe(139968); // 18% of 777600
    expect(r10.totalPaise).toBe(777600 + 139968);

    // 11 cases: 1 free, dispatch 12
    const r11 = evaluateLineScheme({
      qtyCases: 11,
      casePricePaise: casePrice,
      gstRateBp: 1800,
      scheme: biscuitScheme,
      availableStockCases: 340,
    });
    expect(r11.freeQty).toBe(1);
    expect(r11.totalDispatchQty).toBe(12);

    // 19 cases: 1 free, hint 1 more for next free
    const r19 = evaluateLineScheme({
      qtyCases: 19,
      casePricePaise: casePrice,
      gstRateBp: 1800,
      scheme: biscuitScheme,
      availableStockCases: 340,
    });
    expect(r19.freeQty).toBe(1);
    expect(r19.totalDispatchQty).toBe(20);
    expect(r19.nextSlabHint).toEqual({
      key: "HINT_ADD_MORE_FREE",
      params: { needed: 1, freeQty: 1 },
    });

    // 20 cases: 2 free, dispatch 22
    const r20 = evaluateLineScheme({
      qtyCases: 20,
      casePricePaise: casePrice,
      gstRateBp: 1800,
      scheme: biscuitScheme,
      availableStockCases: 340,
    });
    expect(r20.freeQty).toBe(2);
    expect(r20.totalDispatchQty).toBe(22);

    // 25 cases: 2 free, dispatch 27
    const r25 = evaluateLineScheme({
      qtyCases: 25,
      casePricePaise: casePrice,
      gstRateBp: 1800,
      scheme: biscuitScheme,
      availableStockCases: 340,
    });
    expect(r25.freeQty).toBe(2);
    expect(r25.totalDispatchQty).toBe(27);
  });

  it("evaluates multi-tier slab discounts with highest qualifying slab selection", () => {
    const multiSlabScheme: SchemeConfig = {
      kind: "SLAB_DISCOUNT",
      slabs: [
        { minQty: 5, percentBp: 200 }, // 2% off 5+
        { minQty: 10, percentBp: 500 }, // 5% off 10+
      ],
    };

    // 4 cases: 0% off, hint 1 more for 2%
    const r4 = evaluateLineScheme({
      qtyCases: 4,
      casePricePaise: 100000,
      gstRateBp: 1800,
      scheme: multiSlabScheme,
      availableStockCases: 50,
    });
    expect(r4.discountPaise).toBe(0);
    expect(r4.nextSlabHint).toEqual({
      key: "HINT_ADD_MORE_SLAB",
      params: { needed: 1, percent: 2 },
    });

    // 7 cases: 2% off, hint 3 more for 5%
    const r7 = evaluateLineScheme({
      qtyCases: 7,
      casePricePaise: 100000,
      gstRateBp: 1800,
      scheme: multiSlabScheme,
      availableStockCases: 50,
    });
    expect(r7.discountPaise).toBe(14000); // 2% of 700000
    expect(r7.nextSlabHint).toEqual({
      key: "HINT_ADD_MORE_SLAB",
      params: { needed: 3, percent: 5 },
    });

    // 12 cases: 5% off, no next slab
    const r12 = evaluateLineScheme({
      qtyCases: 12,
      casePricePaise: 100000,
      gstRateBp: 1800,
      scheme: multiSlabScheme,
      availableStockCases: 50,
    });
    expect(r12.discountPaise).toBe(60000); // 5% of 1200000
    expect(r12.nextSlabHint).toBeNull();
  });

  it("handles out of stock items (Tea leaf with 0 stock)", () => {
    const result = evaluateLineScheme({
      qtyCases: 1,
      casePricePaise: 472000,
      gstRateBp: 500,
      scheme: teaScheme,
      availableStockCases: 0,
    });

    expect(result.stockOk).toBe(false);
    expect(result.maxOrderableQty).toBe(0);
    expect(result.warnings).toContain("ITEM_OUT_OF_STOCK");
  });

  it("calculates exact stock cap search when free goods consume stock", () => {
    // If available stock is 10 cases, and scheme is Buy 10 Get 1 Free:
    // If user orders 10 cases, dispatch is 10 + 1 = 11 > 10.
    // So 10 cases CANNOT be fulfilled! maxOrderableQty must be 9!
    const maxWhen10 = computeMaxOrderableQty(10, biscuitScheme);
    expect(maxWhen10).toBe(9);

    // If available stock is 11 cases:
    // Order 10 -> dispatch 11 <= 11 -> fits!
    const maxWhen11 = computeMaxOrderableQty(11, biscuitScheme);
    expect(maxWhen11).toBe(10);

    // If available stock is 21 cases:
    // Order 20 -> dispatch 22 > 21 -> doesn't fit. maxOrderable is 19!
    const maxWhen21 = computeMaxOrderableQty(21, biscuitScheme);
    expect(maxWhen21).toBe(19);
  });

  it("rejects invalid inputs", () => {
    expect(() =>
      evaluateLineScheme({
        qtyCases: -1,
        casePricePaise: 1000,
        gstRateBp: 1800,
        scheme: teaScheme,
        availableStockCases: 10,
      })
    ).toThrow();

    expect(() =>
      evaluateLineScheme({
        qtyCases: 1.5,
        casePricePaise: 1000,
        gstRateBp: 1800,
        scheme: teaScheme,
        availableStockCases: 10,
      })
    ).toThrow();
  });
});

describe("priceCart Parity & Aggregation", () => {
  it("prices a multi-item cart matching exact manual sum", () => {
    const lines = [
      {
        skuId: "sku-1",
        skuCode: "SKU-BS-075",
        qtyCases: 10,
        casePricePaise: 77760,
        gstRateBp: 1800,
        scheme: {
          kind: "FREE_GOODS" as const,
          buyQty: 10,
          freeQty: 1,
        },
        availableStockCases: 340,
      },
      {
        skuId: "sku-2",
        skuCode: "SKU-DT-1KG",
        qtyCases: 5,
        casePricePaise: 203000,
        gstRateBp: 1800,
        scheme: {
          kind: "SLAB_DISCOUNT" as const,
          slabs: [{ minQty: 5, percentBp: 300 }],
        },
        availableStockCases: 85,
      },
    ];

    const cart = priceCart(lines);

    expect(cart.totalCases).toBe(15);
    expect(cart.totalFreeCases).toBe(1);
    expect(cart.totalDispatchCases).toBe(16);

    // Biscuit: gross 777600, discount 0, net 777600, gst 139968, total 917568
    // Detergent: gross 1015000, discount 30450, net 984550, gst 177219, total 1161769
    expect(cart.grossPaise).toBe(777600 + 1015000);
    expect(cart.discountPaise).toBe(30450);
    expect(cart.netPaise).toBe(777600 + 984550);
    expect(cart.gstPaise).toBe(139968 + 177219);
    expect(cart.totalPaise).toBe(917568 + 1161769);
    expect(cart.allStockOk).toBe(true);
    expect(cart.hasStockIssue).toBe(false);
  });

  it("applies per-retailer price override seamlessly", () => {
    const lines = [
      {
        skuId: "sku-biscuit",
        skuCode: "SKU-BS-075",
        qtyCases: 1,
        casePricePaise: 77760, // normal ₹777.60
        gstRateBp: 1800,
        scheme: { kind: "NONE" as const },
        availableStockCases: 100,
      },
    ];

    // Price override for Mahalaxmi Super Mart: ₹7.80/piece -> 780 * 96 = 74880 paise (₹748.80)
    const overrides = {
      "sku-biscuit": 74880,
    };

    const cart = priceCart(lines, overrides);
    expect(cart.grossPaise).toBe(74880);
    expect(cart.lines[0].casePricePaise).toBe(74880);
  });
});

