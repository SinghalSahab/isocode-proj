"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DeskNav } from "@/components/ui/DeskNav";
import { OrderStatusBadge, StockBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";
import { Stepper } from "@/components/ui/Stepper";
import { ErrorState, Skeleton } from "@/components/ui/FeedbackStates";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Save,
  Tag,
  CreditCard,
} from "lucide-react";
import { formatINR } from "@/lib/money/paise";

interface OrderDetail {
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
  retailer: {
    id: string;
    shopName: string;
    ownerName: string;
    phone: string;
    addressLine: string;
    creditLimitPaise: number;
    outstandingPaise: number;
  };
  lines: Array<{
    id: string;
    skuId: string;
    orderedQty: number;
    freeQty: number;
    grossPaise: number;
    discountPaise: number;
    gstPaise: number;
    netPaise: number;
    originalText: string | null;
    aiConfidence: string | null;
    editedByDesk: boolean;
    sku: {
      id: string;
      code: string;
      nameEn: string;
      nameHi: string;
      piecesPerCase: number;
      dealerPricePerPiecePaise: number;
      stockCases: number;
    };
  }>;
  events: Array<{
    id: string;
    type: string;
    at: string;
    actorUser?: {
      name: string;
    };
    payloadJson: Record<string, unknown>;
  }>;
}

