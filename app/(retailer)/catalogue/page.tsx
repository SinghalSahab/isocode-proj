"use client";

import React, { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/ui/Navbar";
import { BottomNav } from "@/components/ui/BottomNav";
import { PriceText } from "@/components/ui/PriceText";
import { StockBadge, Badge } from "@/components/ui/Badge";
import { Stepper } from "@/components/ui/Stepper";
import { Button } from "@/components/ui/Button";
import { ProductCardSkeleton, EmptyState, ErrorState } from "@/components/ui/FeedbackStates";
import { Search, RotateCcw, ArrowRight, Tag } from "lucide-react";
import { formatINR } from "@/lib/money/paise";
import { t, Language } from "@/lib/i18n";

interface Product {
  id: string;
  code: string;
  nameEn: string;
  nameHi: string;
  brand: string;
  piecesPerCase: number;
  dealerPricePerPiecePaise: number;
  casePricePaise: number;
  gstRateBp: number;
  stockCases: number;
  imageKey: string;
  scheme: {
    kind: string;
    configJson: Record<string, unknown>;
    labelEn: string;
    labelHi: string;
  } | null;
}

interface RetailerProfile {
  id: string;
  shopName: string;
  ownerName: string;
  creditLimitPaise: number;
  outstandingPaise: number;
  availableCreditPaise: number;
}

export default function CataloguePage() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>("en");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retailer, setRetailer] = useState<RetailerProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  // Search & Brand Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<string>("ALL");

  // Local cart state: Record<skuId, qtyCases>
  const [cartQuantities, setCartQuantities] = useState<Record<string, number>>({});
  const [addingSkuId, setAddingSkuId] = useState<string | null>(null);

  // Read language cookie on mount
  useEffect(() => {
    const match = document.cookie.match(/app_lang=(en|hi)/);
    if (match) {
      setLang(match[1] as Language);
    }

    // Load cart from localStorage if present
    const savedCart = localStorage.getItem("fmcg_cart");
    if (savedCart) {
      try {
        setCartQuantities(JSON.parse(savedCart));
      } catch (e) {
        console.error("Failed to parse cart storage", e);
      }
    }

    fetchCatalogue();
  }, []);

  const fetchCatalogue = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/catalogue");
      if (!res.ok) {
        throw new Error("Failed to load catalogue");
      }
      const data = await res.json();
      setRetailer(data.retailer);
      setProducts(data.products);
    } catch {
      setError("Unable to connect to catalogue. Please check connection.");
    } finally {
      setLoading(false);
    }
  };

  // Distinct brands for filter chips
  const brands = useMemo(() => {
    const unique = Array.from(new Set(products.map((p) => p.brand)));
    return ["ALL", ...unique];
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return products.filter((p) => {
      const matchesBrand = selectedBrand === "ALL" || p.brand === selectedBrand;
      const matchesSearch =
        !query ||
        p.nameEn.toLowerCase().includes(query) ||
        p.nameHi.toLowerCase().includes(query) ||
        p.code.toLowerCase().includes(query) ||
        p.brand.toLowerCase().includes(query);
      return matchesBrand && matchesSearch;
    });
  }, [products, searchQuery, selectedBrand]);

  // Cart summary calculations
  const totalCartCases = useMemo(() => {
    return Object.values(cartQuantities).reduce((acc, qty) => acc + qty, 0);
  }, [cartQuantities]);

  const totalCartItemsCount = useMemo(() => {
    return Object.values(cartQuantities).filter((qty) => qty > 0).length;
  }, [cartQuantities]);

  const approxCartTotalPaise = useMemo(() => {
    return products.reduce((acc, p) => {
      const qty = cartQuantities[p.id] || 0;
      if (qty > 0) {
        const lineGross = qty * p.casePricePaise;
        const lineGst = Math.round((lineGross * p.gstRateBp) / 10000);
        return acc + lineGross + lineGst;
      }
      return acc;
    }, 0);
  }, [products, cartQuantities]);

  const updateCartQuantity = (skuId: string, qty: number) => {
    setCartQuantities((prev) => {
      const next = { ...prev };
      if (qty <= 0) {
        delete next[skuId];
      } else {
        next[skuId] = qty;
      }
      localStorage.setItem("fmcg_cart", JSON.stringify(next));
      return next;
    });
  };

  const handleAddToCart = (sku: Product) => {
    setAddingSkuId(sku.id);
    const current = cartQuantities[sku.id] || 0;
    const nextQty = current === 0 ? 1 : current;
    updateCartQuantity(sku.id, nextQty);
    setTimeout(() => setAddingSkuId(null), 300);
  };

  const handleRepeatLastOrder = async () => {
    try {
      const res = await fetch("/api/orders/repeat-last");
      if (!res.ok) {
        alert("No previous order found to repeat.");
        return;
      }
      const data = await res.json();
      const newCart: Record<string, number> = {};
      for (const item of data.items) {
        if (item.isAvailable) {
          newCart[item.skuId] = item.qtyCases;
        }
      }
      setCartQuantities(newCart);
      localStorage.setItem("fmcg_cart", JSON.stringify(newCart));
      router.push("/cart");
    } catch {
      alert("Failed to load last order.");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Sticky Header with credit summary and language switcher */}
      <Navbar
        shopName={retailer?.shopName}
        role="retailer"
        availableCreditPaise={retailer?.availableCreditPaise}
        creditLimitPaise={retailer?.creditLimitPaise}
        cartCount={totalCartItemsCount}
        currentLang={lang}
        onLanguageToggle={() => setLang(lang === "en" ? "hi" : "en")}
      />

      <main className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {/* Repeat Last Order Quick Action */}
        <div className="flex items-center justify-between bg-surface border border-border p-3 rounded-card shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-accent-subtle flex items-center justify-center text-accent flex-shrink-0">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-sm text-ink leading-tight">
                {t("catalogue.repeat_last_order", {}, lang)}
              </p>
              <p className="text-xs text-ink-muted">
                {lang === "hi"
                  ? "पिछले ऑर्डर का सामान तुरंत कार्ट में भरें"
                  : "Quickly reload your previous items into cart"}
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRepeatLastOrder}
            className="flex-shrink-0"
          >
            {t("catalogue.repeat_last_order", {}, lang)}
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted">
            <Search className="w-5 h-5" />
          </span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("catalogue.search_placeholder", {}, lang)}
            className="w-full h-12 pl-11 pr-4 bg-surface border border-border rounded-card text-ink text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-accent shadow-xs"
          />
        </div>

        {/* Brand Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {brands.map((brand) => (
            <button
              key={brand}
              type="button"
              onClick={() => setSelectedBrand(brand)}
              className={`px-3.5 py-1.5 rounded-pill text-xs font-semibold whitespace-nowrap transition-colors touch-target ${
                selectedBrand === brand
                  ? "bg-accent text-white shadow-xs"
                  : "bg-surface border border-border text-ink-muted hover:text-ink hover:bg-background"
              }`}
            >
              {brand === "ALL" ? t("catalogue.all_brands", {}, lang) : brand}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ProductCardSkeleton />
            <ProductCardSkeleton />
            <ProductCardSkeleton />
            <ProductCardSkeleton />
          </div>
        )}

        {/* Error State */}
        {error && (
          <ErrorState
            title="Catalogue Error"
            message={error}
            onRetry={fetchCatalogue}
          />
        )}

        {/* Empty Search State */}
        {!loading && !error && filteredProducts.length === 0 && (
          <EmptyState
            title={t("catalogue.empty_search", {}, lang)}
            description="Try searching with a different keyword or brand filter."
            actionText={t("catalogue.clear_search", {}, lang)}
            onAction={() => {
              setSearchQuery("");
              setSelectedBrand("ALL");
            }}
          />
        )}

        {/* Products List */}
        {!loading && !error && filteredProducts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredProducts.map((product) => {
              const inCartQty = cartQuantities[product.id] || 0;
              const isOOS = product.stockCases <= 0;
              const displayName = lang === "hi" ? product.nameHi : product.nameEn;
              const schemeLabel = product.scheme
                ? lang === "hi"
                  ? product.scheme.labelHi
                  : product.scheme.labelEn
                : null;

              return (
                <div
                  key={product.id}
                  className={`bg-surface border border-border rounded-card p-4 flex flex-col justify-between transition-shadow hover:shadow-sm ${
                    isOOS ? "opacity-75 bg-gray-50/50" : ""
                  }`}
                >
                  <div>
                    {/* Top row: Brand & Stock status badge */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                        {product.brand}
                      </span>
                      <StockBadge stockCases={product.stockCases} />
                    </div>

                    {/* Middle: Product image and info */}
                    <div className="flex gap-3 mb-3">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 relative rounded-lg bg-gray-50 border border-border/60 overflow-hidden flex-shrink-0">
                        <Image
                          src={`/products/${product.imageKey}.svg`}
                          alt={displayName}
                          fill
                          sizes="(max-width: 640px) 80px, 96px"
                          className="object-contain p-1"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base text-ink leading-snug line-clamp-2">
                          {displayName}
                        </h3>
                        <p className="text-xs text-ink-muted mt-0.5">
                          SKU: {product.code} · Case of {product.piecesPerCase}
                        </p>

                        {/* Scheme Badge */}
                        {schemeLabel && (
                          <div className="mt-2">
                            <Badge variant="scheme" size="sm" icon={<Tag className="w-3 h-3" />}>
                              {schemeLabel}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bottom: Pricing & Add to Cart Controls */}
                  <div className="pt-3 border-t border-border/60 flex items-end justify-between gap-2">
                    <PriceText
                      casePricePaise={product.casePricePaise}
                      dealerPricePerPiecePaise={product.dealerPricePerPiecePaise}
                      piecesPerCase={product.piecesPerCase}
                    />

                    <div>
                      {isOOS ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled
                          disabledReason="This item is currently out of stock and cannot be added."
                        >
                          {t("catalogue.out_of_stock", {}, lang)}
                        </Button>
                      ) : inCartQty > 0 ? (
                        <Stepper
                          value={inCartQty}
                          onChange={(val) => updateCartQuantity(product.id, val)}
                          min={0}
                          max={product.stockCases}
                        />
                      ) : (
                        <Button
                          variant="primary"
                          size="md"
                          loading={addingSkuId === product.id}
                          onClick={() => handleAddToCart(product)}
                          className="px-5 font-semibold"
                        >
                          {t("catalogue.add_to_cart", {}, lang)}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Sticky Bottom Cart Bar (when cart has items) */}
      {totalCartItemsCount > 0 && (
        <aside
          aria-label="Cart summary banner"
          className="fixed bottom-16 sm:bottom-4 left-4 right-4 max-w-4xl mx-auto z-30"
        >
          <Link
            href="/cart"
            className="flex items-center justify-between bg-accent text-white px-5 py-3.5 rounded-card shadow-lg hover:bg-accent-hover transition-transform active:scale-[0.99] touch-target"
          >
            <div>
              <span className="font-bold text-sm block">
                {totalCartItemsCount} {totalCartItemsCount === 1 ? "item" : "items"} · {totalCartCases} {totalCartCases === 1 ? "case" : "cases"}
              </span>
              <span className="text-xs text-white/90 tabular-nums">
                ~{formatINR(approxCartTotalPaise)} (incl. GST)
              </span>
            </div>

            <div className="flex items-center gap-1.5 font-bold text-sm">
              <span>{t("catalogue.view_cart", {}, lang)}</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        </aside>
      )}

      {/* Mobile Bottom Navigation */}
      <BottomNav cartCount={totalCartItemsCount} lang={lang} />
    </div>
  );
}
