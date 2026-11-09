"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, MessageSquareText, ShoppingBag, ClipboardList } from "lucide-react";

interface BottomNavProps {
  cartCount?: number;
  lang?: "en" | "hi";
}

export const BottomNav: React.FC<BottomNavProps> = ({ cartCount = 0, lang = "en" }) => {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/catalogue",
      label: lang === "hi" ? "सामान" : "Catalogue",
      icon: LayoutGrid,
      isActive: pathname.startsWith("/catalogue"),
    },
    {
      href: "/capture",
      label: lang === "hi" ? "मैसेज ऑर्डर" : "AI Message",
      icon: MessageSquareText,
      isActive: pathname.startsWith("/capture"),
    },
    {
      href: "/cart",
      label: lang === "hi" ? "कार्ट" : "Cart",
      icon: ShoppingBag,
      isActive: pathname.startsWith("/cart"),
      badge: cartCount > 0 ? cartCount : undefined,
    },
    {
      href: "/orders",
      label: lang === "hi" ? "मेरे ऑर्डर" : "My Orders",
      icon: ClipboardList,
      isActive: pathname.startsWith("/orders"),
    },
  ];

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-surface/98 backdrop-blur-lg border-t border-border shadow-lg pb-safe sm:hidden"
    >
      <div className="grid grid-cols-4 h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center relative touch-target transition-colors ${item.isActive
                  ? "text-accent font-semibold"
                  : "text-ink-muted hover:text-ink"
                }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${item.isActive ? "stroke-[2.5]" : "stroke-[1.75]"}`} />
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 bg-accent text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-1 leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

