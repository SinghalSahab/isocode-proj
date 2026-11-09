import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { priceCart, CartLineItem } from "@/lib/schemes/engine";
import { calculateCasePricePaise } from "@/lib/money/units";

const cartPriceSchema = z.object({
  items: z.array(
    z.object({
      skuId: z.string(),
      qtyCases: z.number().int().min(1),
    })
  ),
});

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

    const retailer = await prisma.retailer.findUnique({
      where: { id: retailerId },
      include: { prices: true },
    });

    if (!retailer) {
      return NextResponse.json({ error: "RETAILER_NOT_FOUND" }, { status: 404 });
    }

    const skuIds = items.map((i) => i.skuId);
    const skus = await prisma.sku.findMany({
      where: { id: { in: skuIds }, active: true },
      include: {
        schemes: {
          where: {
            activeFrom: { lte: new Date() },
            OR: [{ activeTo: null }, { activeTo: { gte: new Date() } }],
          },
        },
      },
    });

    const skuMap = new Map(skus.map((s) => [s.id, s]));

    const priceOverrides: Record<string, number> = {};
    for (const rp of retailer.prices) {
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
      const sku = skuMap.get(item.skuId);
      if (!sku) continue;

      const casePricePaise = calculateCasePricePaise(
        sku.dealerPricePerPiecePaise,
        sku.piecesPerCase
      );

      const activeScheme = sku.schemes[0];
      const schemeConfig = activeScheme
        ? (activeScheme.configJson as unknown as CartLineItem["scheme"])
        : { kind: "NONE" as const };

      cartLineItems.push({
        skuId: sku.id,
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

