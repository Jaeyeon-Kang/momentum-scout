"use client";
import Image from "next/image";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { clsx } from "clsx";

export default function Header() {
  const { theme, setTheme, lang, setLang, mode, setMode } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);

  const text = lang === "ko"
    ? {
        brand: "Momentum Scout",
        scout: "모멘텀 트레이딩",
        intraday: "데이트레이딩",
        paper: "모의투자기록",
        theme: "테마 전환",
        lang: "언어 전환",
        menu: "메뉴",
      }
    : {
        brand: "Momentum Scout",
        scout: "Momentum Trading",
        intraday: "Day Trading",
        paper: "Paper Trades",
        theme: "Toggle theme",
        lang: "Switch language",
        menu: "Menu",
      };

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--header-bg)]/96 backdrop-blur-xl">
      <div className="relative w-full px-5 sm:px-8 lg:px-10 xl:px-12">
        <div className="mx-auto relative flex min-h-[88px] items-center justify-between gap-4">
          <div className="flex flex-1" />

          <div className="pointer-events-none absolute left-1/2 top-1/2 min-w-0 -translate-x-1/2 -translate-y-1/2">
            <div className="min-w-0 text-center">
              <p className="truncate text-lg sm:text-xl font-bold tracking-tight">{text.brand}</p>
            </div>
          </div>

          <div className="flex flex-1 items-center justify-end gap-2 shrink-0">
            <button
              onClick={() => setLang(lang === "ko" ? "en" : "ko")}
              className="h-10 min-w-10 px-3 rounded-2xl flex items-center justify-center text-sm font-semibold text-[var(--muted)] hover:bg-[var(--card2)] transition-colors cursor-pointer"
              title={text.lang}
            >
              {lang === "ko" ? "EN" : "KO"}
            </button>

            <button
              onClick={() => {
                const next = theme === "light" ? "dark" : "light";
                setTheme(next);
                document.documentElement.dataset.theme = next;
                localStorage.setItem("ms_theme", next);
              }}
              className="h-10 w-10 rounded-2xl flex items-center justify-center text-[var(--muted)] hover:bg-[var(--card2)] transition-colors cursor-pointer"
              title={text.theme}
            >
              {theme === "light" ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                </svg>
                )}
            </button>

            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)] text-[var(--muted)] shadow-[var(--shadow-sm)] transition-colors hover:text-[var(--text)] cursor-pointer"
              title={text.menu}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
          </div>
        </div>

        <div className={clsx(
          "absolute right-5 sm:right-8 lg:right-10 xl:right-12 top-[78px] w-[280px] overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-lg)] transition-all duration-200",
          menuOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-2 pointer-events-none"
        )}>
          <div className="flex flex-col gap-3 p-3">
            <button
              onClick={() => {
                setMode("scout");
                setMenuOpen(false);
              }}
              className={clsx(
                "rounded-2xl px-4 py-3 text-left text-sm font-semibold transition-colors cursor-pointer",
                mode === "scout"
                  ? "bg-[var(--accent-dim)] text-[var(--accent)]"
                  : "text-[var(--muted)] hover:bg-[var(--card2)] hover:text-[var(--text)]"
              )}
            >
              {text.scout}
            </button>
            <button
              onClick={() => {
                setMode("intraday");
                setMenuOpen(false);
              }}
              className={clsx(
                "rounded-2xl px-4 py-3 text-left text-sm font-semibold transition-colors cursor-pointer",
                mode === "intraday"
                  ? "bg-[var(--accent-dim)] text-[var(--accent)]"
                  : "text-[var(--muted)] hover:bg-[var(--card2)] hover:text-[var(--text)]"
              )}
            >
              {text.intraday}
            </button>
            <button
              onClick={() => {
                setMode("paper");
                setMenuOpen(false);
              }}
              className={clsx(
                "rounded-2xl px-4 py-3 text-left text-sm font-semibold transition-colors cursor-pointer",
                mode === "paper"
                  ? "bg-[var(--accent-dim)] text-[var(--accent)]"
                  : "text-[var(--muted)] hover:bg-[var(--card2)] hover:text-[var(--text)]"
              )}
            >
              {text.paper}
            </button>

            <div className="mt-2 overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--card2)]">
              <Image
                src="/muichiro-user.png"
                alt="Tokito Muichiro"
                width={280}
                height={360}
                className="h-[220px] w-full object-cover object-top"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
