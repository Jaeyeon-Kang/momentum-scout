"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { useApp } from "@/lib/store";

export default function Header() {
  const {
    theme,
    setTheme,
    lang,
    setLang,
    mode,
    setMode,
    scoutPanel,
    setScoutPanel,
    viewMode,
    setViewMode,
  } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const copy =
    lang === "ko"
      ? {
          eyebrow: "Tape First",
          title: "Momentum Scout",
          subtitle: "시끄러운 장에서도 지금 볼 만한 흐름만 남기는 스카우트 콘솔",
          home: "홈",
          scout: "스카우트",
          intraday: "인트라데이",
          guide: "가이드",
          focus: "집중",
          theme: "테마 전환",
          lang: "언어 전환",
          menu: "메뉴",
          panelTitle: "작업 보드",
          panelBody: "메뉴는 조용히, 데이터는 또렷하게. 괜히 번쩍거리면 차트가 삐집니다.",
        }
      : {
          eyebrow: "Tape First",
          title: "Momentum Scout",
          subtitle: "A calmer console for spotting momentum without turning the whole screen into a circus.",
          home: "Home",
          scout: "Scout",
          intraday: "Intraday",
          guide: "Guide",
          focus: "Focus",
          theme: "Toggle theme",
          lang: "Switch language",
          menu: "Menu",
          panelTitle: "Workbench",
          panelBody: "Quiet chrome, louder signal. The chart gets the spotlight, not the garnish.",
        };

  const goHome = () => {
    setMode("scout");
    setScoutPanel("scan");
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--header-bg)] backdrop-blur-2xl">
      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-8 lg:px-10 xl:px-12">
        <div className="flex min-h-[92px] flex-wrap items-start justify-between gap-4 py-4 sm:flex-nowrap sm:items-center">
          <button
            type="button"
            onClick={goHome}
            className="min-w-0 flex-1 rounded-[28px] p-1 -m-1 text-left transition-colors hover:text-[var(--accent)]"
            title={copy.home}
          >
            <div className="inline-flex rounded-full border border-[var(--border)] bg-[var(--card2)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              {copy.eyebrow}
            </div>
            <div className="mt-2">
              <h1 className="text-[1.1rem] font-bold tracking-tight sm:text-[1.25rem]">{copy.title}</h1>
              <p className="hidden max-w-[560px] text-sm leading-7 text-[var(--muted)] sm:block">{copy.subtitle}</p>
            </div>
          </button>

          <div className="hidden items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-1 py-1 shadow-[var(--shadow-sm)] sm:flex">
            <ModePill active={viewMode === "guide"} onClick={() => setViewMode("guide")}>
              {copy.guide}
            </ModePill>
            <ModePill active={viewMode === "focus"} onClick={() => setViewMode("focus")}>
              {copy.focus}
            </ModePill>
          </div>

          <div className="flex flex-1 items-center justify-end gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={goHome}
              className={clsx(
                "hidden h-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] px-4 text-sm font-semibold transition-colors hover:text-[var(--text)] sm:inline-flex",
                mode === "scout" && scoutPanel === "scan" ? "text-[var(--text)]" : "text-[var(--muted)]"
              )}
            >
              {copy.home}
            </button>
            <button
              onClick={() => setLang(lang === "ko" ? "en" : "ko")}
              className="flex h-10 min-w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-semibold text-[var(--muted)] transition-colors hover:text-[var(--text)]"
              title={copy.lang}
            >
              {lang === "ko" ? "EN" : "KO"}
            </button>

            <button
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] text-[var(--muted)] transition-colors hover:text-[var(--text)]"
              title={copy.theme}
            >
              {theme === "light" ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                </svg>
              )}
            </button>

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((prev) => !prev)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] text-[var(--muted)] shadow-[var(--shadow-sm)] transition-colors hover:text-[var(--text)]"
                title={copy.menu}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              </button>

              <div
                className={clsx(
                  "absolute right-0 top-[56px] w-[min(320px,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[30px] border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-lg)] transition-all duration-200",
                  menuOpen ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
                )}
              >
                <div className="border-b border-[var(--border)] px-5 py-4">
                  <div className="text-sm font-semibold text-[var(--text)]">{copy.panelTitle}</div>
                  <p className="mt-1 text-sm leading-7 text-[var(--muted)]">{copy.panelBody}</p>
                </div>

                <div className="space-y-2 p-3">
                  <MenuButton active={mode === "scout" && scoutPanel === "scan"} onClick={goHome}>
                    {copy.home}
                  </MenuButton>
                  <MenuButton active={mode === "scout"} onClick={() => { setMode("scout"); setMenuOpen(false); }}>
                    {copy.scout}
                  </MenuButton>
                  <MenuButton active={mode === "intraday"} onClick={() => { setMode("intraday"); setMenuOpen(false); }}>
                    {copy.intraday}
                  </MenuButton>
                  <div className="flex gap-1 rounded-full border border-[var(--border)] bg-[var(--card2)] p-1 sm:hidden">
                    <button
                      onClick={() => setViewMode("guide")}
                      className={clsx(
                        "flex-1 rounded-full px-3 py-2 text-sm font-semibold transition-colors",
                        viewMode === "guide" ? "bg-[var(--text)] text-[var(--bg)]" : "text-[var(--muted)]"
                      )}
                    >
                      {copy.guide}
                    </button>
                    <button
                      onClick={() => setViewMode("focus")}
                      className={clsx(
                        "flex-1 rounded-full px-3 py-2 text-sm font-semibold transition-colors",
                        viewMode === "focus" ? "bg-[var(--text)] text-[var(--bg)]" : "text-[var(--muted)]"
                      )}
                    >
                      {copy.focus}
                    </button>
                  </div>
                </div>

                <div className="border-t border-[var(--border)] p-3 pt-4">
                  <div className="overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--card2)]">
                    <Image
                      src="/muichiro-user.png"
                      alt="Momentum Scout illustration"
                      width={320}
                      height={240}
                      className="h-[176px] w-full object-cover object-top"
                      priority
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function ModePill({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
        active ? "bg-[var(--text)] text-[var(--bg)]" : "text-[var(--muted)] hover:text-[var(--text)]"
      )}
    >
      {children}
    </button>
  );
}

function MenuButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "w-full rounded-[22px] px-4 py-3 text-left text-sm font-semibold transition-colors",
        active
          ? "bg-[var(--accent-dim)] text-[var(--accent)]"
          : "text-[var(--muted)] hover:bg-[var(--card2)] hover:text-[var(--text)]"
      )}
    >
      {children}
    </button>
  );
}
