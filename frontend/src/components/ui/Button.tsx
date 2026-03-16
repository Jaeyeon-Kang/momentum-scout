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
          "relative inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 cursor-pointer select-none",
          "disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none",
          "active:scale-[0.97]",
          size === "sm" && "h-9 px-4 text-sm",
          size === "md" && "h-11 px-5 text-sm sm:text-base",
          size === "lg" && "h-[54px] px-7 text-base sm:text-lg",
          variant === "primary" &&
            "bg-[var(--text)] text-[var(--bg)] shadow-[var(--shadow-sm)] hover:opacity-92",
          variant === "secondary" &&
            "bg-[var(--card)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--card2)]",
          variant === "ghost" &&
            "text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--card2)]/80",
          variant === "danger" &&
            "bg-[var(--danger-dim)] text-[var(--danger)] border border-[var(--danger)]/20 hover:bg-[var(--danger-dim)]/80",
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
