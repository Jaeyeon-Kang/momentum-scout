"use client";
import { clsx } from "clsx";
import { forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "secondary", size = "md", loading, className, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(
          "relative inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 cursor-pointer select-none",
          "disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none",
          "active:scale-[0.97]",
          // Size
          size === "sm" && "h-9 px-3.5 text-sm rounded-xl",
          size === "md" && "h-11 px-[18px] text-base",
          size === "lg" && "h-[52px] px-7 text-lg",
          // Variant
          variant === "primary" &&
            "bg-[var(--accent)] text-white shadow-sm hover:brightness-110 hover:shadow-md",
          variant === "secondary" &&
            "bg-[var(--card)] text-[var(--text)] border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--card2)]",
          variant === "ghost" &&
            "text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--card2)]",
          variant === "danger" &&
            "bg-[var(--danger-dim)] text-[var(--danger)] border border-[var(--danger)]/20 hover:bg-[var(--danger)]/15",
          className
        )}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
