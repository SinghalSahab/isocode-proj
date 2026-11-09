import { OrderStatus } from "@prisma/client";

export class InvalidOrderStateTransitionError extends Error {
  constructor(from: OrderStatus, to: OrderStatus, reason?: string) {
    super(
      `INVALID_STATE_TRANSITION: Cannot transition order from ${from} to ${to}.${
        reason ? ` Reason: ${reason}` : ""
      }`
    );
    this.name = "InvalidOrderStateTransitionError";
  }
}

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: [OrderStatus.PENDING_REVIEW, OrderStatus.CREDIT_HOLD],
  PENDING_REVIEW: [
    OrderStatus.CONFIRMED,
    OrderStatus.CREDIT_HOLD,
    OrderStatus.REJECTED,
  ],
  CREDIT_HOLD: [
    OrderStatus.PENDING_REVIEW,
    OrderStatus.CONFIRMED,
    OrderStatus.REJECTED,
  ],
  CONFIRMED: [OrderStatus.EXPORTED, OrderStatus.REJECTED],
  REJECTED: [], // Terminal
  EXPORTED: [], // Terminal
};

export function canTransitionOrder(
  from: OrderStatus,
  to: OrderStatus
): boolean {
  const allowed = ALLOWED_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export function assertLegalStateTransition(
  from: OrderStatus,
  to: OrderStatus,
  metadata?: { note?: string; rejectReason?: string }
): void {
  if (!canTransitionOrder(from, to)) {
    throw new InvalidOrderStateTransitionError(from, to);
  }

  // Business validation guards
  if (to === OrderStatus.REJECTED && (!metadata?.rejectReason || metadata.rejectReason.trim() === "")) {
    throw new InvalidOrderStateTransitionError(
      from,
      to,
      "A rejection reason is mandatory when rejecting an order."
    );
  }

  if (from === OrderStatus.CREDIT_HOLD && to === OrderStatus.CONFIRMED && (!metadata?.note || metadata.note.trim() === "")) {
    throw new InvalidOrderStateTransitionError(
      from,
      to,
      "A release note is mandatory when approving an order on credit hold."
    );
  }
}

