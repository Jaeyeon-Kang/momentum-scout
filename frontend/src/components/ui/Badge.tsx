"use client";
import { clsx } from "clsx";

type Variant = "default" | "accent" | "good" | "danger" | "warn" | "muted";

export default function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors",
        variant === "default" && "bg-[var(--card2)] text-[var(--muted)] border border-[var(--border)]",
        variant === "accent" && "bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--accent)]/30",
        variant === "good" && "bg-[var(--good-dim)] text-[var(--good)] border border-[var(--good)]/30",
        variant === "danger" && "bg-[var(--danger-dim)] text-[var(--danger)] border border-[var(--danger)]/30",
        variant === "warn" && "bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30",
        variant === "muted" && "bg-[var(--card2)] text-[var(--muted)]",
        className
      )}
    >
      {children}
    </span>
  );
}
