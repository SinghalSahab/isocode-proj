"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { DeskNav } from "@/components/ui/DeskNav";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/FeedbackStates";
import { Truck, Printer, ArrowLeft, Calendar, PackageCheck, Tag } from "lucide-react";

interface SkuLoadingItem {
  skuId: string;
  code: string;
  nameEn: string;
  nameHi: string;
  brand: string;
  piecesPerCase: number;
  orderedCases: number;
  freeCases: number;
  totalDispatchCases: number;
  deliveries: Array<{
    orderNo: string;
    shopName: string;
    cases: number;
    free: number;
  }>;
}

interface LoadingListData {
  date: string;
  ordersCount: number;
  grandTotalOrdered: number;
  grandTotalFree: number;
  grandTotalDispatch: number;
  items: SkuLoadingItem[];
}

export default function DeskVanLoadingPage() {
  const [data, setData] = useState<LoadingListData | null>(null);
  const [chosenDate, setChosenDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLoadingList();
  }, [chosenDate]);

  const fetchLoadingList = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/desk/loading-list?date=${chosenDate}`);
      if (!res.ok) throw new Error("Failed to load van loading list");
      const json = await res.json();
      setData(json);
    } catch {
      setError("Unable to load dispatch loading list.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex min-h-screen bg-background text-ink">
      <div className="print:hidden">
        <DeskNav />
      </div>

      <main className="flex-1 p-4 sm:p-6 max-w-5xl space-y-6 overflow-y-auto print:p-0 print:max-w-none">
        {/* Screen-only Controls */}
        <div className="flex items-center justify-between print:hidden">
          <Link
            href="/desk"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline touch-target"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Queue</span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <Calendar className="w-4 h-4 text-ink-muted" />
              <input
                type="date"
                value={chosenDate}
                onChange={(e) => setChosenDate(e.target.value)}
                className="bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 font-bold shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Print Van Loading Sheet</span>
            </Button>
          </div>
        </div>

        {/* Printable Sheet Header */}
        <div className="border-b-2 border-ink pb-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-extrabold tracking-widest text-ink-muted">
                Company A Distribution · Jabalpur Warehouse
              </span>
              <h1 className="text-2xl font-black text-ink uppercase tracking-tight flex items-center gap-2">
                <Truck className="w-6 h-6 text-accent print:text-black" />
                <span>Van Dispatch & Warehouse Loading Sheet</span>
              </h1>
            </div>
            <div className="text-right">
              <span className="text-xs text-ink-muted block uppercase font-bold">
                Dispatch Date
              </span>
              <span className="text-lg font-bold tabular-nums text-ink">
                {new Date(chosenDate).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>

        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-14 w-full rounded-card" />
            <Skeleton className="h-48 w-full rounded-card" />
          </div>
        )}

        {error && <ErrorState message={error} onRetry={fetchLoadingList} />}

        {!loading && !error && data && data.items.length === 0 && (
          <EmptyState
            title="No Confirmed Dispatches for this Date"
            description="Select a different dispatch date or approve pending orders in the queue."
          />
        )}

        {!loading && !error && data && data.items.length > 0 && (
          <div className="space-y-6">
            {/* Top Aggregate Summary Banner */}
            <div className="grid grid-cols-3 gap-3 bg-surface border border-border rounded-card p-4 print:border-black">
              <div>
                <span className="text-xs uppercase font-bold text-ink-muted block">
                  Orders Included
                </span>
                <span className="text-2xl font-black text-ink tabular-nums">
                  {data.ordersCount}
                </span>
              </div>
              <div>
                <span className="text-xs uppercase font-bold text-ink-muted block">
                  Paid Wholesale Cases
                </span>
                <span className="text-2xl font-black text-ink tabular-nums">
                  {data.grandTotalOrdered}
                </span>
              </div>
              <div>
                <span className="text-xs uppercase font-bold text-accent print:text-black block">
                  Total Physical Dispatch
                </span>
                <span className="text-2xl font-black text-accent print:text-black tabular-nums">
                  {data.grandTotalDispatch} cases
                  <span className="text-xs font-semibold text-ink-muted block">
                    (includes {data.grandTotalFree} free bonus cases)
                  </span>
                </span>
              </div>
            </div>

            {/* SKU Breakdown Table */}
            <div className="bg-surface border border-border rounded-card overflow-hidden print:border-black shadow-xs">
              <table className="w-full text-left text-sm">
                <thead className="bg-background border-b-2 border-border print:border-black text-xs uppercase font-black text-ink">
                  <tr>
                    <th className="px-3 py-3 w-10">#</th>
                    <th className="px-3 py-3">SKU Code & Product</th>
                    <th className="px-3 py-3">Pack Info</th>
                    <th className="px-3 py-3 text-center">Billed Cases</th>
                    <th className="px-3 py-3 text-center">Free Cases</th>
                    <th className="px-3 py-3 text-right">Total Van Cases</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border print:divide-black">
                  {data.items.map((item, idx) => (
                    <tr key={item.skuId} className="hover:bg-background/40">
                      <td className="px-3 py-3 tabular-nums font-bold text-ink-muted">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-3">
                        <strong className="block text-ink font-bold">
                          {item.code} — {item.nameEn}
                        </strong>
                        <span className="text-xs text-ink-muted font-medium">
                          Brand: {item.brand}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-ink-muted">
                        {item.piecesPerCase} units/case
                      </td>
                      <td className="px-3 py-3 text-center tabular-nums font-semibold text-ink">
                        {item.orderedCases}
                      </td>
                      <td className="px-3 py-3 text-center tabular-nums font-semibold">
                        {item.freeCases > 0 ? (
                          <span className="inline-block bg-emerald-50 text-accent font-bold px-2 py-0.5 rounded text-xs print:bg-transparent print:text-black">
                            +{item.freeCases} Free
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-black text-base text-ink tabular-nums">
                        {item.totalDispatchCases} cases
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-background border-t-2 border-ink font-black text-sm">
                  <tr>
                    <td colSpan={3} className="px-3 py-3 uppercase">
                      Grand Dispatch Total
                    </td>
                    <td className="px-3 py-3 text-center tabular-nums">
                      {data.grandTotalOrdered}
                    </td>
                    <td className="px-3 py-3 text-center tabular-nums">
                      +{data.grandTotalFree}
                    </td>
                    <td className="px-3 py-3 text-right text-lg text-accent print:text-black tabular-nums">
                      {data.grandTotalDispatch} cases
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Warehouse Sign-off Footer */}
            <div className="pt-8 border-t border-dashed border-ink flex justify-between text-xs text-ink uppercase font-bold print:flex">
              <div>Warehouse Loader Signature: _______________________</div>
              <div>Delivery Driver Signature: _______________________</div>
              <div>Desk Officer Signature: _______________________</div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

