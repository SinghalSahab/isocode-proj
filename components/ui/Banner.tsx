import React from "react";
import { Info, AlertTriangle, AlertCircle, Sparkles } from "lucide-react";

interface BannerProps {
  title?: string;
  children: React.ReactNode;
  variant?: "info" | "warning" | "danger" | "demo";
  className?: string;
}

export const Banner: React.FC<BannerProps> = ({
  title,
  children,
  variant = "info",
  className = "",
}) => {
  const styles = {
    info: "bg-blue-50 border-blue-200 text-blue-900",
    warning: "bg-amber-50 border-amber-300 text-amber-900",
    danger: "bg-red-50 border-red-200 text-red-900",
    demo: "bg-emerald-50 border-emerald-300 text-emerald-900",
  }[variant];

  const icons = {
    info: <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />,
    danger: <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />,
    demo: <Sparkles className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />,
  }[variant];

  return (
    <div
      role="status"
      className={`border rounded-card p-3 sm:p-4 flex items-start gap-3 text-sm ${styles} ${className}`}
    >
      {icons}
      <div className="flex-1">
        {title && <h4 className="font-semibold text-sm mb-0.5">{title}</h4>}
        <div className="leading-relaxed">{children}</div>
      </div>
    </div>
  );
};

