"use client";
import { useApp } from "@/lib/store";
import { clsx } from "clsx";

export default function Header() {
  const { theme, setTheme, mode, setMode, lang, setLang } = useApp();

  const text = lang === "ko"
    ? {
        scout: "모멘텀 트레이딩",
        intraday: "데이트레이딩",
        paper: "모의투자기록",
        search: "검색",
        theme: "테마 전환",
        lang: "언어 전환",
      }
    : {
        scout: "Momentum Trading",
        intraday: "Day Trading",
        paper: "Paper Trades",
        search: "Search",
        theme: "Toggle theme",
        lang: "Switch language",
      };

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--header-bg)] backdrop-blur-xl">
      <div className="w-full px-5 sm:px-8 lg:px-12 xl:px-16">
        <div className="max-w-[1480px] mx-auto min-h-[76px] grid grid-cols-[auto_1fr_auto] items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--accent)] text-base font-extrabold tracking-tight text-white shadow-sm">
              M
            </div>
            <span className="whitespace-nowrap text-lg sm:text-xl font-bold tracking-tight">
              Momentum Scout
            </span>
          </div>

          <nav className="flex min-w-0 items-center justify-center">
            <div className="flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--card)] px-2 py-1.5 shadow-[var(--shadow-sm)] overflow-x-auto">
              <TabButton active={mode === "scout"} onClick={() => setMode("scout")}>
                {text.scout}
              </TabButton>
              <TabButton active={mode === "intraday"} onClick={() => setMode("intraday")}>
                {text.intraday}
              </TabButton>
              <TabButton active={mode === "paper"} onClick={() => setMode("paper")}>
                {text.paper}
              </TabButton>
            </div>
          </nav>

          <div className="flex items-center justify-end gap-2 shrink-0">
            <button
              className="hidden md:flex h-10 px-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] text-sm text-[var(--muted)] items-center gap-2.5 hover:border-[var(--accent)]/40 transition-colors cursor-pointer"
              id="searchTrigger"
              title={text.search}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <span>{text.search}</span>
              <kbd className="text-[11px] px-1.5 py-0.5 rounded-lg bg-[var(--card2)] border border-[var(--border)] font-mono">/</kbd>
            </button>

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
          </div>
        </div>
      </div>
    </header>
  );
}

function TabButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "relative rounded-full px-4 py-2.5 text-sm sm:text-base font-semibold transition-colors cursor-pointer whitespace-nowrap",
        active
          ? "bg-[var(--accent-dim)] text-[var(--accent)]"
          : "text-[var(--muted)] hover:text-[var(--text)]"
      )}
    >
      {children}
    </button>
  );
}
