"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Inbox,
  FileSpreadsheet,
  Clock,
  Truck,
  BookmarkCheck,
  LogOut,
  Globe,
} from "lucide-react";

interface DeskNavProps {
  userName?: string;
  lang?: "en" | "hi";
}

export const DeskNav: React.FC<DeskNavProps> = ({ userName = "Desk Staff", lang = "en" }) => {
  const pathname = usePathname();
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
    const nextLang = lang === "en" ? "hi" : "en";
    document.cookie = `app_lang=${nextLang}; path=/; max-age=31536000`;
    window.location.reload();
  };

  const links = [
    {
      href: "/desk",
      label: lang === "hi" ? "ऑर्डर कतार" : "Order Queue",
      icon: Inbox,
      exact: true,
    },
    {
      href: "/desk/export",
      label: lang === "hi" ? "टैली एक्सपोर्ट" : "Tally Export",
      icon: FileSpreadsheet,
    },
    {
      href: "/desk/inactive",
      label: lang === "hi" ? "14 दिन निष्क्रिय" : "14-Day Inactive",
      icon: Clock,
    },
    {
      href: "/desk/van-loading",
      label: lang === "hi" ? "लोडिंग लिस्ट" : "Van Loading List",
      icon: Truck,
    },
    {
      href: "/desk/aliases",
      label: lang === "hi" ? "दुकानदार उपनाम" : "Retailer Aliases",
      icon: BookmarkCheck,
    },
  ];

  return (
    <aside className="w-64 bg-surface border-r border-border min-h-screen flex flex-col justify-between hidden md:flex shrink-0">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-accent text-white flex items-center justify-center font-bold text-sm">
              A
            </span>
            <div>
              <h2 className="font-bold text-base text-ink leading-tight">Company A</h2>
              <p className="text-xs text-ink-muted">Order Desk Portal</p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = link.exact
              ? pathname === link.href
              : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-card text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-accent text-white shadow-xs"
                    : "text-ink hover:bg-background hover:text-accent"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-ink-muted"}`} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Profile & Logout */}
      <div className="p-4 border-t border-border space-y-2">
        <div className="flex items-center justify-between text-xs text-ink-muted px-1">
          <span className="truncate max-w-[120px] font-medium text-ink">{userName}</span>
          <button
            type="button"
            onClick={handleToggleLang}
            className="flex items-center gap-1 font-semibold text-accent hover:underline"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{lang === "en" ? "हिन्दी" : "EN"}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-ink-muted hover:text-danger hover:bg-red-50 rounded-card transition-colors touch-target"
        >
          <LogOut className="w-4 h-4" />
          <span>{lang === "hi" ? "लॉगआउट" : "Logout"}</span>
        </button>
      </div>
    </aside>
  );
};

