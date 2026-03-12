"use client";
import Image from "next/image";
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
        <main className="flex-1 w-full px-5 sm:px-8 lg:px-12 xl:px-16 py-8 sm:py-10">
          <div className="max-w-[1320px] mx-auto space-y-8 sm:space-y-10">
            {mode === "scout" && scoutPanel === "scan" && <ScanSettings />}
            {mode === "scout" && scoutPanel === "results" && <ScanResults />}
            {mode === "intraday" && <IntradayDesk />}
            {mode === "paper" && <PaperTradingPlaceholder />}
          </div>
        </main>
        <MuichiroDock />
      </div>
    </AppContext.Provider>
  );
}

function MuichiroDock() {
  return (
    <div className="fixed right-4 bottom-4 z-40 hidden xl:block">
      <div className="overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-lg)]">
        <Image
          src="/muichiro-user.png"
          alt="Tokito Muichiro"
          width={220}
          height={360}
          className="h-[320px] w-[190px] object-cover object-center"
          priority
        />
      </div>
    </div>
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
