import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabledReason?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      disabledReason,
      className = "",
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-colors select-none rounded-card touch-target focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed";

    const variantStyles = {
      primary: "bg-accent text-white hover:bg-accent-hover shadow-sm",
      secondary: "bg-surface border border-border text-ink hover:bg-background",
      outline: "border border-accent text-accent hover:bg-accent-subtle",
      ghost: "text-ink hover:bg-background",
      danger: "bg-danger text-white hover:bg-red-700 shadow-sm",
    }[variant];

    const sizeStyles = {
      sm: "h-9 px-3 text-sm",
      md: "h-12 px-4 text-base",
      lg: "h-14 px-6 text-lg font-semibold",
    }[size];

    return (
      <div className="relative inline-block w-full sm:w-auto">
        <button
          ref={ref}
          disabled={disabled || loading}
          className={`${baseStyles} ${variantStyles} ${sizeStyles} w-full ${className}`}
          title={disabled && disabledReason ? disabledReason : undefined}
          {...props}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg
                className="animate-spin h-5 w-5 text-current"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span>{typeof children === "string" ? "..." : children}</span>
            </span>
          ) : (
            children
          )}
        </button>
        {disabled && disabledReason && (
          <p className="sr-only">{disabledReason}</p>
        )}
      </div>
    );
  }
);

Button.displayName = "Button";
