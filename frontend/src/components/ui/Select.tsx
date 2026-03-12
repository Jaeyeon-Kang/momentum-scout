"use client";
import { clsx } from "clsx";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  help?: string;
}

export default function Select({ label, help, className, children, ...props }: SelectProps) {
  return (
    <label className="flex flex-col gap-2">
      {label && (
        <span className="text-sm font-semibold text-[var(--muted)]">
          {label}
        </span>
      )}
      <select
        className={clsx(
          "w-full h-12 sm:h-[52px] px-4 rounded-2xl border border-[var(--border)] bg-[var(--card)]",
          "text-base text-[var(--text)] outline-none appearance-none",
          "transition-all duration-200",
          "focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15",
          "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2386868b%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_12px_center]",
          "pr-10",
          className
        )}
        {...props}
      >
        {children}
      </select>
      {help && <span className="text-xs text-[var(--muted)] leading-relaxed">{help}</span>}
    </label>
  );
}
