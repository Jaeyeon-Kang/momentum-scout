"use client";
import { clsx } from "clsx";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  help?: string;
  warn?: string;
  suffix?: string;
}

export default function Input({ label, help, warn, suffix, className, ...props }: InputProps) {
  return (
    <label className="flex flex-col gap-2">
      {label && (
        <span className="text-sm font-semibold text-[var(--muted)]">
          {label}
        </span>
      )}
      <div className="relative">
        <input
          className={clsx(
            "w-full h-12 sm:h-[52px] px-4 rounded-[20px] border border-[var(--border)] bg-[var(--card2)]",
            "text-base text-[var(--text)] outline-none",
            "transition-all duration-200",
            "focus:border-[var(--text)] focus:ring-2 focus:ring-[var(--text)]/8",
            "placeholder:text-[var(--muted)]/50",
            suffix && "pr-12",
            className
          )}
          {...props}
        />
        {suffix && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--muted)]">
            {suffix}
          </span>
        )}
      </div>
      {warn && <span className="text-xs text-[var(--danger)] leading-relaxed">{warn}</span>}
      {help && <span className="text-xs text-[var(--muted)] leading-relaxed">{help}</span>}
    </label>
  );
}
