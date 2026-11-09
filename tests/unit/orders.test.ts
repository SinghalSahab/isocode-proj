import { describe, it, expect, vi } from "vitest";
import { getNextOrderNumber } from "@/lib/orders/counter";
import { placeOrder } from "@/lib/orders/placement";
import { PrismaClient, OrderStatus, OrderSource } from "@prisma/client";

describe("Order Counters & Daily Numbering", () => {
  it("formats order numbers sequentially with Asia/Kolkata date", async () => {
    const mockPrisma = {
      orderCounter: {
        upsert: vi.fn().mockResolvedValue({ date: "20261109", lastSeq: 7 }),
      },
    } as unknown as PrismaClient;

    const orderNo = await getNextOrderNumber(mockPrisma);
    expect(orderNo).toBe("ORD-20261109-0007");
    expect(mockPrisma.orderCounter.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { date: "20261109", lastSeq: 1 },
        update: { lastSeq: { increment: 1 } },
      })
    );
  });
});

describe("Order Placement Logic & Guardrails", () => {
  it("returns existing order when idempotencyKey already exists (Idempotent replay)", async () => {
    const existingOrder = {
      id: "ord-existing-1",
      orderNo: "ORD-20261109-0001",
      status: OrderStatus.CONFIRMED,
      subtotalPaise: 777600,
      discountPaise: 0,
      gstPaise: 139968,
      totalPaise: 917568,
      holdReason: null,
      placedAt: new Date(),
      lines: [{ id: "line-1" }],
    };

    const mockPrisma = {
      order: {
        findUnique: vi.fn().mockResolvedValue(existingOrder),
      },
    } as unknown as PrismaClient;

    const result = await placeOrder(mockPrisma, {
      retailerId: "ret-1",
      source: OrderSource.app,
      idempotencyKey: "dup-key-12345",
      lines: [{ skuId: "sku-1", qtyCases: 10 }],
    });

    expect(result.isExisting).toBe(true);
    expect(result.orderNo).toBe("ORD-20261109-0001");
    expect(result.orderId).toBe("ord-existing-1");
  });

  it("places order on CREDIT_HOLD when order exceeds available limit", async () => {
    const retailer = {
      id: "ret-near-limit",
      shopName: "Sharma Provision Store",
      creditLimitPaise: 5000000, // ₹50,000
      outstandingPaise: 4750000, // ₹47,500 used (only ₹2,500 available)
      prices: [],
    };

    const skuDetergent = {
      id: "sku-dt",
      code: "SKU-DT-1KG",
      nameEn: "Detergent powder 1 kg, case of 20",
      piecesPerCase: 20,
      dealerPricePerPiecePaise: 10150, // case = 203000 (₹2,030.00)
      gstRateBp: 1800,
      stockCases: 50,
      active: true,
      schemes: [
        {
          kind: "SLAB_DISCOUNT",
          configJson: { slabs: [{ minQty: 5, percentBp: 300 }] },
        },
      ],
    };

    const createdOrder = {
      id: "new-order-id",
      orderNo: "ORD-20261109-0002",
      status: OrderStatus.CREDIT_HOLD,
      subtotalPaise: 203000 * 2,
      discountPaise: 0,
      gstPaise: Math.round(406000 * 0.18),
      totalPaise: Math.round(406000 * 1.18),
      holdReason: "Order total exceeds available credit limit",
      placedAt: new Date(),
    };

    const mockPrisma = {
      order: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(createdOrder),
      },
      retailer: {
        findUnique: vi.fn().mockResolvedValue(retailer),
      },
      sku: {
        findMany: vi.fn().mockResolvedValue([skuDetergent]),
      },
      orderCounter: {
        upsert: vi.fn().mockResolvedValue({ date: "20261109", lastSeq: 2 }),
      },
    } as unknown as PrismaClient;

    const result = await placeOrder(mockPrisma, {
      retailerId: "ret-near-limit",
      source: OrderSource.app,
      idempotencyKey: "fresh-key-99999",
      lines: [{ skuId: "sku-dt", qtyCases: 2 }],
    });

    expect(result.isExisting).toBe(false);
    expect(result.status).toBe(OrderStatus.CREDIT_HOLD);
    expect(result.holdReason).toContain("Order total exceeds available credit limit");
  });
});

