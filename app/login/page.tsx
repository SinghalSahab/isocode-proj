"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Globe, Phone, KeyRound, Sparkles, ArrowRight } from "lucide-react";
import { t, Language } from "@/lib/i18n";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/";

  const [lang, setLang] = useState<Language>("en");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("123456");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleLang = () => {
    const next = lang === "en" ? "hi" : "en";
    setLang(next);
    document.cookie = `app_lang=${next}; path=/; max-age=31536000`;
  };

  const handleSendOtp = async (targetPhone?: string) => {
    setError(null);
    setLoading(true);
    const activePhone = targetPhone || phone;

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: activePhone }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to send OTP.");
        setLoading(false);
        return;
      }

      if (data.demoOtp) {
        setOtp(data.demoOtp);
      }
      setPhone(activePhone);
      setStep("otp");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: otp }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Invalid OTP code.");
        setLoading(false);
        return;
      }

      // Successful verification
      router.push(returnTo !== "/" ? returnTo : data.redirectUrl);
      router.refresh();
    } catch {
      setError("Verification failed. Please try again.");
      setLoading(false);
    }
  };

  const handleQuickDemo = (demoPhone: string) => {
    setPhone(demoPhone);
    handleSendOtp(demoPhone);
  };

  return (
    <main className="min-h-screen bg-background flex flex-col justify-between p-4 sm:p-6 max-w-md mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-accent text-white flex items-center justify-center font-extrabold text-base">
            A
          </span>
          <span className="font-bold text-ink text-base tracking-tight">
            Company A
          </span>
        </div>

        <button
          type="button"
          onClick={toggleLang}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-card border border-border bg-surface text-xs font-semibold text-ink hover:bg-background transition-colors touch-target"
        >
          <Globe className="w-4 h-4 text-accent" />
          <span>{lang === "en" ? "हिन्दी" : "English"}</span>
        </button>
      </div>

      {/* Main Login Card */}
      <div className="bg-surface border border-border rounded-card p-6 shadow-sm my-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-ink leading-tight">
            {t("login.title", {}, lang)}
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            {t("login.subtitle", {}, lang)}
          </p>
        </div>

        {/* Demo Mode Notice Banner */}
        <Banner variant="demo" className="mb-5">
          <div className="font-semibold">{t("app.demo_banner", {}, lang)}</div>
          <div className="text-xs text-emerald-800 mt-0.5">
            Use any seeded test account or select from the quick logins below.
          </div>
        </Banner>

        {error && (
          <div
            role="alert"
            className="mb-4 p-3 bg-danger-surface border border-danger/30 text-danger text-sm rounded-card"
          >
            {error}
          </div>
        )}

        {step === "phone" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendOtp();
            }}
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="phone-input"
                className="block text-sm font-semibold text-ink mb-1.5"
              >
                {t("login.phone_label", {}, lang)}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted">
                  <Phone className="w-5 h-5" />
                </span>
                <input
                  id="phone-input"
                  type="tel"
                  required
                  autoFocus
                  placeholder={t("login.phone_placeholder", {}, lang)}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-12 pl-11 pr-4 bg-background border border-border rounded-card text-ink text-base focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent font-medium tabular-nums"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              disabled={phone.trim().length < 10}
            >
              {t("login.send_otp", {}, lang)}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="otp-input"
                  className="block text-sm font-semibold text-ink"
                >
                  {t("login.otp_title", {}, lang)}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setStep("phone");
                    setError(null);
                  }}
                  className="text-xs text-accent font-semibold hover:underline"
                >
                  {t("login.change_phone", {}, lang)}
                </button>
              </div>

              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted">
                  <KeyRound className="w-5 h-5" />
                </span>
                <input
                  id="otp-input"
                  type="text"
                  required
                  autoFocus
                  maxLength={6}
                  placeholder={t("login.otp_placeholder", {}, lang)}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full h-12 pl-11 pr-4 bg-background border border-border rounded-card text-ink text-lg tracking-widest text-center focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent font-bold tabular-nums"
                />
              </div>
              <p className="text-xs text-ink-muted mt-1.5">
                {t("login.otp_subtitle", {}, lang)}{" "}
                <strong className="text-ink font-semibold">{phone}</strong>
              </p>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              disabled={otp.trim().length < 4}
            >
              {t("login.verify_otp", {}, lang)}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => handleSendOtp()}
                className="text-xs font-semibold text-ink-muted hover:text-accent"
              >
                {t("login.resend_otp", {}, lang)}
              </button>
            </div>
          </form>
        )}

        {/* Quick Reviewer Logins Section */}
        <div className="mt-8 pt-6 border-t border-border">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-muted mb-3">
            <Sparkles className="w-4 h-4 text-accent" />
            <span>{t("login.quick_demo", {}, lang)}</span>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => handleQuickDemo("9000000001")}
              className="w-full text-left p-2.5 rounded-card border border-border hover:border-accent hover:bg-background transition-colors flex items-center justify-between text-xs"
            >
              <div>
                <strong className="block text-ink">
                  {t("login.demo_retailer", {}, lang)}
                </strong>
                <span className="text-ink-muted">90000 00001 · Ramesh Gupta</span>
              </div>
              <ArrowRight className="w-4 h-4 text-ink-muted" />
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo("9000000002")}
              className="w-full text-left p-2.5 rounded-card border border-warning/40 bg-amber-50/50 hover:bg-amber-50 transition-colors flex items-center justify-between text-xs"
            >
              <div>
                <strong className="block text-warning font-semibold">
                  {t("login.demo_credit_hold", {}, lang)}
                </strong>
                <span className="text-ink-muted">90000 00002 · ₹2,500 credit left</span>
              </div>
              <ArrowRight className="w-4 h-4 text-warning" />
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo("9000000003")}
              className="w-full text-left p-2.5 rounded-card border border-border hover:border-accent hover:bg-background transition-colors flex items-center justify-between text-xs"
            >
              <div>
                <strong className="block text-ink">
                  {t("login.demo_price_override", {}, lang)}
                </strong>
                <span className="text-ink-muted">90000 00003 · Glucose @ ₹7.80</span>
              </div>
              <ArrowRight className="w-4 h-4 text-ink-muted" />
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo("9000000010")}
              className="w-full text-left p-2.5 rounded-card border border-accent/40 bg-emerald-50/50 hover:bg-emerald-50 transition-colors flex items-center justify-between text-xs"
            >
              <div>
                <strong className="block text-accent font-semibold">
                  {t("login.demo_desk", {}, lang)}
                </strong>
                <span className="text-ink-muted">90000 00010 · Order Desk</span>
              </div>
              <ArrowRight className="w-4 h-4 text-accent" />
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-ink-muted py-2">
        Company A FMCG Distribution · Jabalpur, MP
      </footer>
    </main>
  );
}
