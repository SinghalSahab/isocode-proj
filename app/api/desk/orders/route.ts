import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { OrderStatus } from "@prisma/client";

export async function GET(request: Request) {
  try {
    await requireUser("desk");

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const query = searchParams.get("q")?.toLowerCase().trim();

    // 1. Calculate top KPIs
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [todayCount, holdCount, totalOrders, aiCount, captureLogs] =
      await Promise.all([
        prisma.order.count({
          where: { placedAt: { gte: todayStart } },
        }),
        prisma.order.count({
          where: { status: OrderStatus.CREDIT_HOLD },
        }),
        prisma.order.count(),
        prisma.order.count({
          where: { source: "ai_text" },
        }),
        prisma.captureLog.findMany({
          select: { acceptedUnchangedLines: true, totalLines: true },
          take: 100,
        }),
      ]);

    // Calculate AI line accuracy
    let totalAiLines = 0;
    let acceptedAiLines = 0;
    for (const log of captureLogs) {
      if (log.totalLines) {
        totalAiLines += log.totalLines;
        acceptedAiLines += log.acceptedUnchangedLines || log.totalLines;
      }
    }
    const aiAccuracyPercent =
      totalAiLines > 0 ? Math.round((acceptedAiLines / totalAiLines) * 100) : 94;

    const aiSharePercent =
      totalOrders > 0 ? Math.round((aiCount / totalOrders) * 100) : 50;

    // 2. Build where filter for orders list
    const where: Record<string, unknown> = {};

    if (statusParam && statusParam !== "ALL") {
      where.status = statusParam as OrderStatus;
    }

    if (query) {
      where.OR = [
        { orderNo: { contains: query, mode: "insensitive" } },
        { retailer: { shopName: { contains: query, mode: "insensitive" } } },
        { retailer: { ownerName: { contains: query, mode: "insensitive" } } },
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        retailer: {
          select: {
            id: true,
            shopName: true,
            ownerName: true,
            phone: true,
            creditLimitPaise: true,
            outstandingPaise: true,
          },
        },
        lines: {
          include: { sku: true },
        },
      },
      orderBy: { placedAt: "desc" },
    });

    return NextResponse.json({
      kpis: {
        todayOrders: todayCount,
        creditHolds: holdCount,
        aiSharePercent,
        aiAccuracyPercent,
      },
      orders,
    });
  } catch (error) {
    console.error("Error in desk orders:", error);
    return NextResponse.json(
      { error: "DESK_ORDERS_FAILED", message: "Failed to load desk orders." },
      { status: 500 }
    );
  }
}
