import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { placeOrder } from "@/lib/orders/placement";
import { ScopedDataAccess } from "@/lib/db/scoped";
import { OrderSource } from "@prisma/client";

const createOrderSchema = z.object({
  idempotencyKey: z.string().min(8),
  source: z.enum(["app", "ai_text", "repeat"]).default("app"),
  captureId: z.string().optional(),
  lines: z.array(
    z.object({
      skuId: z.string(),
      qtyCases: z.number().int().min(1),
      originalText: z.string().optional(),
      aiConfidence: z.string().optional(),
    })
  ).min(1),
});

export async function POST(request: Request) {
  try {
    const session = await requireUser("retailer");
    const retailerId = session.retailerId;
    if (!retailerId) {
      return NextResponse.json({ error: "NO_RETAILER_PROFILE" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "INVALID_ORDER_DATA", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { idempotencyKey, source, captureId, lines } = parsed.data;

    const result = await placeOrder(prisma, {
      retailerId,
      source: source as OrderSource,
      idempotencyKey,
      lines,
      captureId,
      userId: session.userId,
    });

    return NextResponse.json({
      success: true,
      order: result,
    });
  } catch (error: unknown) {
    console.error("Error in place order:", error);
    const msg = error instanceof Error ? error.message : "Failed to place order.";
    return NextResponse.json(
      { error: "ORDER_PLACEMENT_FAILED", message: msg },
      { status: 400 }
    );
  }
}

export async function GET() {
  try {
    const session = await requireUser("retailer");
    const scoped = new ScopedDataAccess(session);

    const orders = await prisma.order.findMany({
      where: scoped.scopeOrderWhere(),
      include: {
        lines: {
          include: {
            sku: true,
          },
        },
      },
      orderBy: { placedAt: "desc" },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Error in get orders:", error);
    return NextResponse.json(
      { error: "ORDERS_FETCH_FAILED", message: "Failed to fetch orders." },
      { status: 500 }
    );
  }
}
