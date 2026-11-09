import { PrismaClient, Prisma, OrderStatus } from "@prisma/client";
import { assertLegalStateTransition } from "./state-machine";
import { priceCart, CartLineItem } from "../schemes/engine";
import { calculateCasePricePaise } from "../money/units";

export interface ConfirmOrderInput {
  orderId: string;
  deskUserId: string;
  note?: string;
}

export interface ConfirmOrderResult {
  success: boolean;
  orderId: string;
  status: OrderStatus;
  confirmedAt: Date;
  linesFulfilled: number;
}

/**
 * Confirms an order and atomically decrements warehouse stock inside a single Prisma transaction.
 *
 * Concurrency & Oversell Protection:
 * - SKUs are locked in consistent sorted ID order to eliminate database deadlocks.
 * - Atomic conditional updates (`stockCases: { gte: dispatchQty }`) guarantee that if two
 *   concurrent confirm operations contend for the last cases, exactly ONE transaction succeeds
 *   and the other rolls back cleanly with an INSUFFICIENT_STOCK error.
 */
export async function confirmOrderTransaction(
  prisma: PrismaClient,
  input: ConfirmOrderInput
): Promise<ConfirmOrderResult> {
  const { orderId, deskUserId, note } = input;

  return await prisma.$transaction(async (tx) => {
    // 1. Fetch order with lines
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        lines: {
          include: { sku: true },
        },
      },
    });

    if (!order) {
      throw new Error(`ORDER_NOT_FOUND: Order ${orderId} does not exist.`);
    }

    // 2. Validate state machine transition
    assertLegalStateTransition(order.status, OrderStatus.CONFIRMED, { note });

    // 3. Sort lines by skuId to prevent deadlocks across concurrent transactions
    const sortedLines = [...order.lines].sort((a, b) => a.skuId.localeCompare(b.skuId));

    // 4. Atomically verify and decrement stock for each line
    for (const line of sortedLines) {
      const dispatchQty = line.orderedQty + line.freeQty;

      if (dispatchQty <= 0) continue;

      // Conditional atomic update: only succeeds if stockCases >= dispatchQty
      const updateResult = await tx.sku.updateMany({
        where: {
          id: line.skuId,
          stockCases: { gte: dispatchQty },
        },
        data: {
          stockCases: { decrement: dispatchQty },
        },
      });

      if (updateResult.count !== 1) {
        throw new Error(
          `INSUFFICIENT_STOCK: SKU ${line.sku.code} (${line.sku.nameEn}) does not have enough stock to dispatch ${dispatchQty} cases. Current stock was depleted by a concurrent order.`
        );
      }
    }

    // 5. Update order record to CONFIRMED
    const confirmedAt = new Date();
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.CONFIRMED,
        confirmedAt,
        confirmedBy: deskUserId,
        holdReason: null, // cleared upon successful confirmation
      },
    });

    // 6. Record audit event
    await tx.orderEvent.create({
      data: {
        orderId,
        actorUserId: deskUserId,
        type: "STATUS_CHANGE",
        payloadJson: {
          from: order.status,
          to: OrderStatus.CONFIRMED,
          note: note || null,
          confirmedAt,
        },
      },
    });

    return {
      success: true,
      orderId,
      status: OrderStatus.CONFIRMED,
      confirmedAt,
      linesFulfilled: order.lines.length,
    };
  });
}

export interface RejectOrderInput {
  orderId: string;
  deskUserId: string;
  rejectReason: string;
}

export async function rejectOrderTransaction(
  prisma: PrismaClient,
  input: RejectOrderInput
): Promise<{ success: boolean; status: OrderStatus }> {
  const { orderId, deskUserId, rejectReason } = input;

  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error(`ORDER_NOT_FOUND: Order ${orderId} does not exist.`);

    assertLegalStateTransition(order.status, OrderStatus.REJECTED, { rejectReason });

    await tx.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.REJECTED,
        rejectReason: rejectReason.trim(),
      },
    });

    await tx.orderEvent.create({
      data: {
        orderId,
        actorUserId: deskUserId,
        type: "STATUS_CHANGE",
        payloadJson: {
          from: order.status,
          to: OrderStatus.REJECTED,
          rejectReason: rejectReason.trim(),
        },
      },
    });

    return { success: true, status: OrderStatus.REJECTED };
  });
}

export interface ReleaseHoldInput {
  orderId: string;
  deskUserId: string;
  note: string;
}

