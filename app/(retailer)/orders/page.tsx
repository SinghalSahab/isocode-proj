"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/ui/Navbar";
import { BottomNav } from "@/components/ui/BottomNav";
import { OrderStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/FeedbackStates";
import { RotateCcw, CheckCircle2, AlertCircle, ShoppingBag, ChevronDown, ChevronUp } from "lucide-react";
import { formatINR } from "@/lib/money/paise";
import { t, Language } from "@/lib/i18n";

interface OrderLine {
  id: string;
  skuId: string;
  orderedQty: number;
  freeQty: number;
  grossPaise: number;
  discountPaise: number;
  netPaise: number;
  gstPaise: number;
  sku: {
    code: string;
    nameEn: string;
    nameHi: string;
    brand: string;
    piecesPerCase: number;
  };
}

interface Order {
  id: string;
  orderNo: string;
  status: string;
  source: string;
  subtotalPaise: number;
  discountPaise: number;
  gstPaise: number;
  totalPaise: number;
  holdReason: string | null;
  rejectReason: string | null;
  placedAt: string;
  lines: OrderLine[];
}

export default function MyOrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const placedOrderNo = searchParams.get("placed");

  const [lang, setLang] = useState<Language>("en");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [repeatingId, setRepeatingId] = useState<string | null>(null);

  useEffect(() => {
    const match = document.cookie.match(/app_lang=(en|hi)/);
    if (match) setLang(match[1] as Language);

    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/orders");
      if (!res.ok) throw new Error("Failed to fetch orders");
      const data = await res.json();
      setOrders(data.orders || []);
      if (placedOrderNo && data.orders?.length > 0) {
        setExpandedOrderId(data.orders[0].id);
      }
    } catch {
      setError("Unable to load orders history.");
    } finally {
      setLoading(false);
    }
  };

  const handleRepeatOrder = (order: Order) => {
    setRepeatingId(order.id);
    const newCart: Record<string, number> = {};
    for (const line of order.lines) {
      newCart[line.skuId] = line.orderedQty;
    }
    localStorage.setItem("fmcg_cart", JSON.stringify(newCart));
    router.push("/cart");
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      <Navbar
        role="retailer"
        currentLang={lang}
        onLanguageToggle={() => setLang(lang === "en" ? "hi" : "en")}
      />

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <h1 className="text-xl font-bold text-ink">
          {t("orders.title", {}, lang)}
        </h1>

        {/* Success Banner if just placed */}
        {placedOrderNo && (
          <Banner variant="demo" title="Order Placed Successfully!">
            <div className="space-y-1">
              <p>
                Your order <strong>{placedOrderNo}</strong> has been received by Company A order desk.
              </p>
              <p className="text-xs text-emerald-800">
                You will receive updates here as desk reviews and confirms your dispatch.
              </p>
            </div>
          </Banner>
        )}

        {/* Loading Skeletons */}
        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-28 w-full rounded-card" />
            <Skeleton className="h-28 w-full rounded-card" />
            <Skeleton className="h-28 w-full rounded-card" />
          </div>
        )}

        {error && (
          <ErrorState
            title="Orders Error"
            message={error}
            onRetry={fetchOrders}
          />
        )}

        {/* Empty Orders State */}
        {!loading && !error && orders.length === 0 && (
          <EmptyState
            icon={<ShoppingBag className="w-12 h-12 text-ink-muted/50 stroke-[1.5]" />}
            title={t("orders.empty_orders", {}, lang)}
            description="You have not placed any orders yet. Browse our catalogue or send a message to order."
            actionText={t("cart.browse_catalogue", {}, lang)}
            onAction={() => router.push("/catalogue")}
          />
        )}

        {/* Orders List */}
        {!loading && !error && orders.length > 0 && (
          <div className="space-y-3">
            {orders.map((order) => {
              const isExpanded = expandedOrderId === order.id;
              const dateStr = new Date(order.placedAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              const totalCases = order.lines.reduce(
                (sum, l) => sum + l.orderedQty + l.freeQty,
                0
              );

              return (
                <div
                  key={order.id}
                  className="bg-surface border border-border rounded-card p-4 shadow-xs space-y-3"
                >
                  {/* Order Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-ink tabular-nums">
                          {order.orderNo}
                        </h3>
                        <OrderStatusBadge status={order.status} />
                      </div>
                      <p className="text-xs text-ink-muted mt-1">{dateStr}</p>
                    </div>

                    <div className="text-right">
                      <span className="font-extrabold text-lg text-ink tabular-nums block">
                        {formatINR(order.totalPaise)}
                      </span>
                      <span className="text-xs text-ink-muted">
                        {totalCases} cases ({order.lines.length} items)
                      </span>
                    </div>
                  </div>

                  {/* Credit Hold Reason Alert */}
                  {order.status === "CREDIT_HOLD" && order.holdReason && (
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong>{t("orders.hold_reason_title", {}, lang)}:</strong>{" "}
                        {order.holdReason}
                      </div>
                    </div>
                  )}

                  {/* Rejection Reason Alert */}
                  {order.status === "REJECTED" && order.rejectReason && (
                    <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-danger flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
                      <div>
                        <strong>{t("orders.reject_reason_title", {}, lang)}:</strong>{" "}
                        {order.rejectReason}
                      </div>
                    </div>
                  )}

                  {/* Expanded Line Items Detail */}
                  {isExpanded && (
                    <div className="pt-3 border-t border-border/70 space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                        Order Items
                      </h4>
                      <div className="divide-y divide-border/50 text-xs">
                        {order.lines.map((line) => {
                          const itemName = lang === "hi" ? line.sku.nameHi : line.sku.nameEn;
                          return (
                            <div key={line.id} className="py-2 flex justify-between items-start">
                              <div>
                                <span className="font-semibold text-ink block">{itemName}</span>
                                <span className="text-ink-muted">
                                  {line.orderedQty} cases
                                  {line.freeQty > 0 ? ` + ${line.freeQty} FREE` : ""}
                                </span>
                              </div>
                              <div className="text-right tabular-nums">
                                <span className="font-medium text-ink block">
                                  {formatINR(line.netPaise)}
                                </span>
                                <span className="text-[10px] text-ink-muted">
                                  +{formatINR(line.gstPaise)} GST
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Totals Breakdown */}
                      <div className="pt-2 border-t border-border/80 text-xs space-y-1">
                        <div className="flex justify-between text-ink-muted">
                          <span>Subtotal:</span>
                          <span className="tabular-nums">{formatINR(order.subtotalPaise)}</span>
                        </div>
                        {order.discountPaise > 0 && (
                          <div className="flex justify-between text-accent font-medium">
                            <span>Scheme Savings:</span>
                            <span className="tabular-nums">-{formatINR(order.discountPaise)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-ink-muted">
                          <span>GST (Statutory):</span>
                          <span className="tabular-nums">+{formatINR(order.gstPaise)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-bold text-ink pt-1 border-t border-border/40">
                          <span>Total Paid:</span>
                          <span className="tabular-nums text-accent">{formatINR(order.totalPaise)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Card Actions Footer */}
                  <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline touch-target"
                    >
                      <span>{isExpanded ? "Hide Details" : "View Items"}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    <Button
                      variant="outline"
                      size="sm"
                      loading={repeatingId === order.id}
                      onClick={() => handleRepeatOrder(order)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{t("orders.repeat_order_btn", {}, lang)}</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav lang={lang} />
    </div>
  );
}
