"use client";
import { useState, useCallback, useMemo } from "react";
import { AppContext, type AppState } from "@/lib/store";
import type { ScanResult } from "@/lib/api";
import Header from "@/components/Header";
import ScanSettings from "@/components/ScanSettings";
import ScanResults from "@/components/ScanResults";
import IntradayDesk from "@/components/IntradayDesk";
import Card from "@/components/ui/Card";
import { Toaster } from "sonner";

export default function Home() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("ms_theme") as "light" | "dark") || "light";
    }
    return "light";
  });
  const [lang, setLang] = useState<"ko" | "en">("ko");
  const [mode, setMode] = useState<"scout" | "intraday" | "paper">("scout");
  const [scoutPanel, setScoutPanel] = useState<"scan" | "results">("scan");
  const [market, setMarket] = useState<"US" | "KR">("US");
  const [horizon, setHorizon] = useState<5 | 20>(5);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [selectedSet, setSelectedSet] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"guide" | "focus">("guide");

  const toggleSelected = useCallback((sym: string) => {
    setSelectedSet((prev) => {
      const next = new Set(prev);
      if (next.has(sym)) next.delete(sym);
      else next.add(sym);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (scanResult?.candidates) {
      setSelectedSet(new Set(scanResult.candidates.map((c) => c.symbol)));
    }
  }, [scanResult]);

  const clearSelection = useCallback(() => {
    setSelectedSet(new Set());
  }, []);

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
      lang,
      mode,
      scoutPanel,
      market,
      horizon,
      scanResult,
      scanning,
      selectedSet,
      viewMode,
      toggleSelected,
      selectAll,
      clearSelection,
    ]
  );

  return (
    <AppContext.Provider value={ctx}>
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: "var(--card)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            fontSize: "14px",
          },
        }}
      />
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="min-w-0 flex flex-1 justify-center px-5 sm:px-8 lg:px-10 xl:px-12 py-8 sm:py-10">
          <div className="w-full max-w-[1120px] mx-auto space-y-8 sm:space-y-10">
            {mode === "scout" && scoutPanel === "scan" && <ScanSettings />}
            {mode === "scout" && scoutPanel === "results" && <ScanResults />}
            {mode === "intraday" && <IntradayDesk />}
            {mode === "paper" && <PaperTradingPlaceholder />}
          </div>
        </main>
      </div>
    </AppContext.Provider>
  );
}

function PaperTradingPlaceholder() {
  return (
    <div className="max-w-[980px] mx-auto animate-fade-in">
      <Card className="p-8 sm:p-10 lg:p-12">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tight">모의투자기록</h1>
          <p className="text-base leading-8 text-[var(--muted)]">
            이 영역은 일단 비워뒀습니다. 나중에 모의 매매 기록과 복기 흐름을 붙일 수 있도록 자리만
            먼저 잡아둔 상태입니다.
          </p>
        </div>
      </Card>
    </div>
  );
}
