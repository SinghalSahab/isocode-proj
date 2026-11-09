import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { ScopedDataAccess } from "@/lib/db/scoped";

export async function GET() {
  try {
    const session = await requireUser("retailer");
    const scoped = new ScopedDataAccess(session);

    // Find the latest order for this retailer
    const lastOrder = await prisma.order.findFirst({
      where: scoped.scopeOrderWhere({
        status: { in: ["CONFIRMED", "EXPORTED", "PENDING_REVIEW"] },
      }),
      orderBy: { placedAt: "desc" },
      include: {
        lines: {
          include: {
            sku: true,
          },
        },
      },
    });

    if (!lastOrder) {
      return NextResponse.json(
        { error: "NO_PRIOR_ORDER", message: "No previous order found to repeat." },
        { status: 404 }
      );
    }

    const items = lastOrder.lines.map((line) => ({
      skuId: line.skuId,
      skuCode: line.sku.code,
      nameEn: line.sku.nameEn,
      nameHi: line.sku.nameHi,
      qtyCases: line.orderedQty,
      currentStock: line.sku.stockCases,
      isAvailable: line.sku.stockCases > 0 && line.sku.active,
    }));

    return NextResponse.json({
      orderNo: lastOrder.orderNo,
      items,
    });
  } catch (error) {
    console.error("Error in repeat last order:", error);
    return NextResponse.json(
      { error: "REPEAT_FETCH_FAILED", message: "Failed to repeat order." },
      { status: 500 }
    );
  }
}

