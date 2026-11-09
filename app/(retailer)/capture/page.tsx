"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/ui/Navbar";
import { BottomNav } from "@/components/ui/BottomNav";
import { Stepper } from "@/components/ui/Stepper";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";
import { ConfidencePill, StockBadge, Badge } from "@/components/ui/Badge";
import { formatINR } from "@/lib/money/paise";
import { validatePieceConversion } from "@/lib/capture/units";
import {
  Sparkles,
  ClipboardPaste,
  ArrowLeft,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  HelpCircle,
  RotateCw,
} from "lucide-react";
import { t, Language } from "@/lib/i18n";
import { DraftLine, CaptureDraft } from "@/lib/capture/types";

export default function OrderByMessagePage() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>("en");
  const [step, setStep] = useState<"input" | "review">("input");
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Capture Draft State
  const [draft, setDraft] = useState<CaptureDraft | null>(null);
  const [editableLines, setEditableLines] = useState<DraftLine[]>([]);

  useEffect(() => {
    const match = document.cookie.match(/app_lang=(en|hi)/);
    if (match) setLang(match[1] as Language);
  }, []);

  const handlePasteSample = () => {
    setInputText("bhaiya 5 peti biscuit chhota, 2 peti washing powder 1 kilo, chai patti 250 wala 1 peti");
  };

  const handleProcessCapture = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to process message.");
      }

      setDraft(data.draft);
      setEditableLines(data.draft.lines);
      setStep("review");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Capture processing failed.");
    } finally {
      setLoading(false);
    }
  };

  // Line edits
  const handleUpdateLineQty = (lineId: string, nextQty: number) => {
    setEditableLines((prev) =>
      prev.map((l) => (l.id === lineId ? { ...l, quantityCases: nextQty } : l))
    );
  };

  const handleRemoveLine = (lineId: string) => {
    setEditableLines((prev) => prev.filter((l) => l.id !== lineId));
  };

  const handleSwapSku = (lineId: string, altSku: { id: string; code: string; nameEn: string; nameHi: string }) => {
    setEditableLines((prev) =>
      prev.map((l) => {
        if (l.id !== lineId) return l;
        return {
          ...l,
          matchedSku: {
            id: altSku.id,
            code: altSku.code,
            nameEn: altSku.nameEn,
            nameHi: altSku.nameHi,
            brand: "Distributor",
            piecesPerCase: 24,
            casePricePaise: l.matchedSku?.casePricePaise || 100000,
            stockCases: 50,
            imageKey: "biscuit-75g",
          },
          status: "READY",
          needsUnitClarification: false,
          confidence: "High",
        };
      })
    );
  };

  // Unit Clarification Answer
  const handleResolveUnit = (lineId: string, chosenUnit: "case" | "piece") => {
    setEditableLines((prev) =>
      prev.map((l) => {
        if (l.id !== lineId) return l;

        if (chosenUnit === "case") {
          return {
            ...l,
            detectedUnit: "case",
            needsUnitClarification: false,
            status: l.matchedSku && l.matchedSku.stockCases > 0 ? "READY" : "OUT_OF_STOCK",
          };
        } else {
          // Chosen unit is pieces -> validate piece conversion
          const piecesPerCase = l.matchedSku?.piecesPerCase || 20;
          const pieces = l.quantityCases; // original number entered
          const conv = validatePieceConversion(pieces, piecesPerCase);

          if (!conv.success) {
            alert(conv.error);
            return l;
          }

          return {
            ...l,
            detectedUnit: "case",
            quantityCases: conv.cases,
            needsUnitClarification: false,
            status: l.matchedSku && l.matchedSku.stockCases > 0 ? "READY" : "OUT_OF_STOCK",
          };
        }
      })
    );
  };

  // Check if all lines are ready for order confirmation
  const isReadyToConfirm =
    editableLines.length > 0 &&
    editableLines.every(
      (l) => l.status === "READY" && l.matchedSku && l.matchedSku.stockCases > 0
    );

  const totalCasesCount = editableLines.reduce(
    (sum, l) => (l.status === "READY" ? sum + l.quantityCases : sum),
    0
  );

  const approxTotalPaise = editableLines.reduce((sum, l) => {
    if (l.status === "READY" && l.matchedSku) {
      const gross = l.quantityCases * l.matchedSku.casePricePaise;
      const gst = Math.round(gross * 0.18);
      return sum + gross + gst;
    }
    return sum;
  }, 0);

  const handleConfirmOrder = async () => {
    if (!isReadyToConfirm || confirming) return;
    setConfirming(true);
    setError(null);

    const idempotencyKey = `ai-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey,
          source: "ai_text",
          captureId: draft?.captureId,
          lines: editableLines
            .filter((l) => l.status === "READY" && l.matchedSku)
            .map((l) => ({
              skuId: l.matchedSku!.id,
              qtyCases: l.quantityCases,
              originalText: l.originalText,
              aiConfidence: l.confidence,
            })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to confirm AI order.");
      }

      router.push(`/orders?placed=${data.order.orderNo}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Confirmation failed.");
      setConfirming(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <Navbar
        role="retailer"
        currentLang={lang}
        onLanguageToggle={() => setLang(lang === "en" ? "hi" : "en")}
      />

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {step === "input" ? (
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-bold text-ink">
                {t("capture.title", {}, lang)}
              </h1>
              <p className="text-sm text-ink-muted mt-0.5">
                {t("capture.subtitle", {}, lang)}
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="p-3 bg-danger-surface border border-danger/30 text-danger text-sm rounded-card"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleProcessCapture} className="space-y-3">
              <div className="relative">
                <textarea
                  rows={5}
                  maxLength={1000}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={t("capture.placeholder", {}, lang)}
                  className="w-full p-4 bg-surface border border-border rounded-card text-ink text-base focus:outline-none focus:ring-2 focus:ring-accent leading-relaxed shadow-xs resize-none"
                />

                <div className="flex items-center justify-between text-xs text-ink-muted px-1 mt-1">
                  <span>{t("capture.hint", {}, lang)}</span>
                  <span className="tabular-nums font-medium">
                    {inputText.length} / 1000
                  </span>
                </div>
              </div>

              {/* Paste sample helper */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handlePasteSample}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline touch-target"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  <span>Paste Sample WhatsApp Message</span>
                </button>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                disabled={!inputText.trim()}
                className="w-full text-base font-semibold shadow-md flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                <span>
                  {loading
                    ? t("capture.converting", {}, lang)
                    : t("capture.convert_button", {}, lang)}
                </span>
              </Button>
            </form>
          </div>
        ) : (
          /* Step 2: Review Screen */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep("input")}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline touch-target"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t("capture.back_to_edit", {}, lang)}</span>
              </button>

              <h2 className="text-lg font-bold text-ink">
                {t("capture.review_title", {}, lang)}
              </h2>
            </div>

            {/* Fallback honest banner if AI was offline or errored */}
            {draft?.isFallback && (
              <Banner variant="warning" title="AI Fallback Mode">
                {t("app.fallback_banner", {}, lang)}
              </Banner>
            )}

            {error && (
              <div
                role="alert"
                className="p-3 bg-danger-surface border border-danger/30 text-danger text-sm rounded-card"
              >
                {error}
              </div>
            )}

            {/* Draft Lines List */}
            <div className="space-y-3">
              {editableLines.map((line) => {
                const displayName =
                  lang === "hi"
                    ? line.matchedSku?.nameHi || line.matchedSku?.nameEn
                    : line.matchedSku?.nameEn;

                const isOutOfStock = line.status === "OUT_OF_STOCK";

                return (
                  <div
                    key={line.id}
                    className={`bg-surface border rounded-card p-4 space-y-3 transition-colors ${isOutOfStock
                        ? "border-danger/40 bg-red-50/20"
                        : line.needsUnitClarification
                          ? "border-warning/50 bg-amber-50/20"
                          : "border-border shadow-xs"
                      }`}
                  >
                    {/* Top Row: Original words chip & Confidence pill */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="inline-flex items-center gap-1.5 bg-background border border-border px-2.5 py-1 rounded-md text-xs font-mono text-ink-muted">
                        <span className="font-semibold text-ink">“{line.originalText}”</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <ConfidencePill confidence={line.confidence} />
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(line.id)}
                          aria-label="Remove line"
                          className="text-ink-muted hover:text-danger p-1 rounded-md touch-target"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Matched SKU Title & Code */}
                    {line.matchedSku ? (
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-base text-ink leading-tight">
                            {displayName}
                          </h3>
                          <p className="text-xs text-ink-muted mt-0.5">
                            SKU: {line.matchedSku.code} · {formatINR(line.matchedSku.casePricePaise)} / case
                          </p>
                        </div>
                        <StockBadge stockCases={line.matchedSku.stockCases} />
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                        {t("capture.unmatched", {}, lang)}
                      </div>
                    )}

                    {/* Unit Clarification Prompt (NEEDS_UNIT) */}
                    {line.needsUnitClarification && (
                      <div className="p-3 bg-amber-50/90 border border-amber-300 rounded-card space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                          <HelpCircle className="w-4 h-4 text-amber-700" />
                          <span>{t("capture.unit_question", {}, lang)}</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleResolveUnit(line.id, "case")}
                            className="flex-1 py-2.5 px-3 bg-surface border border-amber-300 rounded-card font-bold text-xs text-ink hover:bg-amber-100 transition-colors touch-target shadow-xs"
                          >
                            {t("capture.unit_cases", {}, lang)}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResolveUnit(line.id, "piece")}
                            className="flex-1 py-2.5 px-3 bg-surface border border-amber-300 rounded-card font-bold text-xs text-ink hover:bg-amber-100 transition-colors touch-target shadow-xs"
                          >
                            {t("capture.unit_pieces", {}, lang)}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Out of Stock Warning */}
                    {isOutOfStock && (
                      <div className="p-2.5 bg-danger-surface border border-danger/30 rounded-lg text-xs text-danger flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong>Out of stock:</strong> This item cannot be fulfilled right now. Remove this line or tap an alternative below.
                        </div>
                      </div>
                    )}

                    {/* Alternative Options Chips (tappable to swap) */}
                    {line.alternatives.length > 0 && (
                      <div className="pt-2 border-t border-border/50">
                        <span className="text-[11px] font-semibold text-ink-muted block mb-1.5">
                          {t("capture.alternatives", {}, lang)}
                        </span>
                        <div className="flex gap-2 flex-wrap">
                          {line.alternatives.map((alt) => (
                            <button
                              key={alt.id}
                              type="button"
                              onClick={() => handleSwapSku(line.id, alt)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-background border border-border rounded-pill text-xs text-ink font-medium hover:border-accent hover:text-accent transition-colors touch-target"
                            >
                              <RotateCw className="w-3 h-3 text-ink-muted" />
                              <span>{alt.code}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Stepper & Price Row (when ready) */}
                    {line.status === "READY" && line.matchedSku && (
                      <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                        <Stepper
                          value={line.quantityCases}
                          onChange={(val) => handleUpdateLineQty(line.id, val)}
                          min={1}
                          max={line.matchedSku.stockCases}
                        />

                        <div className="text-right">
                          <span className="font-bold text-base text-ink tabular-nums block">
                            {formatINR(line.quantityCases * line.matchedSku.casePricePaise)}
                          </span>
                          <span className="text-[11px] text-ink-muted">excl. GST</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Sticky Order Confirmation Summary Bar */}
            <aside
              aria-label="Order confirmation bar"
              className="fixed bottom-16 sm:bottom-4 left-4 right-4 max-w-2xl mx-auto z-30 bg-surface/98 backdrop-blur-md border border-border rounded-card p-4 shadow-xl space-y-3"
            >
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="font-bold text-sm text-ink block">
                    {editableLines.filter((l) => l.status === "READY").length} lines · {totalCasesCount} cases
                  </span>
                  <span className="text-xs text-ink-muted">
                    Est. total: ~{formatINR(approxTotalPaise)} (incl. GST)
                  </span>
                </div>

                {!isReadyToConfirm && (
                  <span className="text-xs font-semibold text-danger">
                    Resolve all lines to proceed
                  </span>
                )}
              </div>

              <Button
                variant="primary"
                size="lg"
                loading={confirming}
                disabled={!isReadyToConfirm || confirming}
                disabledReason={
                  !isReadyToConfirm
                    ? "Every line must be matched, in-stock, and have its unit confirmed before placing the order."
                    : undefined
                }
                onClick={handleConfirmOrder}
                className="w-full text-base font-bold shadow-sm"
              >
                <span>{t("capture.confirm_capture", {}, lang)}</span>
                <ArrowRight className="w-4 h-4 ml-2 inline" />
              </Button>
            </aside>
          </div>
        )}
      </main>

      <BottomNav lang={lang} />
    </div>
  );
}

