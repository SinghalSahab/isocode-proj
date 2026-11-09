import { PrismaClient } from "@prisma/client";

/**
 * Generates an atomic sequential human-friendly order number per day in Asia/Kolkata timezone.
 * Example: ORD-20261109-0001
 * Uses atomic upsert with increment on order_counters to prevent collisions under concurrent orders.
 */
export async function getNextOrderNumber(prisma: PrismaClient): Promise<string> {
  // Asia/Kolkata date YYYYMMDD
  const now = new Date();
  const kolkataDateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now); // e.g. "2026-11-09"

  const dateKey = kolkataDateStr.replace(/-/g, "");

  const counter = await prisma.orderCounter.upsert({
    where: { date: dateKey },
    create: { date: dateKey, lastSeq: 1 },
    update: { lastSeq: { increment: 1 } },
  });

  const seqPadded = counter.lastSeq.toString().padStart(4, "0");
  return `ORD-${dateKey}-${seqPadded}`;
}

