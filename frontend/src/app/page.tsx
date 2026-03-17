"use client";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { AppContext, type AppState } from "@/lib/store";
import type { ScanResult } from "@/lib/api";
import Header from "@/components/Header";
import ScanSettings from "@/components/ScanSettings";
import ScanResults from "@/components/ScanResults";
import IntradayDesk from "@/components/IntradayDesk";
import Card from "@/components/ui/Card";
import { Toaster } from "sonner";

export default function Home() {
  const [theme, setThemeState] = useState<"light" | "dark">("light");
  const [lang, setLangState] = useState<"ko" | "en">("ko");
  const [mode, setMode] = useState<"scout" | "intraday" | "paper">("scout");
  const [scoutPanel, setScoutPanel] = useState<"scan" | "results">("scan");
  const [market, setMarket] = useState<"US" | "KR">("US");
  const [horizon, setHorizon] = useState<5 | 20>(5);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [selectedSet, setSelectedSet] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"guide" | "focus">("guide");
  const [, startTransition] = useTransition();

  useEffect(() => {
    const nextTheme =
      (localStorage.getItem("ms_theme") as "light" | "dark" | null) ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const nextLang = (localStorage.getItem("ms_lang") as "ko" | "en" | null) || "ko";
    setThemeState(nextTheme);
    setLangState(nextLang);
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.lang = nextLang;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setTheme = useCallback((nextTheme: "light" | "dark") => {
    setThemeState(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem("ms_theme", nextTheme);
  }, []);

  const setLang = useCallback((nextLang: "ko" | "en") => {
    setLangState(nextLang);
    document.documentElement.lang = nextLang;
    localStorage.setItem("ms_lang", nextLang);
  }, []);

  const toggleSelected = useCallback((sym: string) => {
    startTransition(() => {
      setSelectedSet((prev) => {
        const next = new Set(prev);
        if (next.has(sym)) next.delete(sym);
        else next.add(sym);
        return next;
      });
    });
  }, [startTransition]);

  const selectAll = useCallback(() => {
    if (!scanResult?.candidates) return;
    startTransition(() => {
      setSelectedSet(new Set(scanResult.candidates.map((candidate) => candidate.symbol)));
    });
  }, [scanResult, startTransition]);

  const clearSelection = useCallback(() => {
    startTransition(() => {
      setSelectedSet(new Set());
    });
  }, [startTransition]);

  const ctx: AppState = useMemo(
    () => ({
      theme,
      setTheme,
      lang,
      setLang,
      mode,
      setMode,
      scoutPanel,
      setScoutPanel,
      market,
      setMarket,
      horizon,
      setHorizon,
      scanResult,
      setScanResult,
      scanning,
      setScanning,
      selected: selectedSet,
      toggleSelected,
      selectAll,
      clearSelection,
      viewMode,
      setViewMode,
    }),
    [
      theme,
      setTheme,
      lang,
      setLang,
      mode,
      scoutPanel,
      market,
      horizon,
      scanResult,
      scanning,
      selectedSet,
      toggleSelected,
      selectAll,
      clearSelection,
      viewMode,
    ]
  );

  return (
    <AppContext.Provider value={ctx}>
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: "var(--card2)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            borderRadius: "18px",
            fontSize: "14px",
            boxShadow: "var(--shadow-sm)",
          },
        }}
      />
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="min-w-0 flex flex-1 justify-center px-4 sm:px-8 lg:px-10 xl:px-12 py-6 sm:py-8 lg:py-10">
          <div className="w-full max-w-[1280px] mx-auto space-y-8 sm:space-y-10">
            {mode === "scout" && scoutPanel === "scan" && <ScanSettings />}
            {mode === "scout" && scoutPanel === "results" && <ScanResults />}
            {mode === "intraday" && <IntradayDesk />}
            {mode === "paper" && <PaperTradingPlaceholder lang={lang} />}
          </div>
        </main>
      </div>
    </AppContext.Provider>
  );
}

function PaperTradingPlaceholder({ lang }: { lang: "ko" | "en" }) {
  const copy =
    lang === "ko"
      ? {
          title: "모의 기록 준비 중",
          body: "실거래 화면으로 착각할 정도로 정교하게 만들기 전에, 먼저 기록 흐름부터 단단히 묶는 중입니다. 다음 단계에서는 진입, 청산, 복기 메모를 같은 타임라인으로 다루게 됩니다.",
        }
      : {
          title: "Paper journal in progress",
          body: "Before this pretends to be a real trade blotter, we are tightening the journaling flow first. The next pass will connect entries, exits, and review notes in one timeline.",
        };

  return (
    <div className="max-w-[980px] mx-auto animate-fade-in">
      <Card className="glass-panel p-8 sm:p-10 lg:p-12">
        <div className="space-y-4">
          <div className="inline-flex rounded-full border border-[var(--border)] bg-[var(--card2)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            {lang === "ko" ? "모의 모드" : "Paper Mode"}
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{copy.title}</h1>
          <p className="max-w-[760px] text-base leading-8 text-[var(--muted)]">{copy.body}</p>
        </div>
      </Card>
    </div>
  );
}
