"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { DeskNav } from "@/components/ui/DeskNav";
import { OrderStatusBadge, Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/FeedbackStates";
import { Search, Sparkles, AlertTriangle, ArrowUpRight, CheckCircle2, Inbox } from "lucide-react";
import { formatINR } from "@/lib/money/paise";

interface Order {
  id: string;
  orderNo: string;
  status: string;
  source: string;
  totalPaise: number;
  placedAt: string;
  retailer: {
    id: string;
    shopName: string;
    ownerName: string;
    phone: string;
  };
  lines: Array<{
    id: string;
    orderedQty: number;
    freeQty: number;
    sku: {
      code: string;
    };
  }>;
}

interface KPIs {
  todayOrders: number;
  creditHolds: number;
  aiSharePercent: number;
  aiAccuracyPercent: number;
}

export default function DeskOrderQueuePage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchOrders();
  }, [activeTab, searchQuery]);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (activeTab !== "ALL") params.set("status", activeTab);
    if (searchQuery.trim()) params.set("q", searchQuery.trim());

    try {
      const res = await fetch(`/api/desk/orders?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load queue");
      const data = await res.json();
      setOrders(data.orders || []);
      setKpis(data.kpis);
    } catch {
      setError("Unable to load order queue.");
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { key: "ALL", label: "All Orders" },
    { key: "CREDIT_HOLD", label: "Credit Holds" },
    { key: "PENDING_REVIEW", label: "Pending Review" },
    { key: "CONFIRMED", label: "Confirmed" },
    { key: "EXPORTED", label: "Exported" },
    { key: "REJECTED", label: "Rejected" },
  ];

  return (
    <div className="flex min-h-screen bg-background text-ink">
      {/* Desktop Left Nav */}
      <DeskNav />

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 max-w-6xl overflow-y-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              Order Queue & Dashboard
            </h1>
            <p className="text-sm text-ink-muted">
              Company A · 1,800 kirana shops · Real-time order dispatch
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/desk/export">
              <Button variant="outline" size="sm">
                Tally Export
              </Button>
            </Link>
          </div>
        </div>

        {/* Top KPI Cards */}
        {kpis && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-surface border border-border p-4 rounded-card shadow-xs">
              <span className="text-xs font-semibold text-ink-muted block uppercase">
                Today&apos;s Orders
              </span>
              <span className="text-2xl font-extrabold text-ink tabular-nums mt-1 block">
                {kpis.todayOrders}
              </span>
            </div>

            <div className="bg-surface border border-warning/40 p-4 rounded-card shadow-xs bg-amber-50/30">
              <span className="text-xs font-semibold text-warning block uppercase flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Credit Holds</span>
              </span>
              <span className="text-2xl font-extrabold text-warning tabular-nums mt-1 block">
                {kpis.creditHolds}
              </span>
            </div>

            <div className="bg-surface border border-border p-4 rounded-card shadow-xs">
              <span className="text-xs font-semibold text-ink-muted block uppercase flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                <span>App / AI Share</span>
              </span>
              <span className="text-2xl font-extrabold text-accent tabular-nums mt-1 block">
                {kpis.aiSharePercent}%
              </span>
            </div>

            <div className="bg-surface border border-border p-4 rounded-card shadow-xs">
              <span className="text-xs font-semibold text-ink-muted block uppercase flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                <span>AI Accuracy</span>
              </span>
              <span className="text-2xl font-extrabold text-ink tabular-nums mt-1 block">
                {kpis.aiAccuracyPercent}%
              </span>
            </div>
          </div>
        )}

        {/* Search & Tabs Toolbar */}
        <div className="space-y-3">
          {/* Search Box */}
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by order number, shop name, or phone..."
              className="w-full h-11 pl-10 pr-4 bg-surface border border-border rounded-card text-sm focus:outline-none focus:ring-2 focus:ring-accent shadow-xs"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-border">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-3.5 py-2 text-xs font-semibold whitespace-nowrap rounded-t-lg transition-colors border-b-2 ${
                  activeTab === tab.key
                    ? "border-accent text-accent bg-accent-subtle/40"
                    : "border-transparent text-ink-muted hover:text-ink hover:bg-surface"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-card" />
            <Skeleton className="h-16 w-full rounded-card" />
            <Skeleton className="h-16 w-full rounded-card" />
          </div>
        )}

        {error && (
          <ErrorState
            title="Queue Error"
            message={error}
            onRetry={fetchOrders}
          />
        )}

        {/* Empty State */}
        {!loading && !error && orders.length === 0 && (
          <EmptyState
            icon={<Inbox className="w-12 h-12 text-ink-muted/50 stroke-[1.5]" />}
            title="No Orders in this View"
            description="No orders currently match the selected status filter or search query."
          />
        )}

        {/* Orders Table */}
        {!loading && !error && orders.length > 0 && (
          <div className="bg-surface border border-border rounded-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-background border-b border-border text-xs uppercase font-bold text-ink-muted">
                  <tr>
                    <th className="px-4 py-3">Order No</th>
                    <th className="px-4 py-3">Shop & Retailer</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Cases</th>
                    <th className="px-4 py-3">Total Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orders.map((order) => {
                    const totalCases = order.lines.reduce(
                      (s, l) => s + l.orderedQty + l.freeQty,
                      0
                    );

                    const timeStr = new Date(order.placedAt).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <tr key={order.id} className="hover:bg-background/80 transition-colors">
                        <td className="px-4 py-3.5 font-bold tabular-nums text-ink">
                          {order.orderNo}
                        </td>
                        <td className="px-4 py-3.5">
                          <strong className="block text-ink font-semibold">
                            {order.retailer.shopName}
                          </strong>
                          <span className="text-xs text-ink-muted">
                            {order.retailer.ownerName} · {order.retailer.phone}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-block bg-background border border-border px-2 py-0.5 rounded text-xs font-mono uppercase">
                            {order.source}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 tabular-nums text-ink">
                          {totalCases} cases
                        </td>
                        <td className="px-4 py-3.5 font-bold text-ink tabular-nums">
                          {formatINR(order.totalPaise)}
                        </td>
                        <td className="px-4 py-3.5">
                          <OrderStatusBadge status={order.status} />
                        </td>
                        <td className="px-4 py-3.5 text-xs text-ink-muted tabular-nums">
                          {timeStr}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <Link href={`/desk/${order.id}`}>
                            <Button variant="secondary" size="sm" className="inline-flex items-center gap-1">
                              <span>Review</span>
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
