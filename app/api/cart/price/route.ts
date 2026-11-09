import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { priceCart, CartLineItem } from "@/lib/schemes/engine";
import { calculateCasePricePaise } from "@/lib/money/units";
import { DEMO_PRODUCTS, DEMO_USERS } from "@/lib/db/demo-fallback";

const cartPriceSchema = z.object({
  items: z.array(
    z.object({
      skuId: z.string(),
      qtyCases: z.number().int().min(1),
    })
  ),
});

const DEMO_SKU_CODE_MAP: Record<string, string> = {
  "sku-01": "SKU-BS-075",
  "sku-02": "SKU-DT-1KG",
  "sku-03": "SKU-TE-250",
  "sku-04": "SKU-BS-150",
  "sku-05": "SKU-DT-500",
  "sku-06": "SKU-TE-500",
  "sku-07": "SKU-ND-070",
  "sku-08": "SKU-SP-125",
  "sku-09": "SKU-DW-500",
  "sku-10": "SKU-OL-1L",
};

export async function POST(request: Request) {
  try {
    const session = await requireUser("retailer");
    const retailerId = session.retailerId;
    if (!retailerId) {
      return NextResponse.json({ error: "NO_RETAILER_PROFILE" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = cartPriceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "INVALID_CART_PAYLOAD" }, { status: 400 });
    }

    const { items } = parsed.data;
    if (items.length === 0) {
      return NextResponse.json({
        lines: [],
        totalCases: 0,
        totalFreeCases: 0,
        totalDispatchCases: 0,
        grossPaise: 0,
        discountPaise: 0,
        netPaise: 0,
        gstPaise: 0,
        totalPaise: 0,
        hasStockIssue: false,
        allStockOk: true,
        creditStatus: "OK",
      });
    }

    // 1. Fetch retailer profile with resilient fallback (ID -> Phone -> In-memory demo)
    let retailer: any = null;
    try {
      retailer = await prisma.retailer.findUnique({
        where: { id: retailerId },
        include: { prices: true },
      });

      if (!retailer && session.phone) {
        retailer = await prisma.retailer.findUnique({
          where: { phone: session.phone },
          include: { prices: true },
        });
      }
    } catch (err: any) {
      console.warn("Database unreachable in cart price:", err.message);
    }

    if (!retailer) {
      const demoUser =
        DEMO_USERS[session.phone] ||
        Object.values(DEMO_USERS).find((u) => u.retailerId === retailerId);
      if (demoUser?.retailer) {
        retailer = {
          ...demoUser.retailer,
          prices: [],
        };
      }
    }

    if (!retailer) {
      return NextResponse.json({ error: "RETAILER_NOT_FOUND" }, { status: 404 });
    }

    // 2. Fetch requested SKUs (supporting real CUIDs, codes, and mock demo IDs)
    const skuIds = items.map((i) => i.skuId);
    const mappedCodes = items
      .map((i) => DEMO_SKU_CODE_MAP[i.skuId] || i.skuId)
      .filter(Boolean);

    let skus: any[] = [];
    try {
      skus = await prisma.sku.findMany({
        where: {
          OR: [
            { id: { in: skuIds }, active: true },
            { code: { in: mappedCodes }, active: true },
          ],
        },
        include: {
          schemes: {
            where: {
              activeFrom: { lte: new Date() },
              OR: [{ activeTo: null }, { activeTo: { gte: new Date() } }],
            },
          },
        },
      });
    } catch (err: any) {
      console.warn("Database unreachable for SKUs in cart price:", err.message);
    }

    // If database returned no matches or is unreachable, match from DEMO_PRODUCTS
    if (skus.length === 0) {
      skus = DEMO_PRODUCTS.filter((dp) =>
        items.some(
          (i) =>
            i.skuId === dp.id ||
            i.skuId === dp.code ||
            DEMO_SKU_CODE_MAP[i.skuId] === dp.code
        )
      ).map((dp) => ({
        id: dp.id,
        code: dp.code,
        nameEn: dp.nameEn,
        nameHi: dp.nameHi,
        brand: dp.brand,
        piecesPerCase: dp.piecesPerCase,
        dealerPricePerPiecePaise: dp.dealerPricePerPiecePaise,
        gstRateBp: dp.gstRateBp,
        stockCases: dp.stockCases,
        schemes: dp.scheme
          ? [
              {
                id: `scheme-${dp.id}`,
                kind: dp.scheme.kind,
                configJson: dp.scheme.configJson,
              },
            ]
          : [],
      }));
    }

    // Index SKUs by real ID, SKU code, and demo mock ID
    const skuMap = new Map<string, any>();
    for (const s of skus) {
      skuMap.set(s.id, s);
      skuMap.set(s.code, s);
      // Map demo mock key if matching code
      for (const [demoKey, codeVal] of Object.entries(DEMO_SKU_CODE_MAP)) {
        if (codeVal === s.code) {
          skuMap.set(demoKey, s);
        }
      }
    }

    const priceOverrides: Record<string, number> = {};
    for (const rp of retailer.prices || []) {
      const sku = skuMap.get(rp.skuId);
      if (sku) {
        priceOverrides[rp.skuId] = calculateCasePricePaise(
          rp.pricePerPiecePaise,
          sku.piecesPerCase
        );
      }
    }

    const cartLineItems: CartLineItem[] = [];
    for (const item of items) {
      const sku = skuMap.get(item.skuId) || skuMap.get(DEMO_SKU_CODE_MAP[item.skuId]);
      if (!sku) continue;

      const casePricePaise = calculateCasePricePaise(
        sku.dealerPricePerPiecePaise,
        sku.piecesPerCase
      );

      const activeScheme = sku.schemes?.[0];
      const schemeConfig = activeScheme
        ? (activeScheme.configJson as unknown as CartLineItem["scheme"])
        : { kind: "NONE" as const };

      cartLineItems.push({
        skuId: item.skuId, // keep item.skuId so client cart state key matches 1:1
        skuCode: sku.code,
        qtyCases: item.qtyCases,
        casePricePaise,
        gstRateBp: sku.gstRateBp,
        scheme: schemeConfig,
        availableStockCases: sku.stockCases,
      });
    }

    const priced = priceCart(cartLineItems, priceOverrides);

    const availableCreditPaise = Math.max(
      0,
      retailer.creditLimitPaise - retailer.outstandingPaise
    );
    const exceedsCredit = priced.totalPaise > availableCreditPaise;

    return NextResponse.json({
      ...priced,
      retailer: {
        creditLimitPaise: retailer.creditLimitPaise,
        outstandingPaise: retailer.outstandingPaise,
        availableCreditPaise,
        exceedsCredit,
      },
      creditStatus: exceedsCredit ? "CREDIT_HOLD_PREVIEW" : "OK",
    });
  } catch (error) {
    console.error("Error in cart price:", error);
    return NextResponse.json(
      { error: "CART_PRICE_FAILED", message: "Failed to calculate cart price." },
      { status: 500 }
    );
  }
}

