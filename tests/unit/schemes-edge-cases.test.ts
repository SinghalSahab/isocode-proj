import { describe, it, expect } from "vitest";
import {
  evaluateLineScheme,
  computeFreeQty,
  computeMaxOrderableQty,
  priceCart,
  type SchemeConfig,
} from "@/lib/schemes/engine";

describe("Scheme Engine Edge Cases & Boundary Conditions (lib/schemes/engine.ts)", () => {
  const freeGoodsScheme: SchemeConfig = {
    kind: "FREE_GOODS",
    buyQty: 10,
    freeQty: 1,
    repeating: true,
  };

  const tieredSlabScheme: SchemeConfig = {
    kind: "SLAB_DISCOUNT",
    slabs: [
      { minQty: 20, percentBp: 800 },
      { minQty: 10, percentBp: 500 },
      { minQty: 5, percentBp: 300 },
    ],
  };

  describe("Analytical Stock-Cap Binary Search Boundaries", () => {
    it("handles zero available stock correctly", () => {
      const maxOrderable = computeMaxOrderableQty(0, freeGoodsScheme);
      expect(maxOrderable).toBe(0);

      const result = evaluateLineScheme({
        qtyCases: 0,
        casePricePaise: 10000,
        gstRateBp: 1800,
        scheme: freeGoodsScheme,
        availableStockCases: 0,
      });
      expect(result.maxOrderableQty).toBe(0);
      expect(result.totalDispatchQty).toBe(0);
    });

    it("correctly restricts orderable qty when stock exactly equals threshold", () => {
      // Stock = 10 cases. If retailer orders 10, free goods = 1, total dispatch = 11 > 10.
      // Therefore, max orderable cases MUST be 9 (9 ordered + 0 free = 9 <= 10).
      const maxOrderable = computeMaxOrderableQty(10, freeGoodsScheme);
      expect(maxOrderable).toBe(9);
    });

    it("allows full qualifying order when stock equals threshold + bonus", () => {
      // Stock = 11 cases. Ordering 10 cases triggers 1 free bonus -> total dispatch = 11 <= 11.
      // So max orderable cases = 10.
      const maxOrderable = computeMaxOrderableQty(11, freeGoodsScheme);
      expect(maxOrderable).toBe(10);
    });

    it("handles very large stock quantities without performance degradation", () => {
      const stock = 1_000_000;
      const start = performance.now();
      const maxOrderable = computeMaxOrderableQty(stock, freeGoodsScheme);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(20); // Under 20ms (O(log S))
      // Check that dispatch <= stock
      const free = computeFreeQty(maxOrderable, freeGoodsScheme);
      expect(maxOrderable + free).toBeLessThanOrEqual(stock);
      // Check that maxOrderable + 1 would exceed stock
      const nextFree = computeFreeQty(maxOrderable + 1, freeGoodsScheme);
      expect(maxOrderable + 1 + nextFree).toBeGreaterThan(stock);
    });

    it("allows full stock when scheme has no bonus goods (NONE)", () => {
      const noneScheme: SchemeConfig = { kind: "NONE" };
      expect(computeMaxOrderableQty(45, noneScheme)).toBe(45);
    });

    it("allows full stock for SLAB_DISCOUNT schemes (no free stock consumption)", () => {
      expect(computeMaxOrderableQty(50, tieredSlabScheme)).toBe(50);
    });
  });

  describe("Multi-Tier Slab Discount Navigation & Nudges", () => {
    const casePricePaise = 200000; // ₹2,000.00
    const gstRateBp = 1800; // 18%

    it("applies 0% discount below first tier (qty = 4)", () => {
      const result = evaluateLineScheme({
        qtyCases: 4,
        casePricePaise,
        gstRateBp,
        scheme: tieredSlabScheme,
        availableStockCases: 100,
      });
      expect(result.discountPaise).toBe(0);
      expect(result.nextSlabHint).not.toBeNull();
      expect(result.nextSlabHint?.params.needed).toBe(1);
      expect(result.nextSlabHint?.params.percent).toBe(3);
    });

    it("applies first tier discount (3%) at qty = 5", () => {
      const result = evaluateLineScheme({
        qtyCases: 5,
        casePricePaise,
        gstRateBp,
        scheme: tieredSlabScheme,
        availableStockCases: 100,
      });
      // Gross = 5 * 200000 = 1,000,000 paise (₹10,000). 3% = 30,000 paise (₹300).
      expect(result.discountPaise).toBe(30000);
      expect(result.netPaise).toBe(970000);
      expect(result.nextSlabHint).not.toBeNull();
      expect(result.nextSlabHint?.params.needed).toBe(5);
      expect(result.nextSlabHint?.params.percent).toBe(5);
    });

    it("applies second tier discount (5%) at qty = 10", () => {
      const result = evaluateLineScheme({
        qtyCases: 10,
        casePricePaise,
        gstRateBp,
        scheme: tieredSlabScheme,
        availableStockCases: 100,
      });
      // Gross = 10 * 200000 = 2,000,000 paise (₹20,000). 5% = 100,000 paise (₹1,000).
      expect(result.discountPaise).toBe(100000);
      expect(result.netPaise).toBe(1900000);
      expect(result.nextSlabHint).not.toBeNull();
      expect(result.nextSlabHint?.params.needed).toBe(10);
      expect(result.nextSlabHint?.params.percent).toBe(8);
    });

    it("applies top tier discount (8%) at qty = 20 with no further nudges", () => {
      const result = evaluateLineScheme({
        qtyCases: 20,
        casePricePaise,
        gstRateBp,
        scheme: tieredSlabScheme,
        availableStockCases: 100,
      });
      // Gross = 20 * 200000 = 4,000,000 paise (₹40,000). 8% = 320,000 paise (₹3,200).
      expect(result.discountPaise).toBe(320000);
      expect(result.netPaise).toBe(3680000);
      expect(result.nextSlabHint).toBeNull();
    });
  });

  describe("Cart Level Edge Cases", () => {
    it("prices an empty cart with exact zero paise", () => {
      const cart = priceCart([]);
      expect(cart.grossPaise).toBe(0);
      expect(cart.discountPaise).toBe(0);
      expect(cart.gstPaise).toBe(0);
      expect(cart.totalPaise).toBe(0);
      expect(cart.lines).toHaveLength(0);
    });

    it("correctly aggregates multiple items with mixed tax rates and schemes", () => {
      const cart = priceCart([
        {
          skuId: "sku-1",
          skuCode: "SKU-BS-075",
          casePricePaise: 77760,
          gstRateBp: 1800,
          qtyCases: 10,
          scheme: freeGoodsScheme,
          availableStockCases: 100,
        },
        {
          skuId: "sku-2",
          skuCode: "SKU-DT-1KG",
          casePricePaise: 203000,
          gstRateBp: 1800,
          qtyCases: 5,
          scheme: tieredSlabScheme,
          availableStockCases: 50,
        },
      ]);

      expect(cart.grossPaise).toBe(777600 + 1015000);
      expect(cart.discountPaise).toBe(30450); // 3% of detergent gross
      expect(cart.totalPaise).toBe(cart.netPaise + cart.gstPaise);
    });
  });
});
