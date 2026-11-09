import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { OrderStatus } from "@prisma/client";

export async function GET(request: Request) {
  try {
    await requireUser("desk");

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date"); // YYYY-MM-DD

    let startOfDay: Date;
    let endOfDay: Date;

    if (dateParam) {
      startOfDay = new Date(`${dateParam}T00:00:00+05:30`);
      endOfDay = new Date(`${dateParam}T23:59:59+05:30`);
    } else {
      const now = new Date();
      startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    }

    // Fetch confirmed or exported orders for this date
    const orders = await prisma.order.findMany({
      where: {
        status: { in: [OrderStatus.CONFIRMED, OrderStatus.EXPORTED] },
        placedAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        retailer: {
          select: { shopName: true, addressLine: true, phone: true },
        },
        lines: {
          include: { sku: true },
        },
      },
    });

    // Group dispatch quantities by SKU
    interface SkuAggregation {
      skuId: string;
      code: string;
      nameEn: string;
      nameHi: string;
      brand: string;
      piecesPerCase: number;
      orderedCases: number;
      freeCases: number;
      totalDispatchCases: number;
      deliveries: Array<{
        orderNo: string;
        shopName: string;
        cases: number;
        free: number;
      }>;
    }

    const skuMap = new Map<string, SkuAggregation>();

    let grandTotalOrdered = 0;
    let grandTotalFree = 0;
    let grandTotalDispatch = 0;

    for (const order of orders) {
      for (const line of order.lines) {
        let agg = skuMap.get(line.skuId);
        if (!agg) {
          agg = {
            skuId: line.skuId,
            code: line.sku.code,
            nameEn: line.sku.nameEn,
            nameHi: line.sku.nameHi,
            brand: line.sku.brand,
            piecesPerCase: line.sku.piecesPerCase,
            orderedCases: 0,
            freeCases: 0,
            totalDispatchCases: 0,
            deliveries: [],
          };
          skuMap.set(line.skuId, agg);
        }

        agg.orderedCases += line.orderedQty;
        agg.freeCases += line.freeQty;
        agg.totalDispatchCases += line.orderedQty + line.freeQty;
        agg.deliveries.push({
          orderNo: order.orderNo,
          shopName: order.retailer.shopName,
          cases: line.orderedQty,
          free: line.freeQty,
        });

        grandTotalOrdered += line.orderedQty;
        grandTotalFree += line.freeQty;
        grandTotalDispatch += line.orderedQty + line.freeQty;
      }
    }

    const skuList = Array.from(skuMap.values()).sort((a, b) =>
      b.totalDispatchCases - a.totalDispatchCases
    );

    return NextResponse.json({
      date: (dateParam || new Date().toISOString().split("T")[0]),
      ordersCount: orders.length,
      grandTotalOrdered,
      grandTotalFree,
      grandTotalDispatch,
      items: skuList,
    });
  } catch (error) {
    console.error("Error in loading list:", error);
    return NextResponse.json({ error: "LOADING_LIST_FAILED" }, { status: 500 });
  }
}
