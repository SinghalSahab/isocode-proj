"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/ui/Navbar";
import { BottomNav } from "@/components/ui/BottomNav";
import { Stepper } from "@/components/ui/Stepper";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";
import { EmptyState, ErrorState } from "@/components/ui/FeedbackStates";
import { ArrowLeft, CheckCircle2, AlertTriangle, Trash2, ShoppingBag, Tag } from "lucide-react";
import { formatINR } from "@/lib/money/paise";
import { t, Language } from "@/lib/i18n";

interface PricedLine {
  skuId: string;
  skuCode: string;
  orderedQty: number;
  freeQty: number;
  totalDispatchQty: number;
  casePricePaise: number;
  grossPaise: number;
  discountPaise: number;
  netPaise: number;
  gstPaise: number;
  totalPaise: number;
  appliedSchemeLabel: { key: string; params: Record<string, string | number> };
  nextSlabHint: { key: string; params: Record<string, string | number> } | null;
  stockOk: boolean;
  maxOrderableQty: number;
  warnings: string[];
}

interface CartSummary {
  lines: PricedLine[];
  totalCases: number;
  totalFreeCases: number;
  totalDispatchCases: number;
  grossPaise: number;
  discountPaise: number;
  netPaise: number;
  gstPaise: number;
  totalPaise: number;
  hasStockIssue: boolean;
  allStockOk: boolean;
  creditStatus: "OK" | "CREDIT_HOLD_PREVIEW";
  retailer: {
    creditLimitPaise: number;
    outstandingPaise: number;
    availableCreditPaise: number;
    exceedsCredit: boolean;
  };
}

