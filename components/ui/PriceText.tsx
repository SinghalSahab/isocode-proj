import React from "react";
import { formatINR } from "@/lib/money/paise";

interface PriceTextProps {
  casePricePaise: number;
  dealerPricePerPiecePaise?: number;
  piecesPerCase?: number;
  showBasis?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const PriceText: React.FC<PriceTextProps> = ({
  casePricePaise,
  dealerPricePerPiecePaise,
  piecesPerCase,
  showBasis = true,
  size = "md",
  className = "",
}) => {
  const sizeStyles = {
    sm: "text-base font-semibold",
    md: "text-xl font-bold",
    lg: "text-2xl font-extrabold",
  }[size];

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex items-baseline gap-1.5 flex-wrap">
        <span className={`${sizeStyles} text-ink tabular-nums`}>
          {formatINR(casePricePaise)}
        </span>
        <span className="text-xs text-ink-muted font-medium">/ case</span>
      </div>

      <div className="flex items-center gap-2 text-xs text-ink-muted mt-0.5 flex-wrap">
        {showBasis && (
          <span className="inline-block bg-background px-1.5 py-0.5 rounded text-[11px] font-medium border border-border/80">
            Price excl. GST
          </span>
        )}
        {dealerPricePerPiecePaise !== undefined && (
          <span className="tabular-nums">
            ({formatINR(dealerPricePerPiecePaise)} / piece
            {piecesPerCase ? ` · ${piecesPerCase}/case` : ""})
          </span>
        )}
      </div>
    </div>
  );
};