export default function DeskOrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Editable lines state
  const [editedQuantities, setEditedQuantities] = useState<Record<string, number>>({});

  // Modals for Reject & Release
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [releaseNote, setReleaseNote] = useState("");

  useEffect(() => {
    fetchOrder();
  }, [params.id]);

  const fetchOrder = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/desk/orders/${params.id}`);
      if (!res.ok) throw new Error("Order not found");
      const data = await res.json();
      setOrder(data.order);

      const qtyMap: Record<string, number> = {};
      for (const line of data.order.lines) {
        qtyMap[line.id] = line.orderedQty;
      }
      setEditedQuantities(qtyMap);
    } catch {
      setError("Failed to load order details.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/desk/orders/${params.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to confirm order.");
      await fetchOrder();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error confirming order.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/desk/orders/${params.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", rejectReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to reject order.");
      setShowRejectModal(false);
      await fetchOrder();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error rejecting order.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReleaseHold = async () => {
    if (!releaseNote.trim()) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/desk/orders/${params.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "release_hold", note: releaseNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to release credit hold.");
      setShowReleaseModal(false);
      await fetchOrder();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error releasing hold.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveEdits = async () => {
    if (!order) return;
    setActionLoading(true);
    setError(null);

    const updatedLines = order.lines.map((l) => ({
      skuId: l.skuId,
      qtyCases: editedQuantities[l.id] || l.orderedQty,
      originalText: l.originalText || undefined,
    }));

    try {
      const res = await fetch(`/api/desk/orders/${params.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit",
          lines: updatedLines,
          createAliases: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save edits.");
      alert("Order recalculated and retailer aliases updated.");
      await fetchOrder();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save edits.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background">
        <DeskNav />
        <main className="flex-1 p-6 space-y-4 max-w-5xl">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full rounded-card" />
          <Skeleton className="h-64 w-full rounded-card" />
        </main>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex min-h-screen bg-background">
        <DeskNav />
        <main className="flex-1 p-6 max-w-5xl">
          <ErrorState message={error || "Order not found"} onRetry={fetchOrder} />
        </main>
      </div>
    );
  }

  const availableCredit = Math.max(
    0,
    order.retailer.creditLimitPaise - order.retailer.outstandingPaise
  );
  const creditUsagePercent = Math.min(
    100,
    Math.round((order.retailer.outstandingPaise / order.retailer.creditLimitPaise) * 100)
  );

  const canApprove =
    order.status === "PENDING_REVIEW" || order.status === "CREDIT_HOLD";

  return (
    <div className="flex min-h-screen bg-background text-ink">
      <DeskNav />

      <main className="flex-1 p-4 sm:p-6 max-w-5xl space-y-5 overflow-y-auto">
        {/* Breadcrumb Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/desk"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline touch-target"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Queue</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-mono text-ink-muted">
              Source: {order.source}
            </span>
            <OrderStatusBadge status={order.status} />
          </div>
        </div>

        {/* Order Title */}
        <div className="flex items-baseline justify-between border-b border-border pb-3">
          <div>
            <h1 className="text-2xl font-extrabold text-ink tabular-nums">
              {order.orderNo}
            </h1>
            <p className="text-xs text-ink-muted mt-0.5">
              Placed on {new Date(order.placedAt).toLocaleString("en-IN")}
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-extrabold text-accent tabular-nums block">
              {formatINR(order.totalPaise)}
            </span>
            <span className="text-xs text-ink-muted">Total (incl. GST)</span>
          </div>
        </div>

        {/* Credit Hold Notice */}
        {order.status === "CREDIT_HOLD" && order.holdReason && (
          <Banner variant="warning" title="Credit Hold Active">
            <div className="space-y-1">
              <p>{order.holdReason}</p>
              <p className="text-xs text-amber-800">
                You can release this hold with a mandatory supervisory note below.
              </p>
            </div>
          </Banner>
        )}

        {/* Rejection Notice */}
        {order.status === "REJECTED" && order.rejectReason && (
          <Banner variant="danger" title="Order Rejected">
            <p>Reason: {order.rejectReason}</p>
          </Banner>
        )}

        {/* Retailer Profile & Credit Summary Card */}
        <div className="bg-surface border border-border rounded-card p-4 shadow-xs space-y-3">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <span className="text-xs uppercase font-bold text-ink-muted tracking-wider">
                Retailer Account
              </span>
              <h3 className="text-lg font-bold text-ink">{order.retailer.shopName}</h3>
              <p className="text-xs text-ink-muted">
                {order.retailer.ownerName} · {order.retailer.phone}
              </p>
              <p className="text-xs text-ink-muted">{order.retailer.addressLine}</p>
            </div>

            {/* Credit Progress Gauge */}
            <div className="min-w-[200px] bg-background p-3 rounded-lg border border-border text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-ink flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-accent" />
                  <span>Credit Usage</span>
                </span>
                <span className="font-bold tabular-nums">{creditUsagePercent}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    creditUsagePercent > 90 ? "bg-danger" : "bg-accent"
                  }`}
                  style={{ width: `${creditUsagePercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-ink-muted">
                <span>Available: {formatINR(availableCredit)}</span>
                <span>Limit: {formatINR(order.retailer.creditLimitPaise)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Order Lines Table */}
        <div className="bg-surface border border-border rounded-card p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-ink">Order Items</h3>
            {(order.status === "PENDING_REVIEW" || order.status === "CREDIT_HOLD") && (
              <Button
                variant="outline"
                size="sm"
                loading={actionLoading}
                onClick={handleSaveEdits}
                className="inline-flex items-center gap-1 text-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Corrections & Aliases</span>
              </Button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-background border-b border-border text-xs uppercase font-bold text-ink-muted">
                <tr>
                  <th className="px-3 py-2.5">SKU & Product</th>
                  <th className="px-3 py-2.5">Stock</th>
                  <th className="px-3 py-2.5">Ordered Qty</th>
                  <th className="px-3 py-2.5">Free Goods</th>
                  <th className="px-3 py-2.5 text-right">Net Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {order.lines.map((line) => {
                  const currentQty = editedQuantities[line.id] !== undefined ? editedQuantities[line.id] : line.orderedQty;

                  return (
                    <tr key={line.id}>
                      <td className="px-3 py-3">
                        <div className="font-semibold text-ink">{line.sku.nameEn}</div>
                        <div className="text-xs text-ink-muted">
                          SKU: {line.sku.code} · Case of {line.sku.piecesPerCase}
                        </div>

                        {/* Quoted chip for AI lines */}
                        {line.originalText && (
                          <div className="mt-1 inline-flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-xs font-mono text-amber-900">
                            <span>Captured text: “{line.originalText}”</span>
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-3">
                        <StockBadge stockCases={line.sku.stockCases} />
                      </td>

                      <td className="px-3 py-3">
                        {order.status === "PENDING_REVIEW" || order.status === "CREDIT_HOLD" ? (
                          <Stepper
                            value={currentQty}
                            onChange={(val) =>
                              setEditedQuantities({ ...editedQuantities, [line.id]: val })
                            }
                            min={1}
                            max={line.sku.stockCases}
                          />
                        ) : (
                          <span className="font-bold tabular-nums text-ink">
                            {line.orderedQty} cases
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-3">
                        {line.freeQty > 0 ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-accent font-semibold px-2 py-1 rounded text-xs">
                            <Tag className="w-3 h-3" />
                            <span>+{line.freeQty} Free</span>
                          </span>
                        ) : (
                          <span className="text-xs text-ink-muted">—</span>
                        )}
                      </td>

                      <td className="px-3 py-3 text-right">
                        <span className="font-bold text-ink tabular-nums block">
                          {formatINR(line.netPaise)}
                        </span>
                        <span className="text-[11px] text-ink-muted tabular-nums">
                          +{formatINR(line.gstPaise)} GST
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          <div className="pt-3 border-t border-border flex justify-end">
            <div className="w-64 space-y-1.5 text-xs">
              <div className="flex justify-between text-ink-muted">
                <span>Subtotal:</span>
                <span className="tabular-nums font-medium text-ink">
                  {formatINR(order.subtotalPaise)}
                </span>
              </div>
              {order.discountPaise > 0 && (
                <div className="flex justify-between text-accent font-semibold">
                  <span>Scheme Discount:</span>
                  <span className="tabular-nums">-{formatINR(order.discountPaise)}</span>
                </div>
              )}
              <div className="flex justify-between text-ink-muted">
                <span>GST:</span>
                <span className="tabular-nums font-medium text-ink">
                  +{formatINR(order.gstPaise)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-ink pt-1 border-t border-border">
                <span>Total (incl. GST):</span>
                <span className="tabular-nums text-accent">{formatINR(order.totalPaise)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls Bar */}
        {canApprove && (
          <div className="bg-surface border border-border rounded-card p-4 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <span className="text-xs font-bold text-ink block">Desk Order Actions</span>
              <span className="text-xs text-ink-muted">
                Confirming immediately decrements warehouse stock in an atomic transaction.
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="danger"
                size="md"
                disabled={actionLoading}
                onClick={() => setShowRejectModal(true)}
              >
                Reject Order
              </Button>

              {order.status === "CREDIT_HOLD" && (
                <Button
                  variant="outline"
                  size="md"
                  disabled={actionLoading}
                  onClick={() => setShowReleaseModal(true)}
                >
                  Release Hold
                </Button>
              )}

              <Button
                variant="primary"
                size="md"
                loading={actionLoading}
                onClick={handleConfirm}
                className="font-bold shadow-xs"
              >
                Approve & Decrement Stock
              </Button>
            </div>
          </div>
        )}

        {/* Event Timeline Audit Log */}
        <div className="bg-surface border border-border rounded-card p-4 shadow-xs space-y-3">
          <h3 className="font-bold text-sm uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-accent" />
            <span>Order Audit Timeline</span>
          </h3>

          <div className="divide-y divide-border/60 text-xs">
            {order.events.map((evt) => (
              <div key={evt.id} className="py-2.5 flex items-start justify-between">
                <div>
                  <strong className="block text-ink">{evt.type}</strong>
                  <span className="text-ink-muted font-mono">
                    {JSON.stringify(evt.payloadJson)}
                  </span>
                </div>
                <div className="text-right text-ink-muted">
                  <span className="block font-medium">
                    {evt.actorUser?.name || "System"}
                  </span>
                  <span>{new Date(evt.at).toLocaleTimeString("en-IN")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Reject Order Modal */}
      {showRejectModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        >
          <div className="bg-surface border border-border rounded-card p-5 max-w-sm w-full space-y-3 shadow-xl">
            <h3 className="text-base font-bold text-danger flex items-center gap-1.5">
              <XCircle className="w-5 h-5" />
              <span>Reject Order</span>
            </h3>
            <p className="text-xs text-ink-muted">
              Please enter a mandatory rejection reason. This reason will be visible to the retailer on their orders page.
            </p>
            <textarea
              rows={3}
              required
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Delivery route temporarily closed for road repairs."
              className="w-full p-2.5 bg-background border border-border rounded-card text-xs focus:ring-2 focus:ring-danger focus:outline-none"
            />
            <div className="flex gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowRejectModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                loading={actionLoading}
                disabled={!rejectReason.trim()}
                onClick={handleReject}
                className="flex-1"
              >
                Confirm Reject
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Release Credit Hold Modal */}
      {showReleaseModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        >
          <div className="bg-surface border border-border rounded-card p-5 max-w-sm w-full space-y-3 shadow-xl">
            <h3 className="text-base font-bold text-accent flex items-center gap-1.5">
              <CheckCircle2 className="w-5 h-5" />
              <span>Release Credit Hold</span>
            </h3>
            <p className="text-xs text-ink-muted">
              Mandatory supervisory note required to override credit limit for this order:
            </p>
            <textarea
              rows={3}
              required
              value={releaseNote}
              onChange={(e) => setReleaseNote(e.target.value)}
              placeholder="e.g. Approved by Director: retailer confirmed payment cheque in transit."
              className="w-full p-2.5 bg-background border border-border rounded-card text-xs focus:ring-2 focus:ring-accent focus:outline-none"
            />
            <div className="flex gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowReleaseModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={actionLoading}
                disabled={!releaseNote.trim()}
                onClick={handleReleaseHold}
                className="flex-1"
              >
                Release Hold
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
