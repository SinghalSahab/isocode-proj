import { describe, it, expect } from "vitest";
import {
  canTransitionOrder,
  assertLegalStateTransition,
  InvalidOrderStateTransitionError,
} from "@/lib/orders/state-machine";
import { OrderStatus } from "@prisma/client";

describe("Order State Machine: Transitions & Guards", () => {
  it("allows legal forward transitions", () => {
    expect(canTransitionOrder(OrderStatus.PENDING_REVIEW, OrderStatus.CONFIRMED)).toBe(true);
    expect(canTransitionOrder(OrderStatus.PENDING_REVIEW, OrderStatus.REJECTED)).toBe(true);
    expect(canTransitionOrder(OrderStatus.PENDING_REVIEW, OrderStatus.CREDIT_HOLD)).toBe(true);
    expect(canTransitionOrder(OrderStatus.CREDIT_HOLD, OrderStatus.CONFIRMED)).toBe(true);
    expect(canTransitionOrder(OrderStatus.CREDIT_HOLD, OrderStatus.PENDING_REVIEW)).toBe(true);
    expect(canTransitionOrder(OrderStatus.CONFIRMED, OrderStatus.EXPORTED)).toBe(true);
  });

  it("blocks illegal transitions", () => {
    // Terminal states cannot transition
    expect(canTransitionOrder(OrderStatus.REJECTED, OrderStatus.CONFIRMED)).toBe(false);
    expect(canTransitionOrder(OrderStatus.EXPORTED, OrderStatus.PENDING_REVIEW)).toBe(false);
    expect(canTransitionOrder(OrderStatus.CONFIRMED, OrderStatus.CREDIT_HOLD)).toBe(false);

    expect(() =>
      assertLegalStateTransition(OrderStatus.EXPORTED, OrderStatus.PENDING_REVIEW)
    ).toThrow(InvalidOrderStateTransitionError);
  });

  it("enforces mandatory rejection reason when rejecting an order", () => {
    expect(() =>
      assertLegalStateTransition(OrderStatus.PENDING_REVIEW, OrderStatus.REJECTED, {
        rejectReason: "",
      })
    ).toThrow(/rejection reason is mandatory/i);

    expect(() =>
      assertLegalStateTransition(OrderStatus.PENDING_REVIEW, OrderStatus.REJECTED, {
        rejectReason: "Road maintenance",
      })
    ).not.toThrow();
  });

  it("enforces mandatory release note when approving credit hold order", () => {
    expect(() =>
      assertLegalStateTransition(OrderStatus.CREDIT_HOLD, OrderStatus.CONFIRMED, {
        note: "",
      })
    ).toThrow(/release note is mandatory/i);

    expect(() =>
      assertLegalStateTransition(OrderStatus.CREDIT_HOLD, OrderStatus.CONFIRMED, {
        note: "Cheque received by director",
      })
    ).not.toThrow();
  });
});
