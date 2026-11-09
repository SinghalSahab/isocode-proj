import { PrismaClient, OrderStatus, OrderSource } from "@prisma/client";
import { priceCart, CartLineItem } from "../schemes/engine";
import { calculateCasePricePaise } from "../money/units";
import { getNextOrderNumber } from "./counter";

export interface PlaceOrderInput {
  retailerId: string;
  source: OrderSource;
  idempotencyKey: string;
  lines: Array<{
    skuId: string;
    qtyCases: number;
    originalText?: string;
    aiConfidence?: string;
  }>;
  captureId?: string;
  userId?: string;
}

export interface PlaceOrderResult {
  orderId: string;
  orderNo: string;
  status: OrderStatus;
  subtotalPaise: number;
  discountPaise: number;
  gstPaise: number;
  totalPaise: number;
  holdReason: string | null;
  placedAt: Date;
  linesCount: number;
  isExisting: boolean;
}

/**
 * Server-authoritative order placement.
 * Ignores all client-provided prices, discounts, and totals; re-prices using scheme engine.
 * Validates stock, evaluates credit limits, and enforces idempotency.
 */
export async function placeOrder(
  prisma: PrismaClient,
  input: PlaceOrderInput
): Promise<PlaceOrderResult> {
  const { retailerId, source, idempotencyKey, lines, captureId, userId } = input;

  if (!lines || lines.length === 0) {
    throw new Error("EMPTY_ORDER: At least one line item is required.");
  }

  // 1. Check idempotency: if order already exists with this key, return it idempotently
  const existingOrder = await prisma.order.findUnique({
    where: { idempotencyKey },
    include: { lines: true },
  });

  if (existingOrder) {
    return {
      orderId: existingOrder.id,
      orderNo: existingOrder.orderNo,
      status: existingOrder.status,
      subtotalPaise: existingOrder.subtotalPaise,
      discountPaise: existingOrder.discountPaise,
      gstPaise: existingOrder.gstPaise,
      totalPaise: existingOrder.totalPaise,
      holdReason: existingOrder.holdReason,
      placedAt: existingOrder.placedAt,
      linesCount: existingOrder.lines.length,
      isExisting: true,
    };
  }

  // 2. Fetch retailer profile (for credit check and overrides)
  const retailer = await prisma.retailer.findUnique({
    where: { id: retailerId },
    include: {
      prices: true,
    },
  });

  if (!retailer) {
    throw new Error(`RETAILER_NOT_FOUND: Retailer ID ${retailerId} does not exist.`);
  }

  // 3. Fetch all requested SKUs and active schemes from database
  const skuIds = lines.map((l) => l.skuId);
  const skus = await prisma.sku.findMany({
    where: {
      id: { in: skuIds },
      active: true,
    },
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

  // Build price overrides lookup for this retailer
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

  // 4. Construct cart line items for pure scheme engine re-pricing
  const cartLineItems: CartLineItem[] = [];

  for (const line of lines) {
    const sku = skuMap.get(line.skuId);
    if (!sku) {
      throw new Error(`SKU_NOT_FOUND: SKU ${line.skuId} is inactive or does not exist.`);
    }

    if (line.qtyCases <= 0) {
      throw new Error(`INVALID_QTY: Quantity for ${sku.nameEn} must be at least 1 case.`);
    }

    const standardCasePrice = calculateCasePricePaise(
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
      casePricePaise: standardCasePrice,
      gstRateBp: sku.gstRateBp,
      scheme: schemeConfig,
      availableStockCases: sku.stockCases,
    });
  }

  // 5. Authoritatively re-price the entire cart with pure scheme engine
  const pricedCart = priceCart(cartLineItems, priceOverrides);

  // Validate that no line is out of stock
  for (const line of pricedCart.lines) {
    if (line.maxOrderableQty === 0 && line.orderedQty > 0) {
      throw new Error(`ITEM_OUT_OF_STOCK: ${line.skuCode} is currently out of stock.`);
    }
  }

  // 6. Credit Check: if outstanding + order total > limit -> CREDIT_HOLD
  const totalRequiredPaise = retailer.outstandingPaise + pricedCart.totalPaise;
  let status: OrderStatus = OrderStatus.PENDING_REVIEW;
  let holdReason: string | null = null;

  if (totalRequiredPaise > retailer.creditLimitPaise) {
    status = OrderStatus.CREDIT_HOLD;
    holdReason = `Order total exceeds available credit limit (Limit: ₹${(retailer.creditLimitPaise / 100).toLocaleString("en-IN")}, Used: ₹${(retailer.outstandingPaise / 100).toLocaleString("en-IN")}, Order: ₹${(pricedCart.totalPaise / 100).toLocaleString("en-IN")})`;
  }

  // 7. Atomic order creation with sequential order number
  const orderNo = await getNextOrderNumber(prisma);

  const order = await prisma.order.create({
    data: {
      orderNo,
      retailerId,
      status,
      source,
      idempotencyKey,
      subtotalPaise: pricedCart.grossPaise,
      discountPaise: pricedCart.discountPaise,
      gstPaise: pricedCart.gstPaise,
      totalPaise: pricedCart.totalPaise,
      holdReason,
      captureId,
      lines: {
        create: pricedCart.lines.map((pLine) => {
          const originalLineInput = lines.find((l) => l.skuId === pLine.skuId);
          return {
            skuId: pLine.skuId,
            orderedQty: pLine.orderedQty,
            freeQty: pLine.freeQty,
            casePricePaiseSnapshot: pLine.casePricePaise,
            grossPaise: pLine.grossPaise,
            discountPaise: pLine.discountPaise,
            gstPaise: pLine.gstPaise,
            netPaise: pLine.netPaise,
            schemeSnapshotJson: pLine.appliedSchemeLabel,
            originalText: originalLineInput?.originalText || null,
            aiConfidence: originalLineInput?.aiConfidence || null,
            editedByDesk: false,
          };
        }),
      },
      events: {
        create: {
          actorUserId: userId || null,
          type: status === OrderStatus.CREDIT_HOLD ? "ORDER_PLACED_CREDIT_HOLD" : "ORDER_PLACED",
          payloadJson: {
            source,
            linesCount: pricedCart.lines.length,
            totalPaise: pricedCart.totalPaise,
            status,
            holdReason,
          },
        },
      },
    },
    include: {
      lines: true,
    },
  });

  return {
    orderId: order.id,
    orderNo: order.orderNo,
    status: order.status,
    subtotalPaise: order.subtotalPaise,
    discountPaise: order.discountPaise,
    gstPaise: order.gstPaise,
    totalPaise: order.totalPaise,
    holdReason: order.holdReason,
    placedAt: order.placedAt,
    linesCount: order.lines.length,
    isExisting: false,
  };
}
