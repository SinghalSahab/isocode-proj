import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { generateTallyXml, generateTallyCsv, TallyExportOrder } from "@/lib/tally/export";
import { toBigIntPaise } from "@/lib/money/paise";
import { OrderStatus } from "@prisma/client";

export async function GET() {
  try {
    await requireUser("desk");

    // Fetch confirmed, unexported orders
    const readyOrders = await prisma.order.findMany({
      where: {
        status: OrderStatus.CONFIRMED,
        exportedAt: null,
      },
      include: {
        retailer: true,
        lines: { include: { sku: true } },
      },
      orderBy: { placedAt: "asc" },
    });

    // Fetch past export batches
    const pastBatches = await prisma.exportBatch.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      include: { user: true },
    });

    const serializedBatches = pastBatches.map((b) => ({
      id: b.id,
      format: b.format,
      orderCount: b.orderCount,
      fileName: b.fileName,
      totalPaise: Number(b.totalPaise),
      createdAt: b.createdAt,
      createdByName: b.user?.name || "Desk Staff",
    }));

    return NextResponse.json({
      readyOrders,
      pastBatches: serializedBatches,
    });
  } catch (error) {
    console.error("Error in export GET:", error);
    return NextResponse.json({ error: "EXPORT_FETCH_FAILED" }, { status: 500 });
  }
}

const generateExportSchema = z.object({
  orderIds: z.array(z.string()).min(1),
  format: z.enum(["xml", "csv"]),
});

export async function POST(request: Request) {
  try {
    const session = await requireUser("desk");
    const body = await request.json();

    const parsed = generateExportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "INVALID_EXPORT_REQUEST", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { orderIds, format } = parsed.data;

    // Fetch the target confirmed orders
    const orders = await prisma.order.findMany({
      where: {
        id: { in: orderIds },
        status: OrderStatus.CONFIRMED,
      },
      include: {
        retailer: true,
        lines: { include: { sku: true } },
      },
      orderBy: { orderNo: "asc" },
    });

    if (orders.length === 0) {
      return NextResponse.json(
        { error: "NO_CONFIRMED_ORDERS", message: "None of the selected orders are in CONFIRMED status." },
        { status: 400 }
      );
    }

    // Map to export format objects
    const exportOrders: TallyExportOrder[] = orders.map((o) => ({
      orderNo: o.orderNo,
      placedAt: o.placedAt,
      retailerShopName: o.retailer.shopName,
      retailerOwnerName: o.retailer.ownerName,
      retailerPhone: o.retailer.phone,
      subtotalPaise: o.subtotalPaise,
      discountPaise: o.discountPaise,
      gstPaise: o.gstPaise,
      totalPaise: o.totalPaise,
      lines: o.lines.map((l) => ({
        skuCode: l.sku.code,
        skuName: l.sku.nameEn,
        orderedQty: l.orderedQty,
        freeQty: l.freeQty,
        casePricePaise: l.casePricePaiseSnapshot,
        grossPaise: l.grossPaise,
        discountPaise: l.discountPaise,
        netPaise: l.netPaise,
        gstPaise: l.gstPaise,
      })),
    }));

    // Generate output file
    const timestampStr = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const fileName = `TALLY_EXPORT_${timestampStr}.${format}`;
    const fileContent =
      format === "xml" ? generateTallyXml(exportOrders) : generateTallyCsv(exportOrders);

    const totalBatchPaise = orders.reduce((sum, o) => sum + o.totalPaise, 0);

    // Atomically record batch and mark orders EXPORTED
    const batch = await prisma.$transaction(async (tx) => {
      const newBatch = await tx.exportBatch.create({
        data: {
          createdBy: session.userId,
          format,
          orderCount: orders.length,
          fileName,
          totalPaise: toBigIntPaise(totalBatchPaise),
        },
      });

      const now = new Date();
      await tx.order.updateMany({
        where: { id: { in: orderIds } },
        data: {
          status: OrderStatus.EXPORTED,
          exportedAt: now,
          exportBatchId: newBatch.id,
        },
      });

      for (const o of orders) {
        await tx.orderEvent.create({
          data: {
            orderId: o.id,
            actorUserId: session.userId,
            type: "STATUS_CHANGE",
            payloadJson: {
              from: OrderStatus.CONFIRMED,
              to: OrderStatus.EXPORTED,
              batchId: newBatch.id,
              fileName,
            },
          },
        });
      }

      return newBatch;
    });

    return NextResponse.json({
      success: true,
      batchId: batch.id,
      fileName,
      fileContent,
      format,
      orderCount: orders.length,
    });
  } catch (error: unknown) {
    console.error("Error in export generation:", error);
    const msg = error instanceof Error ? error.message : "Failed to generate Tally export.";
    return NextResponse.json({ error: "EXPORT_FAILED", message: msg }, { status: 500 });
  }
}
