import React from "react";
import { AlertCircle, RefreshCw, PackageX } from "lucide-react";
import { Button } from "./Button";

export const EmptyState: React.FC<{
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}> = ({
  title,
  description,
  actionText,
  onAction,
  icon = <PackageX className="w-12 h-12 text-ink-muted/50 stroke-[1.5]" />,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-surface border border-border rounded-card my-4">
      <div className="mb-3">{icon}</div>
      <h3 className="text-lg font-semibold text-ink mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-ink-muted max-w-sm mb-5">{description}</p>
      )}
      {actionText && onAction && (
        <Button variant="secondary" size="md" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
};

export const ErrorState: React.FC<{
  title?: string;
  message: string;
  onRetry?: () => void;
}> = ({ title = "Something went wrong", message, onRetry }) => {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center p-8 text-center bg-red-50 border border-red-200 rounded-card my-4"
    >
      <AlertCircle className="w-10 h-10 text-danger mb-3" />
      <h3 className="text-lg font-semibold text-danger mb-1">{title}</h3>
      <p className="text-sm text-red-700 max-w-sm mb-4">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="md"
          onClick={onRetry}
          className="inline-flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Try Again</span>
        </Button>
      )}
    </div>
  );
};

export const Skeleton: React.FC<{ className?: string }> = ({
  className = "h-4 w-full",
}) => {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse bg-gray-200 rounded ${className}`}
    />
  );
};

export const ProductCardSkeleton: React.FC = () => {
  return (
    <div className="bg-surface border border-border rounded-card p-4 flex flex-col gap-3">
      <div className="flex gap-4">
        <Skeleton className="w-24 h-24 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
      <div className="flex justify-between items-center pt-2 border-t border-border/50">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
};

