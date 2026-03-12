"use client";
import { clsx } from "clsx";

export default function Card({
  children,
  className,
  hover,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        "bg-[var(--card)] border border-[var(--border)] rounded-[24px] p-6 sm:p-7 shadow-[var(--shadow-sm)]",
        "transition-all duration-200",
        hover && "cursor-pointer hover:border-[var(--accent)]/40 hover:shadow-[var(--shadow)] hover:-translate-y-0.5",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("mb-5", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={clsx("text-xl font-bold tracking-tight", className)}>{children}</h3>;
}

export function CardDescription({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-base leading-7 text-[var(--muted)]">{children}</p>;
}