export async function releaseCreditHold(
  prisma: PrismaClient,
  input: ReleaseHoldInput
): Promise<{ success: boolean; status: OrderStatus }> {
  const { orderId, deskUserId, note } = input;

  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error(`ORDER_NOT_FOUND: Order ${orderId} does not exist.`);

    if (order.status !== OrderStatus.CREDIT_HOLD) {
      throw new Error(`Order ${orderId} is not on credit hold (current: ${order.status}).`);
    }

    if (!note || note.trim() === "") {
      throw new Error("A release note is mandatory when approving a credit hold.");
    }

    // Release to PENDING_REVIEW for final desk confirm
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.PENDING_REVIEW,
        holdReason: `Hold released by desk: ${note.trim()}`,
      },
    });

    await tx.orderEvent.create({
      data: {
        orderId,
        actorUserId: deskUserId,
        type: "CREDIT_HOLD_RELEASED",
        payloadJson: {
          note: note.trim(),
          releasedBy: deskUserId,
        },
      },
    });

    return { success: true, status: OrderStatus.PENDING_REVIEW };
  });
}

export interface EditDeskOrderLineInput {
  orderId: string;
  deskUserId: string;
  lines: Array<{
    id?: string;
    skuId: string;
    qtyCases: number;
    originalText?: string;
  }>;
  createAliases?: boolean;
}

export async function editDeskOrderLines(
  prisma: PrismaClient,
  input: EditDeskOrderLineInput
): Promise<{ success: boolean; totalPaise: number }> {
  const { orderId, deskUserId, lines, createAliases = true } = input;

  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        lines: true,
        retailer: { include: { prices: true } },
      },
    });

    if (!order) throw new Error(`ORDER_NOT_FOUND: Order ${orderId} does not exist.`);
    if (order.status !== OrderStatus.PENDING_REVIEW && order.status !== OrderStatus.CREDIT_HOLD) {
      throw new Error(`Cannot edit order in status ${order.status}. Only pending or hold orders can be modified.`);
    }

    // Fetch new SKUs
    const skuIds = lines.map((l) => l.skuId);
    const skus = await tx.sku.findMany({
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
    for (const rp of order.retailer.prices) {
      const sku = skuMap.get(rp.skuId);
      if (sku) {
        priceOverrides[rp.skuId] = calculateCasePricePaise(
          rp.pricePerPiecePaise,
          sku.piecesPerCase
        );
      }
    }

    // Re-price with scheme engine
    const cartLineItems: CartLineItem[] = [];
    for (const line of lines) {
      const sku = skuMap.get(line.skuId);
      if (!sku) throw new Error(`SKU ${line.skuId} not found.`);

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
        qtyCases: line.qtyCases,
        casePricePaise,
        gstRateBp: sku.gstRateBp,
        scheme: schemeConfig,
        availableStockCases: sku.stockCases,
      });
    }

    const priced = priceCart(cartLineItems, priceOverrides);

    // Delete existing lines and re-create updated lines
    await tx.orderLine.deleteMany({ where: { orderId } });

    await tx.orderLine.createMany({
      data: priced.lines.map((pLine) => {
        const originalInput = lines.find((l) => l.skuId === pLine.skuId);
        return {
          orderId,
          skuId: pLine.skuId,
          orderedQty: pLine.orderedQty,
          freeQty: pLine.freeQty,
          casePricePaiseSnapshot: pLine.casePricePaise,
          grossPaise: pLine.grossPaise,
          discountPaise: pLine.discountPaise,
          gstPaise: pLine.gstPaise,
          netPaise: pLine.netPaise,
          schemeSnapshotJson: pLine.appliedSchemeLabel as unknown as Prisma.InputJsonValue,
          originalText: originalInput?.originalText || null,
          aiConfidence: "Manual",
          editedByDesk: true,
        };
      }),
    });

    // Update order totals
    await tx.order.update({
      where: { id: orderId },
      data: {
        subtotalPaise: priced.grossPaise,
        discountPaise: priced.discountPaise,
        gstPaise: priced.gstPaise,
        totalPaise: priced.totalPaise,
      },
    });

    // Alias Learning Loop: create aliases from desk corrections
    if (createAliases) {
      for (const line of lines) {
        if (line.originalText && line.originalText.trim().length > 0) {
          const phrase = line.originalText.toLowerCase().trim();
          await tx.retailerAlias.upsert({
            where: {
              retailerId_phraseNormalised: {
                retailerId: order.retailerId,
                phraseNormalised: phrase,
              },
            },
            create: {
              retailerId: order.retailerId,
              phraseNormalised: phrase,
              skuId: line.skuId,
              timesConfirmed: 1,
            },
            update: {
              skuId: line.skuId,
              timesConfirmed: { increment: 1 },
              lastUsedAt: new Date(),
            },
          });
        }
      }
    }

    await tx.orderEvent.create({
      data: {
        orderId,
        actorUserId: deskUserId,
        type: "ORDER_EDITED_BY_DESK",
        payloadJson: {
          linesCount: priced.lines.length,
          newTotalPaise: priced.totalPaise,
        },
      },
    });

    return { success: true, totalPaise: priced.totalPaise };
  });
}

