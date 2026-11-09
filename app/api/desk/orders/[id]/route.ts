import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import {
  confirmOrderTransaction,
  rejectOrderTransaction,
  releaseCreditHold,
  editDeskOrderLines,
} from "@/lib/orders/desk";

interface Params {
  params: { id: string };
}

export async function GET(request: Request, { params }: Params) {
  try {
    await requireUser("desk");

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        retailer: {
          include: {
            prices: true,
          },
        },
        lines: {
          include: { sku: true },
        },
        events: {
          include: { actorUser: true },
          orderBy: { at: "desc" },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "ORDER_NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error("Error fetching order detail:", error);
    return NextResponse.json({ error: "FETCH_FAILED" }, { status: 500 });
  }
}

const deskActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("confirm"),
    note: z.string().optional(),
  }),
  z.object({
    action: z.literal("reject"),
    rejectReason: z.string().min(3),
  }),
  z.object({
    action: z.literal("release_hold"),
    note: z.string().min(3),
  }),
  z.object({
    action: z.literal("edit"),
    lines: z.array(
      z.object({
        skuId: z.string(),
        qtyCases: z.number().int().min(1),
        originalText: z.string().optional(),
      })
    ),
    createAliases: z.boolean().default(true),
  }),
]);

export async function POST(request: Request, { params }: Params) {
  try {
    const session = await requireUser("desk");
    const body = await request.json();

    const parsed = deskActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "INVALID_ACTION", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    switch (payload.action) {
      case "confirm": {
        const result = await confirmOrderTransaction(prisma, {
          orderId: params.id,
          deskUserId: session.userId,
          note: payload.note,
        });
        return NextResponse.json(result);
      }
      case "reject": {
        const result = await rejectOrderTransaction(prisma, {
          orderId: params.id,
          deskUserId: session.userId,
          rejectReason: payload.rejectReason,
        });
        return NextResponse.json(result);
      }
      case "release_hold": {
        const result = await releaseCreditHold(prisma, {
          orderId: params.id,
          deskUserId: session.userId,
          note: payload.note,
        });
        return NextResponse.json(result);
      }
      case "edit": {
        const result = await editDeskOrderLines(prisma, {
          orderId: params.id,
          deskUserId: session.userId,
          lines: payload.lines,
          createAliases: payload.createAliases,
        });
        return NextResponse.json(result);
      }
    }
  } catch (error: unknown) {
    console.error("Error executing desk action:", error);
    const msg = error instanceof Error ? error.message : "Desk operation failed.";
    return NextResponse.json({ error: "ACTION_FAILED", message: msg }, { status: 400 });
  }
}
