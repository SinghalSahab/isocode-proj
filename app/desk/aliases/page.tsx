"use client";

import React, { useEffect, useState } from "react";
import { DeskNav } from "@/components/ui/DeskNav";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/FeedbackStates";
import { BookmarkCheck, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface RetailerAliasItem {
  id: string;
  phraseNormalised: string;
  timesConfirmed: number;
  lastUsedAt: string;
  retailer: {
    shopName: string;
    phone: string;
  };
  sku: {
    code: string;
    nameEn: string;
  };
}

export default function DeskAliasesPage() {
  const [aliases, setAliases] = useState<RetailerAliasItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAliases();
  }, []);

  const fetchAliases = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/desk/aliases");
      if (!res.ok) throw new Error("Failed to load aliases");
      const data = await res.json();
      setAliases(data.aliases || []);
    } catch {
      setError("Unable to load retailer aliases.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this retailer keyword alias?")) return;
    try {
      const res = await fetch(`/api/desk/aliases?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setAliases((prev) => prev.filter((a) => a.id !== id));
    } catch {
      alert("Failed to delete alias.");
    }
  };

  return (
    <div className="flex min-h-screen bg-background text-ink">
      <DeskNav />

      <main className="flex-1 p-4 sm:p-6 max-w-5xl space-y-5 overflow-y-auto">
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
            <BookmarkCheck className="w-6 h-6 text-accent" />
            <span>Learned Retailer Aliases</span>
          </h1>
          <p className="text-sm text-ink-muted">
            Phrases automatically learned from desk corrections and review swaps. Used first in future AI captures.
          </p>
        </div>

        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-14 w-full rounded-card" />
            <Skeleton className="h-14 w-full rounded-card" />
          </div>
        )}

        {error && <ErrorState message={error} onRetry={fetchAliases} />}

        {!loading && !error && aliases.length === 0 && (
          <EmptyState
            title="No Retailer Aliases Yet"
            description="When the desk corrects an item or a retailer swaps an alternative, aliases are automatically recorded here."
          />
        )}

        {!loading && !error && aliases.length > 0 && (
          <div className="bg-surface border border-border rounded-card overflow-hidden shadow-xs">
            <table className="w-full text-left text-sm">
              <thead className="bg-background border-b border-border text-xs uppercase font-bold text-ink-muted">
                <tr>
                  <th className="px-4 py-3">Retailer Shop</th>
                  <th className="px-4 py-3">Captured Phrase</th>
                  <th className="px-4 py-3">Mapped SKU</th>
                  <th className="px-4 py-3 text-center">Confirmations</th>
                  <th className="px-4 py-3">Last Used</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {aliases.map((item) => (
                  <tr key={item.id} className="hover:bg-background/80 transition-colors">
                    <td className="px-4 py-3 font-semibold text-ink">
                      <div>{item.retailer.shopName}</div>
                      <div className="text-xs text-ink-muted">{item.retailer.phone}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-xs text-amber-900 font-semibold">
                        “{item.phraseNormalised}”
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-ink">{item.sku.code}</div>
                      <div className="text-xs text-ink-muted">{item.sku.nameEn}</div>
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums font-bold text-accent">
                      {item.timesConfirmed}x
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-muted">
                      {new Date(item.lastUsedAt).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                        className="text-ink-muted hover:text-danger"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

