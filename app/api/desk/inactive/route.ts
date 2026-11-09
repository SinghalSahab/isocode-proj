import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";

export async function GET() {
  try {
    await requireUser("desk");

    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400 * 1000);

    // Fetch all retailers with their latest order and assigned salesman
    const retailers = await prisma.retailer.findMany({
      include: {
        salesman: {
          select: { name: true, phone: true },
        },
        orders: {
          orderBy: { placedAt: "desc" },
          take: 1,
          select: {
            id: true,
            orderNo: true,
            placedAt: true,
            totalPaise: true,
          },
        },
      },
      orderBy: { shopName: "asc" },
    });

    const now = Date.now();

    // Filter dormant retailers: either no orders ever placed, or latest order placed > 14 days ago
    const dormantRetailers = retailers
      .map((r) => {
        const latestOrder = r.orders[0] || null;
        let daysSinceLastOrder = 999;
        let isDormant = false;

        if (!latestOrder) {
          isDormant = true;
          daysSinceLastOrder = -1; // never ordered
        } else {
          const orderDate = new Date(latestOrder.placedAt).getTime();
          daysSinceLastOrder = Math.floor((now - orderDate) / (86400 * 1000));
          if (daysSinceLastOrder >= 14) {
            isDormant = true;
          }
        }

        return {
          id: r.id,
          shopName: r.shopName,
          ownerName: r.ownerName,
          phone: r.phone,
          addressLine: r.addressLine,
          city: r.city,
          creditLimitPaise: r.creditLimitPaise,
          outstandingPaise: r.outstandingPaise,
          salesmanName: r.salesman?.name || "Unassigned",
          salesmanPhone: r.salesman?.phone || null,
          latestOrderNo: latestOrder?.orderNo || "None",
          latestOrderDate: latestOrder?.placedAt || null,
          daysSinceLastOrder,
          isDormant,
        };
      })
      .filter((r) => r.isDormant)
      .sort((a, b) => b.daysSinceLastOrder - a.daysSinceLastOrder);

    return NextResponse.json({
      dormantCount: dormantRetailers.length,
      fourteenDaysThresholdDate: fourteenDaysAgo.toISOString(),
      dormantRetailers,
    });
  } catch (error) {
    console.error("Error in inactive retailers:", error);
    return NextResponse.json({ error: "INACTIVE_FETCH_FAILED" }, { status: 500 });
  }
}

