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
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
        variant === "default" && "bg-[var(--card2)] text-[var(--muted)] border border-[var(--border)]",
        variant === "accent" && "bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--accent)]/30",
        variant === "good" && "bg-[var(--good-dim)] text-[var(--good)] border border-[var(--good)]/30",
        variant === "danger" && "bg-[var(--danger-dim)] text-[var(--danger)] border border-[var(--danger)]/30",
        variant === "warn" && "bg-[var(--card2)] text-[var(--danger)] border border-[var(--danger)]/25",
        variant === "muted" && "bg-transparent text-[var(--muted)] border border-[var(--border)]",
        className
      )}
    >
      {children}
    </span>
  );
}
