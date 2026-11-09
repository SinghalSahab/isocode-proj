import React from "react";
import { Plus, Minus } from "lucide-react";

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  unitLabel?: string;
}

export const Stepper: React.FC<StepperProps> = ({
  value,
  onChange,
  min = 0,
  max = 9999,
  step = 1,
  disabled = false,
  unitLabel = "cases",
}) => {
  const handleDecrement = () => {
    if (disabled || value <= min) return;
    onChange(Math.max(min, value - step));
  };

  const handleIncrement = () => {
    if (disabled || value >= max) return;
    onChange(Math.min(max, value + step));
  };

  return (
    <div className="inline-flex items-center border border-border rounded-card bg-surface overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={handleDecrement}
        disabled={disabled || value <= min}
        aria-label="Decrease quantity"
        className="w-12 h-12 flex items-center justify-center text-ink hover:bg-background active:bg-border disabled:opacity-30 disabled:cursor-not-allowed touch-target focus:outline-none focus:ring-2 focus:ring-accent"
      >
        <Minus className="w-5 h-5" />
      </button>

      <div className="w-16 h-12 flex flex-col items-center justify-center border-x border-border bg-surface px-1">
        <span className="font-semibold text-lg tabular-nums text-ink leading-tight">
          {value}
        </span>
        {unitLabel && (
          <span className="text-[10px] text-ink-muted uppercase tracking-wider leading-none">
            {unitLabel}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={handleIncrement}
        disabled={disabled || value >= max}
        aria-label="Increase quantity"
        className="w-12 h-12 flex items-center justify-center text-ink hover:bg-background active:bg-border disabled:opacity-30 disabled:cursor-not-allowed touch-target focus:outline-none focus:ring-2 focus:ring-accent"
      >
        <Plus className="w-5 h-5" />
      </button>
    </div>
  );
};
