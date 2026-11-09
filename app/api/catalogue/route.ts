import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { calculateCasePricePaise } from "@/lib/money/units";

export async function GET() {
  try {
    const session = await requireUser("retailer");
    const retailerId = session.retailerId;

    if (!retailerId) {
      return NextResponse.json({ error: "NO_RETAILER_PROFILE" }, { status: 403 });
    }

    // 1. Fetch retailer profile
    const retailer = await prisma.retailer.findUnique({
      where: { id: retailerId },
      include: {
        prices: true,
      },
    });

    if (!retailer) {
      return NextResponse.json({ error: "RETAILER_NOT_FOUND" }, { status: 404 });
    }

    // Map retailer price overrides
    const priceOverrideMap = new Map(
      retailer.prices.map((p) => [p.skuId, p.pricePerPiecePaise])
    );

    // 2. Fetch all active SKUs with current schemes
    const skus = await prisma.sku.findMany({
      where: { active: true },
      include: {
        schemes: {
          where: {
            activeFrom: { lte: new Date() },
            OR: [{ activeTo: null }, { activeTo: { gte: new Date() } }],
          },
        },
      },
      orderBy: [{ stockCases: "desc" }, { code: "asc" }],
    });

    const products = skus.map((sku) => {
      const overridePiecePaise = priceOverrideMap.get(sku.id);
      const effectivePiecePaise = overridePiecePaise !== undefined ? overridePiecePaise : sku.dealerPricePerPiecePaise;
      const casePricePaise = calculateCasePricePaise(effectivePiecePaise, sku.piecesPerCase);

      const scheme = sku.schemes[0] || null;

      return {
        id: sku.id,
        code: sku.code,
        nameEn: sku.nameEn,
        nameHi: sku.nameHi,
        brand: sku.brand,
        piecesPerCase: sku.piecesPerCase,
        dealerPricePerPiecePaise: effectivePiecePaise,
        hasPriceOverride: overridePiecePaise !== undefined,
        casePricePaise,
        gstRateBp: sku.gstRateBp,
        stockCases: sku.stockCases,
        imageKey: sku.imageKey,
        scheme: scheme
          ? {
              kind: scheme.kind,
              configJson: scheme.configJson,
              labelEn: scheme.labelEn,
              labelHi: scheme.labelHi,
            }
          : null,
      };
    });

    const availableCreditPaise = Math.max(
      0,
      retailer.creditLimitPaise - retailer.outstandingPaise
    );

    return NextResponse.json({
      retailer: {
        id: retailer.id,
        shopName: retailer.shopName,
        ownerName: retailer.ownerName,
        creditLimitPaise: retailer.creditLimitPaise,
        outstandingPaise: retailer.outstandingPaise,
        availableCreditPaise,
      },
      products,
    });
  } catch (error) {
    console.error("Error in catalogue:", error);
    return NextResponse.json(
      { error: "CATALOGUE_FETCH_FAILED", message: "Failed to load catalogue." },
      { status: 500 }
    );
  }
}
