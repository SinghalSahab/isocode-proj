"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DeskNav } from "@/components/ui/DeskNav";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/FeedbackStates";
import {
  FileSpreadsheet,
  Download,
  ArrowLeft,
  CheckSquare,
  Square,
  FileCode,
  CheckCircle2,
} from "lucide-react";
import { formatINR } from "@/lib/money/paise";

interface ReadyOrder {
  id: string;
  orderNo: string;
  placedAt: string;
  totalPaise: number;
  retailer: {
    shopName: string;
    ownerName: string;
    phone: string;
  };
  lines: Array<{
    id: string;
    orderedQty: number;
    freeQty: number;
  }>;
}

interface ExportBatchItem {
  id: string;
  format: string;
  orderCount: number;
  fileName: string;
  totalPaise: number;
  createdAt: string;
  createdByName: string;
}

export default function DeskTallyExportPage() {
  const router = useRouter();
  const [readyOrders, setReadyOrders] = useState<ReadyOrder[]>([]);
  const [pastBatches, setPastBatches] = useState<ExportBatchItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [format, setFormat] = useState<"xml" | "csv">("xml");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastExported, setLastExported] = useState<string | null>(null);

  useEffect(() => {
    fetchExportData();
  }, []);

  const fetchExportData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/desk/export");
      if (!res.ok) throw new Error("Failed to load export data");
      const data = await res.json();
      setReadyOrders(data.readyOrders || []);
      setPastBatches(data.pastBatches || []);

      // Auto-select all ready orders by default
      const allIds = new Set<string>((data.readyOrders || []).map((o: ReadyOrder) => o.id));
      setSelectedIds(allIds);
    } catch {
      setError("Unable to load export queue.");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectOrder = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === readyOrders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(readyOrders.map((o) => o.id)));
    }
  };

  const handleGenerateExport = async () => {
    if (selectedIds.size === 0 || generating) return;
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/desk/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderIds: Array.from(selectedIds),
          format,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Export generation failed");

      // Trigger browser file download
      const mimeType = format === "xml" ? "application/xml" : "text/csv";
      const blob = new Blob([data.fileContent], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = data.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setLastExported(data.fileName);
      await fetchExportData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error exporting orders.");
    } finally {
      setGenerating(false);
    }
  };

  const selectedTotalPaise = readyOrders
    .filter((o) => selectedIds.has(o.id))
    .reduce((sum, o) => sum + o.totalPaise, 0);

  return (
    <div className="flex min-h-screen bg-background text-ink">
      <DeskNav />

      <main className="flex-1 p-4 sm:p-6 max-w-5xl space-y-6 overflow-y-auto">
        <div className="flex items-center justify-between">
          <Link
            href="/desk"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline touch-target"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Queue</span>
          </Link>
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-accent" />
            <span>Tally ERP Sales Order Export</span>
          </h1>
          <p className="text-sm text-ink-muted">
            Generate Tally-importable XML or CSV vouchers for confirmed orders.
          </p>
        </div>

        {lastExported && (
          <Banner variant="demo" title="Export File Downloaded">
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle2 className="w-4 h-4 text-accent" />
              <span>
                Generated and downloaded <strong>{lastExported}</strong>. Exported orders marked as EXPORTED.
              </span>
            </div>
          </Banner>
        )}

        {error && <ErrorState message={error} onRetry={fetchExportData} />}

        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-card" />
            <Skeleton className="h-48 w-full rounded-card" />
          </div>
        )}

        {/* Section 1: Ready to Export Queue */}
        {!loading && (
          <div className="bg-surface border border-border rounded-card p-5 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
              <div>
                <h2 className="text-base font-bold text-ink">
                  Confirmed Orders Ready for Export ({readyOrders.length})
                </h2>
                <span className="text-xs text-ink-muted">
                  Only orders in CONFIRMED status can be exported.
                </span>
              </div>

              {readyOrders.length > 0 && (
                <div className="flex items-center gap-3">
                  {/* Format Switcher */}
                  <div className="inline-flex bg-background border border-border rounded-lg p-0.5 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setFormat("xml")}
                      className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
                        format === "xml"
                          ? "bg-surface shadow-xs text-accent font-bold"
                          : "text-ink-muted hover:text-ink"
                      }`}
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      <span>XML (Tally)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormat("csv")}
                      className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
                        format === "csv"
                          ? "bg-surface shadow-xs text-accent font-bold"
                          : "text-ink-muted hover:text-ink"
                      }`}
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>CSV</span>
                    </button>
                  </div>

                  <Button
                    variant="primary"
                    size="md"
                    loading={generating}
                    disabled={selectedIds.size === 0}
                    onClick={handleGenerateExport}
                    className="inline-flex items-center gap-2 font-bold shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>
                      Export {selectedIds.size} Orders ({formatINR(selectedTotalPaise)})
                    </span>
                  </Button>
                </div>
              )}
            </div>

            {readyOrders.length === 0 ? (
              <EmptyState
                title="No Orders Ready for Export"
                description="All confirmed orders have already been exported, or orders are still pending review."
                actionText="Go to Order Queue"
                onAction={() => router.push("/desk")}
              />
            ) : (
              <div className="overflow-x-auto">
                <div className="flex items-center justify-between py-2 px-1 text-xs font-semibold text-ink-muted border-b border-border/60">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="flex items-center gap-2 hover:text-ink"
                  >
                    {selectedIds.size === readyOrders.length ? (
                      <CheckSquare className="w-4 h-4 text-accent" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                    <span>
                      {selectedIds.size === readyOrders.length ? "Deselect All" : "Select All"}
                    </span>
                  </button>
                  <span className="tabular-nums">
                    Selected Total: {formatINR(selectedTotalPaise)}
                  </span>
                </div>

                <table className="w-full text-left text-sm">
                  <thead className="bg-background/80 text-xs uppercase font-bold text-ink-muted">
                    <tr>
                      <th className="px-3 py-2 w-10"></th>
                      <th className="px-3 py-2">Order No</th>
                      <th className="px-3 py-2">Retailer Shop</th>
                      <th className="px-3 py-2">Items</th>
                      <th className="px-3 py-2 text-right">Order Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {readyOrders.map((order) => {
                      const isChecked = selectedIds.has(order.id);
                      const totalCases = order.lines.reduce(
                        (s, l) => s + l.orderedQty + l.freeQty,
                        0
                      );

                      return (
                        <tr
                          key={order.id}
                          onClick={() => toggleSelectOrder(order.id)}
                          className="hover:bg-background/60 cursor-pointer transition-colors"
                        >
                          <td className="px-3 py-3">
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-accent" />
                            ) : (
                              <Square className="w-4 h-4 text-ink-muted" />
                            )}
                          </td>
                          <td className="px-3 py-3 font-bold tabular-nums text-ink">
                            {order.orderNo}
                          </td>
                          <td className="px-3 py-3 font-medium text-ink">
                            {order.retailer.shopName}
                            <span className="text-xs text-ink-muted block">
                              {order.retailer.ownerName} · {order.retailer.phone}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-xs text-ink-muted">
                            {order.lines.length} lines ({totalCases} cases)
                          </td>
                          <td className="px-3 py-3 text-right font-bold text-ink tabular-nums">
                            {formatINR(order.totalPaise)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Section 2: Export History */}
        {!loading && pastBatches.length > 0 && (
          <div className="bg-surface border border-border rounded-card p-5 space-y-3 shadow-xs">
            <h3 className="text-base font-bold text-ink flex items-center gap-2">
              <Download className="w-4 h-4 text-ink-muted" />
              <span>Export History (Past Batches)</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-background text-xs uppercase font-bold text-ink-muted">
                  <tr>
                    <th className="px-3 py-2">Batch File</th>
                    <th className="px-3 py-2">Format</th>
                    <th className="px-3 py-2">Orders Count</th>
                    <th className="px-3 py-2">Batch Value</th>
                    <th className="px-3 py-2">Exported At</th>
                    <th className="px-3 py-2">Exported By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-xs">
                  {pastBatches.map((batch) => (
                    <tr key={batch.id}>
                      <td className="px-3 py-2.5 font-mono font-medium text-ink">
                        {batch.fileName}
                      </td>
                      <td className="px-3 py-2.5 font-bold uppercase text-accent">
                        {batch.format}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums">
                        {batch.orderCount} orders
                      </td>
                      <td className="px-3 py-2.5 font-bold text-ink tabular-nums">
                        {formatINR(batch.totalPaise)}
                      </td>
                      <td className="px-3 py-2.5 text-ink-muted">
                        {new Date(batch.createdAt).toLocaleString("en-IN")}
                      </td>
                      <td className="px-3 py-2.5 text-ink-muted">
                        {batch.createdByName}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
