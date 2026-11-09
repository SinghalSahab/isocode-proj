import React from "react";
import { CheckCircle2, AlertTriangle, XCircle, Clock, Sparkles } from "lucide-react";

interface BadgeProps {
  children: React.ReactNode;
  variant?:
    | "success"
    | "warning"
    | "danger"
    | "neutral"
    | "scheme"
    | "info";
  size?: "sm" | "md";
  icon?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "neutral",
  size = "md",
  icon,
  className = "",
}) => {
  const variantStyles = {
    success: "bg-accent-subtle text-accent border border-accent/20",
    warning: "bg-warning-surface text-warning border border-warning/30",
    danger: "bg-danger-surface text-danger border border-danger/30",
    neutral: "bg-background text-ink-muted border border-border",
    scheme: "bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold",
    info: "bg-blue-50 text-blue-700 border border-blue-200",
  }[variant];

  const sizeStyles = {
    sm: "text-xs px-2 py-0.5 rounded-pill",
    md: "text-sm px-2.5 py-1 rounded-pill",
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium leading-none whitespace-nowrap ${variantStyles} ${sizeStyles} ${className}`}
    >
      {icon}
      {children}
    </span>
  );
};

export const StockBadge: React.FC<{ stockCases: number }> = ({ stockCases }) => {
  if (stockCases <= 0) {
    return (
      <Badge variant="danger" icon={<XCircle className="w-3.5 h-3.5" />}>
        Out of Stock
      </Badge>
    );
  }
  if (stockCases <= 12) {
    return (
      <Badge variant="warning" icon={<AlertTriangle className="w-3.5 h-3.5" />}>
        Only {stockCases} cases left
      </Badge>
    );
  }
  return (
    <Badge variant="success" icon={<CheckCircle2 className="w-3.5 h-3.5" />}>
      In Stock
    </Badge>
  );
};

export const OrderStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case "PENDING_REVIEW":
      return (
        <Badge variant="warning" icon={<Clock className="w-3.5 h-3.5" />}>
          Pending Desk Review
        </Badge>
      );
    case "CREDIT_HOLD":
      return (
        <Badge variant="danger" icon={<AlertTriangle className="w-3.5 h-3.5" />}>
          Credit Hold
        </Badge>
      );
    case "CONFIRMED":
      return (
        <Badge variant="success" icon={<CheckCircle2 className="w-3.5 h-3.5" />}>
          Confirmed
        </Badge>
      );
    case "EXPORTED":
      return (
        <Badge variant="info" icon={<CheckCircle2 className="w-3.5 h-3.5" />}>
          Dispatched / Exported
        </Badge>
      );
    case "REJECTED":
      return (
        <Badge variant="neutral" icon={<XCircle className="w-3.5 h-3.5" />}>
          Rejected
        </Badge>
      );
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
};

export const ConfidencePill: React.FC<{ confidence: string }> = ({ confidence }) => {
  switch (confidence) {
    case "High":
      return (
        <Badge variant="success" size="sm" icon={<Sparkles className="w-3 h-3" />}>
          High match
        </Badge>
      );
    case "Medium":
      return (
        <Badge variant="warning" size="sm" icon={<AlertTriangle className="w-3 h-3" />}>
          Review suggested
        </Badge>
      );
    case "Low":
    default:
      return (
        <Badge variant="danger" size="sm" icon={<AlertTriangle className="w-3 h-3" />}>
          Low match
        </Badge>
      );
  }
};

