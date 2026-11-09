"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { DeskNav } from "@/components/ui/DeskNav";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/FeedbackStates";
import { Clock, ArrowLeft, Phone, AlertTriangle, Store } from "lucide-react";
import { formatINR } from "@/lib/money/paise";

interface DormantRetailer {
  id: string;
  shopName: string;
  ownerName: string;
  phone: string;
  addressLine: string;
  creditLimitPaise: number;
  outstandingPaise: number;
  salesmanName: string;
  salesmanPhone: string | null;
  latestOrderNo: string;
  latestOrderDate: string | null;
  daysSinceLastOrder: number;
}

export default function DeskInactiveRetailersPage() {
  const [retailers, setRetailers] = useState<DormantRetailer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDormant();
  }, []);

  const fetchDormant = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/desk/inactive");
      if (!res.ok) throw new Error("Failed to load dormant retailers");
      const data = await res.json();
      setRetailers(data.dormantRetailers || []);
    } catch {
      setError("Unable to load 14-day inactive retailers.");
    } finally {
      setLoading(false);
    }
  };

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
            <Clock className="w-6 h-6 text-warning" />
            <span>Retailers with No Order in 14 Days</span>
          </h1>
          <p className="text-sm text-ink-muted">
            Stores at risk of churn. Contact shopkeepers or dispatch field salesmen to collect orders.
          </p>
        </div>

        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-14 w-full rounded-card" />
            <Skeleton className="h-14 w-full rounded-card" />
          </div>
        )}

        {error && <ErrorState message={error} onRetry={fetchDormant} />}

        {!loading && !error && retailers.length === 0 && (
          <EmptyState
            title="All Retailers Active!"
            description="Every registered retailer has placed an order within the last 14 calendar days."
          />
        )}

        {!loading && !error && retailers.length > 0 && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200/80 p-4 rounded-card flex items-center justify-between text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
                <span>
                  <strong>{retailers.length} Kirana Stores</strong> are dormant (≥ 14 days without an order).
                </span>
              </div>
            </div>

            <div className="bg-surface border border-border rounded-card overflow-hidden shadow-xs">
              <table className="w-full text-left text-sm">
                <thead className="bg-background border-b border-border text-xs uppercase font-bold text-ink-muted">
                  <tr>
                    <th className="px-4 py-3">Retailer Shop</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Salesman</th>
                    <th className="px-4 py-3">Last Order</th>
                    <th className="px-4 py-3">Days Inactive</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {retailers.map((store) => (
                    <tr key={store.id} className="hover:bg-background/80 transition-colors">
                      <td className="px-4 py-3.5">
                        <strong className="block text-ink font-semibold flex items-center gap-1.5">
                          <Store className="w-3.5 h-3.5 text-ink-muted" />
                          <span>{store.shopName}</span>
                        </strong>
                        <span className="text-xs text-ink-muted">
                          {store.ownerName} · {store.phone}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-xs text-ink-muted">
                        {store.addressLine}
                      </td>

                      <td className="px-4 py-3.5 text-xs">
                        <span className="font-semibold text-ink block">{store.salesmanName}</span>
                        {store.salesmanPhone && (
                          <span className="text-ink-muted">{store.salesmanPhone}</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-xs tabular-nums">
                        {store.latestOrderDate ? (
                          <>
                            <span className="font-semibold text-ink block">
                              {store.latestOrderNo}
                            </span>
                            <span className="text-ink-muted">
                              {new Date(store.latestOrderDate).toLocaleDateString("en-IN")}
                            </span>
                          </>
                        ) : (
                          <span className="text-amber-800 font-semibold">Never Ordered</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 font-bold tabular-nums">
                        {store.daysSinceLastOrder === -1 ? (
                          <span className="text-danger">New / Inactive</span>
                        ) : (
                          <span className="text-danger">{store.daysSinceLastOrder} days ago</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <a
                          href={`tel:${store.phone}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-background border border-border rounded-card text-xs font-semibold text-ink hover:text-accent hover:border-accent transition-colors touch-target"
                        >
                          <Phone className="w-3.5 h-3.5 text-accent" />
                          <span>Call</span>
                        </a>
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