export default function CartPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>("en");
  const [cartQuantities, setCartQuantities] = useState<Record<string, number>>({});
  const [pricing, setPricing] = useState<CartSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Read language cookie
  useEffect(() => {
    const match = document.cookie.match(/app_lang=(en|hi)/);
    if (match) setLang(match[1] as Language);

    const saved = localStorage.getItem("fmcg_cart");
    if (saved) {
      try {
        setCartQuantities(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
    setLoading(false);
  }, []);

  // Fetch server-authoritative live scheme re-pricing whenever cart quantities change
  const refreshCartPricing = useCallback(async (currentCart: Record<string, number>) => {
    const items = Object.entries(currentCart)
      .filter(([, qty]) => qty > 0)
      .map(([skuId, qtyCases]) => ({ skuId, qtyCases }));

    if (items.length === 0) {
      setPricing(null);
      return;
    }

    try {
      const res = await fetch("/api/cart/price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error("Price calculation failed");
      const data = await res.json();
      setPricing(data);
    } catch {
      setError("Unable to calculate cart schemes and prices.");
    }
  }, []);

  useEffect(() => {
    if (!loading) {
      refreshCartPricing(cartQuantities);
    }
  }, [cartQuantities, loading, refreshCartPricing]);

  const updateQuantity = (skuId: string, qty: number) => {
    const updated = { ...cartQuantities };
    if (qty <= 0) {
      delete updated[skuId];
    } else {
      updated[skuId] = qty;
    }
    setCartQuantities(updated);
    localStorage.setItem("fmcg_cart", JSON.stringify(updated));
  };

  const removeItem = (skuId: string) => {
    updateQuantity(skuId, 0);
  };

  const handlePlaceOrder = async () => {
    if (!pricing || pricing.lines.length === 0) return;
    setSubmitting(true);
    setError(null);

    // Generate unique client idempotency key
    const idempotencyKey = `cart-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey,
          source: "app",
          lines: pricing.lines.map((l) => ({
            skuId: l.skuId,
            qtyCases: l.orderedQty,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to place order.");
      }

      // Clear local cart
      localStorage.removeItem("fmcg_cart");
      setCartQuantities({});

      // Redirect to orders page with placed order
      router.push(`/orders?placed=${data.order.orderNo}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error placing order.");
      setSubmitting(false);
      setShowConfirmModal(false);
    }
  };

  const hasItems = Object.keys(cartQuantities).length > 0 && pricing && pricing.lines.length > 0;

  return (
    <div className="min-h-screen bg-background pb-28">
      <Navbar
        role="retailer"
        cartCount={pricing?.lines.length || 0}
        currentLang={lang}
        onLanguageToggle={() => setLang(lang === "en" ? "hi" : "en")}
      />

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Header Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/catalogue"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline touch-target"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{lang === "hi" ? "सामान सूची पर वापस" : "Back to Catalogue"}</span>
          </Link>
          <h1 className="text-xl font-bold text-ink">
            {t("cart.title", {}, lang)}
          </h1>
        </div>

        {error && (
          <ErrorState
            title="Cart Notice"
            message={error}
            onRetry={() => refreshCartPricing(cartQuantities)}
          />
        )}

        {/* Empty Cart */}
        {!hasItems && !loading && (
          <EmptyState
            icon={<ShoppingBag className="w-12 h-12 text-ink-muted/50 stroke-[1.5]" />}
            title={t("cart.empty_title", {}, lang)}
            description={t("cart.empty_subtitle", {}, lang)}
            actionText={t("cart.browse_catalogue", {}, lang)}
            onAction={() => router.push("/catalogue")}
          />
        )}

        {/* Cart Line Items */}
        {hasItems && pricing && (
          <div className="space-y-3">
            {pricing.lines.map((line) => {
              return (
                <div
                  key={line.skuId}
                  className="bg-surface border border-border rounded-card p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-base text-ink leading-tight">
                        {line.skuCode}
                      </h3>
                      <p className="text-xs text-ink-muted mt-0.5">
                        {formatINR(line.casePricePaise)} / case · excl. GST
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(line.skuId)}
                      aria-label="Remove item"
                      className="text-ink-muted hover:text-danger p-1.5 rounded-lg hover:bg-red-50 transition-colors touch-target"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Stepper & Line Amounts */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/60">
                    <Stepper
                      value={line.orderedQty}
                      onChange={(qty) => updateQuantity(line.skuId, qty)}
                      min={0}
                      max={line.maxOrderableQty || 999}
                    />

                    <div className="text-right">
                      <div className="font-bold text-base text-ink tabular-nums">
                        {formatINR(line.netPaise)}
                      </div>
                      <div className="text-[11px] text-ink-muted tabular-nums">
                        + {formatINR(line.gstPaise)} GST
                      </div>
                    </div>
                  </div>

                  {/* Scheme Badges & Highlights */}
                  {line.freeQty > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-accent font-semibold bg-accent-subtle/80 px-2.5 py-1.5 rounded-md">
                      <Tag className="w-3.5 h-3.5" />
                      <span>
                        {line.freeQty} free {line.freeQty === 1 ? "case" : "cases"} added! (Total dispatch: {line.totalDispatchQty} cases)
                      </span>
                    </div>
                  )}

                  {line.discountPaise > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-accent font-semibold bg-accent-subtle/80 px-2.5 py-1.5 rounded-md">
                      <Tag className="w-3.5 h-3.5" />
                      <span>
                        Scheme savings: {formatINR(line.discountPaise)} discount applied
                      </span>
                    </div>
                  )}

                  {/* Scheme Nudge Hint */}
                  {line.nextSlabHint && (
                    <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                      {line.nextSlabHint.key === "HINT_ADD_MORE_FREE" ? (
                        <span>
                          Add {line.nextSlabHint.params.needed} more case to get {line.nextSlabHint.params.freeQty} free case!
                        </span>
                      ) : (
                        <span>
                          Add {line.nextSlabHint.params.needed} more case to get {line.nextSlabHint.params.percent}% off!
                        </span>
                      )}
                    </div>
                  )}

                  {/* Stock Warnings */}
                  {!line.stockOk && (
                    <div className="text-xs text-danger bg-danger-surface border border-danger/30 px-2.5 py-1.5 rounded-md flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>
                        Insufficient stock! Max available to order: {line.maxOrderableQty} cases.
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Totals Summary Block */}
            <div className="bg-surface border border-border rounded-card p-4 space-y-2.5 shadow-xs">
              <h4 className="font-bold text-sm uppercase tracking-wider text-ink-muted">
                Order Summary
              </h4>

              <div className="flex justify-between text-sm text-ink-muted">
                <span>{t("cart.subtotal", {}, lang)} ({pricing.totalCases} cases)</span>
                <span className="font-medium text-ink tabular-nums">
                  {formatINR(pricing.grossPaise)}
                </span>
              </div>

              {pricing.discountPaise > 0 && (
                <div className="flex justify-between text-sm text-accent font-semibold">
                  <span>{t("cart.scheme_discount", {}, lang)}</span>
                  <span className="tabular-nums">- {formatINR(pricing.discountPaise)}</span>
                </div>
              )}

              {pricing.totalFreeCases > 0 && (
                <div className="flex justify-between text-sm text-accent font-semibold">
                  <span>Free Bonus Goods</span>
                  <span>{pricing.totalFreeCases} cases</span>
                </div>
              )}

              <div className="flex justify-between text-sm text-ink-muted">
                <span>{t("cart.gst", {}, lang)} (Statutory)</span>
                <span className="font-medium text-ink tabular-nums">
                  + {formatINR(pricing.gstPaise)}
                </span>
              </div>

              <div className="pt-2.5 border-t border-border flex justify-between items-baseline">
                <div>
                  <span className="text-base font-bold text-ink block">
                    {t("cart.total", {}, lang)}
                  </span>
                  <span className="text-xs text-ink-muted">
                    Total dispatch: {pricing.totalDispatchCases} cases
                  </span>
                </div>
                <span className="text-2xl font-extrabold text-accent tabular-nums">
                  {formatINR(pricing.totalPaise)}
                </span>
              </div>
            </div>

            {/* Credit Status Preview Banner */}
            {pricing.creditStatus === "CREDIT_HOLD_PREVIEW" ? (
              <Banner variant="warning" title="Credit Hold Preview">
                {t("cart.credit_status_hold", {}, lang)} Available limit is{" "}
                <strong>{formatINR(pricing.retailer.availableCreditPaise)}</strong>.
                You can still place the order; the desk will review and release it.
              </Banner>
            ) : (
              <Banner variant="demo" title="Credit Approved">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-accent" />
                  <span>{t("cart.credit_status_ok", {}, lang)}</span>
                </div>
              </Banner>
            )}

            {/* Place Order Primary Action Button */}
            <Button
              variant="primary"
              size="lg"
              disabled={!pricing.allStockOk || submitting}
              disabledReason={
                !pricing.allStockOk
                  ? "Please adjust quantities for items exceeding stock."
                  : undefined
              }
              onClick={() => setShowConfirmModal(true)}
              className="w-full text-lg shadow-md"
            >
              {t("cart.place_order", {}, lang)} · {formatINR(pricing.totalPaise)}
            </Button>
          </div>
        )}
      </main>

      {/* Confirmation Modal */}
      {showConfirmModal && pricing && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-surface border border-border rounded-card p-6 max-w-sm w-full shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-ink">
              {t("cart.confirm_order_title", {}, lang)}
            </h3>
            <p className="text-sm text-ink-muted">
              {t("cart.confirm_order_desc", {}, lang)}
            </p>

            <div className="bg-background p-3 rounded-lg border border-border/70 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-muted">Ordered Items:</span>
                <span className="font-semibold text-ink">{pricing.lines.length} lines</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Total Dispatch:</span>
                <span className="font-semibold text-ink">{pricing.totalDispatchCases} cases</span>
              </div>
              <div className="flex justify-between text-base font-bold text-accent pt-1 border-t border-border/50">
                <span>Total Amount:</span>
                <span className="tabular-nums">{formatINR(pricing.totalPaise)}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setShowConfirmModal(false)}
                disabled={submitting}
                className="flex-1"
              >
                {t("cart.cancel", {}, lang)}
              </Button>
              <Button
                variant="primary"
                size="md"
                loading={submitting}
                onClick={handlePlaceOrder}
                className="flex-1"
              >
                {t("cart.confirm_submit", {}, lang)}
              </Button>
            </div>
          </div>
        </div>
      )}

      <BottomNav cartCount={pricing?.lines.length || 0} lang={lang} />
    </div>
  );
}

