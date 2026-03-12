"use client";
import { useEffect, useRef } from "react";
import { clsx } from "clsx";

export default function Modal({
  open,
  onClose,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" />
      <div
        className={clsx(
          "relative w-full sm:max-w-2xl max-h-[92vh] flex flex-col",
          "bg-[var(--card)] border border-[var(--border)]",
          "rounded-t-2xl sm:rounded-2xl",
          "shadow-[var(--shadow-lg)] overflow-hidden",
          "animate-[slideUp_0.3s_ease-out]",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
      <div className="min-w-0">{children}</div>
      <button
        onClick={onClose}
        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:bg-[var(--card2)] hover:text-[var(--text)] transition-colors cursor-pointer"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function ModalBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx("flex-1 overflow-y-auto px-5 py-4", className)}>
      {children}
    </div>
  );
}
