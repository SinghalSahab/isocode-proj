/**
 * Scheme Engine - Pure, deterministic calculation of FMCG wholesale promotional schemes,
 * line-level pricing, GST computation, stock cap bounds, and cart aggregation.
 *
 * Requirements:
 * - Pure function, framework-free, zero database access.
 * - Integer paise precision with roundHalfUp rounding.
 * - Implements FREE_GOODS (repeating buy X get Y free) and SLAB_DISCOUNT (tiered % off line gross).
 * - Implements stock cap calculation: dispatch = ordered + free <= availableStock.
 */

import { roundHalfUp } from "../money/paise";

export type SchemeConfig =
  | {
      kind: "FREE_GOODS";
      buyQty: number;
      freeQty: number;
      repeating?: boolean;
    }
  | {
      kind: "SLAB_DISCOUNT";
      slabs: Array<{
        minQty: number;
        percentBp: number; // basis points (300 = 3%)
      }>;
    }
  | {
      kind: "NONE";
    };

export interface SchemeEngineInput {
  qtyCases: number;
  casePricePaise: number;
  gstRateBp: number;
  scheme: SchemeConfig;
  availableStockCases: number;
}

export interface SchemeHint {
  key: string;
  params: Record<string, string | number>;
}

export interface SchemeEngineOutput {
  orderedQty: number;
  freeQty: number;
  totalDispatchQty: number;
  grossPaise: number;
  discountPaise: number;
  netPaise: number;
  gstPaise: number;
  totalPaise: number;
  appliedSchemeLabel: SchemeHint;
  nextSlabHint: SchemeHint | null;
  stockOk: boolean;
  maxOrderableQty: number;
  warnings: string[];
}

/**
 * Computes bonus free units based on scheme and ordered quantity.
 */
export function computeFreeQty(qtyCases: number, scheme: SchemeConfig): number {
  if (scheme.kind !== "FREE_GOODS" || qtyCases <= 0 || scheme.buyQty <= 0 || scheme.freeQty <= 0) {
    return 0;
  }
  const repeating = scheme.repeating !== false;
  if (repeating) {
    return Math.floor(qtyCases / scheme.buyQty) * scheme.freeQty;
  } else {
    return qtyCases >= scheme.buyQty ? scheme.freeQty : 0;
  }
}

/**
 * Computes maximum orderable quantity that fits within available stock,
 * accounting for promotional free goods consumed by dispatch.
 */
export function computeMaxOrderableQty(
  availableStockCases: number,
  scheme: SchemeConfig
): number {
  if (availableStockCases <= 0) return 0;
  if (scheme.kind !== "FREE_GOODS") return availableStockCases;

  // Binary search for largest q where q + freeQty(q) <= availableStockCases
  let low = 0;
  let high = availableStockCases;
  let best = 0;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const dispatch = mid + computeFreeQty(mid, scheme);
    if (dispatch <= availableStockCases) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return best;
}

/**
 * Evaluates promotional pricing and stock availability for an individual line.
 */
