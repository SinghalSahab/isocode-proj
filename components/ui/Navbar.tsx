"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag, Globe, LogOut } from "lucide-react";
import { formatINR } from "@/lib/money/paise";

interface NavbarProps {
  shopName?: string;
  role?: string;
  availableCreditPaise?: number;
  creditLimitPaise?: number;
  cartCount?: number;
  currentLang?: "en" | "hi";
  onLanguageToggle?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  shopName = "Company A Distributor",
  role = "retailer",
  availableCreditPaise,
  creditLimitPaise,
  cartCount = 0,
  currentLang = "en",
  onLanguageToggle,
}) => {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (e) {
      console.error("Logout error", e);
    }
  };

  const handleToggleLang = () => {
    const nextLang = currentLang === "en" ? "hi" : "en";
    document.cookie = `app_lang=${nextLang}; path=/; max-age=31536000`;
    if (onLanguageToggle) {
      onLanguageToggle();
    } else {
      window.location.reload();
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-border shadow-xs">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand / Shop Identity */}
        <div className="flex items-center gap-2 overflow-hidden">
          <Link
            href={role === "desk" ? "/desk" : "/catalogue"}
            className="font-bold text-base sm:text-lg text-ink truncate hover:text-accent transition-colors"
          >
            {shopName}
          </Link>
          {role === "desk" && (
            <span className="bg-amber-100 text-amber-900 text-xs px-2 py-0.5 rounded-pill font-semibold">
              DESK
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Language Toggle */}
          <button
            type="button"
            onClick={handleToggleLang}
            className="flex items-center gap-1 h-10 px-2.5 rounded-card text-xs font-semibold text-ink-muted hover:text-ink hover:bg-background border border-border/80 transition-colors touch-target"
            aria-label="Toggle language between English and Hindi"
          >
            <Globe className="w-4 h-4 text-accent" />
            <span>{currentLang === "en" ? "हिन्दी" : "EN"}</span>
          </button>

          {/* Cart Icon (Retailer only) */}
          {role === "retailer" && (
            <Link
              href="/cart"
              className="relative flex items-center justify-center w-11 h-11 rounded-card text-ink hover:bg-background transition-colors touch-target"
              aria-label={`Shopping cart with ${cartCount} items`}
            >
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute top-1.5 right-1.5 bg-accent text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                  {cartCount}
                </span>
              )}
            </Link>
          )}

          {/* Logout */}
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center justify-center w-10 h-10 rounded-card text-ink-muted hover:text-danger hover:bg-red-50 transition-colors touch-target"
            title="Logout"
            aria-label="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Retailer Credit Summary Strip */}
      {role === "retailer" && availableCreditPaise !== undefined && creditLimitPaise !== undefined && (
        <div className="bg-background border-t border-border/60 px-4 py-1.5">
          <div className="max-w-4xl mx-auto flex items-center justify-between text-xs">
            <span className="text-ink-muted">
              {currentLang === "hi" ? "उपलब्ध उधारी सीमा:" : "Available Credit:"}{" "}
              <strong className="text-ink font-semibold tabular-nums">
                {formatINR(availableCreditPaise)}
              </strong>
            </span>
            <span className="text-[11px] text-ink-muted tabular-nums">
              {currentLang === "hi" ? "कुल सीमा:" : "Limit:"} {formatINR(creditLimitPaise)}
            </span>
          </div>
        </div>
      )}
    </header>
  );
};