export function evaluateLineScheme(input: SchemeEngineInput): SchemeEngineOutput {
  const { qtyCases, casePricePaise, gstRateBp, scheme, availableStockCases } = input;
  const warnings: string[] = [];

  // Validation
  if (!Number.isInteger(qtyCases) || qtyCases < 0) {
    throw new Error(`Quantity must be a non-negative integer, received ${qtyCases}`);
  }
  if (!Number.isInteger(casePricePaise) || casePricePaise < 0) {
    throw new Error(`Case price must be a non-negative integer in paise, received ${casePricePaise}`);
  }

  // 1. Calculate free goods
  const freeQty = computeFreeQty(qtyCases, scheme);
  const totalDispatchQty = qtyCases + freeQty;

  // 2. Stock calculation
  const maxOrderableQty = computeMaxOrderableQty(availableStockCases, scheme);
  const stockOk = totalDispatchQty <= availableStockCases && qtyCases > 0;

  if (availableStockCases <= 0) {
    warnings.push("ITEM_OUT_OF_STOCK");
  } else if (!stockOk && qtyCases > 0) {
    warnings.push("STOCK_INSUFFICIENT_FOR_DISPATCH");
  }

  // 3. Gross amount (free goods are not charged)
  const grossPaise = qtyCases * casePricePaise;

  // 4. Scheme discount calculation
  let discountPaise = 0;
  let appliedSchemeLabel: SchemeHint = { key: "SCHEME_NONE", params: {} };
  let nextSlabHint: SchemeHint | null = null;

  if (scheme.kind === "FREE_GOODS") {
    if (freeQty > 0) {
      appliedSchemeLabel = {
        key: "SCHEME_FREE_GOODS_APPLIED",
        params: { freeQty, buyQty: scheme.buyQty },
      };
    } else {
      appliedSchemeLabel = {
        key: "SCHEME_FREE_GOODS_TERMS",
        params: { buyQty: scheme.buyQty, freeQty: scheme.freeQty },
      };
    }

    if (qtyCases > 0) {
      const remainingForNext = scheme.buyQty - (qtyCases % scheme.buyQty);
      if (remainingForNext > 0 && remainingForNext < scheme.buyQty) {
        nextSlabHint = {
          key: "HINT_ADD_MORE_FREE",
          params: { needed: remainingForNext, freeQty: scheme.freeQty },
        };
      }
    }
  } else if (scheme.kind === "SLAB_DISCOUNT") {
    // Sort slabs descending by minQty to pick the highest qualifying slab
    const sortedSlabs = [...scheme.slabs].sort((a, b) => b.minQty - a.minQty);
    const qualifyingSlab = sortedSlabs.find((s) => qtyCases >= s.minQty);

    if (qualifyingSlab) {
      // Slab discount applies to the entire line gross
      discountPaise = roundHalfUp((grossPaise * qualifyingSlab.percentBp) / 10000);
      const percentDisplay = qualifyingSlab.percentBp / 100;
      appliedSchemeLabel = {
        key: "SCHEME_SLAB_APPLIED",
        params: { percent: percentDisplay, minQty: qualifyingSlab.minQty },
      };
    } else {
      appliedSchemeLabel = {
        key: "SCHEME_SLAB_TERMS",
        params: {
          percent: sortedSlabs[sortedSlabs.length - 1]?.percentBp / 100 || 0,
          minQty: sortedSlabs[sortedSlabs.length - 1]?.minQty || 0,
        },
      };
    }

    // Find the next slab that is higher than current quantity
    const nextHigherSlab = [...scheme.slabs]
      .sort((a, b) => a.minQty - b.minQty)
      .find((s) => s.minQty > qtyCases);

    if (nextHigherSlab) {
      const needed = nextHigherSlab.minQty - qtyCases;
      nextSlabHint = {
        key: "HINT_ADD_MORE_SLAB",
        params: { needed, percent: nextHigherSlab.percentBp / 100 },
      };
    }
  }

  // 5. Net amount and statutory GST (A4: no GST on free goods)
  const netPaise = grossPaise - discountPaise;
  const gstPaise = roundHalfUp((netPaise * gstRateBp) / 10000);
  const totalPaise = netPaise + gstPaise;

  return {
    orderedQty: qtyCases,
    freeQty,
    totalDispatchQty,
    grossPaise,
    discountPaise,
    netPaise,
    gstPaise,
    totalPaise,
    appliedSchemeLabel,
    nextSlabHint,
    stockOk,
    maxOrderableQty,
    warnings,
  };
}

export interface CartLineItem {
  skuId: string;
  skuCode: string;
  qtyCases: number;
  casePricePaise: number;
  gstRateBp: number;
  scheme: SchemeConfig;
  availableStockCases: number;
}

export interface PricedCartLine extends SchemeEngineOutput {
  skuId: string;
  skuCode: string;
  casePricePaise: number;
}

export interface CartPriceSummary {
  lines: PricedCartLine[];
  totalCases: number;
  totalFreeCases: number;
  totalDispatchCases: number;
  grossPaise: number;
  discountPaise: number;
  netPaise: number;
  gstPaise: number;
  totalPaise: number;
  hasStockIssue: boolean;
  allStockOk: boolean;
}

/**
 * Cart-level pricing function used identically by:
 * (a) Live cart UI
 * (b) Server placeOrder endpoint (re-pricing with authority)
 * (c) Desk order review & edit screen
 */
export function priceCart(
  lines: CartLineItem[],
  priceOverrides?: Record<string, number>
): CartPriceSummary {
  let totalCases = 0;
  let totalFreeCases = 0;
  let totalDispatchCases = 0;
  let grossPaise = 0;
  let discountPaise = 0;
  let netPaise = 0;
  let gstPaise = 0;
  let totalPaise = 0;
  let allStockOk = true;

  const pricedLines: PricedCartLine[] = lines.map((line) => {
    const effectiveCasePrice =
      priceOverrides && priceOverrides[line.skuId] !== undefined
        ? priceOverrides[line.skuId]
        : line.casePricePaise;

    const evaluated = evaluateLineScheme({
      qtyCases: line.qtyCases,
      casePricePaise: effectiveCasePrice,
      gstRateBp: line.gstRateBp,
      scheme: line.scheme,
      availableStockCases: line.availableStockCases,
    });

    totalCases += evaluated.orderedQty;
    totalFreeCases += evaluated.freeQty;
    totalDispatchCases += evaluated.totalDispatchQty;
    grossPaise += evaluated.grossPaise;
    discountPaise += evaluated.discountPaise;
    netPaise += evaluated.netPaise;
    gstPaise += evaluated.gstPaise;
    totalPaise += evaluated.totalPaise;

    if (!evaluated.stockOk && evaluated.orderedQty > 0) {
      allStockOk = false;
    }

    return {
      ...evaluated,
      skuId: line.skuId,
      skuCode: line.skuCode,
      casePricePaise: effectiveCasePrice,
    };
  });

  return {
    lines: pricedLines,
    totalCases,
    totalFreeCases,
    totalDispatchCases,
    grossPaise,
    discountPaise,
    netPaise,
    gstPaise,
    totalPaise,
    hasStockIssue: !allStockOk,
    allStockOk,
  };
}

