"use client";
import { createContext, useContext } from "react";
import type { ScanResult } from "./api";

// ---------------------------------------------------------------------------
// Lightweight global store via React Context
// ---------------------------------------------------------------------------

export interface AppState {
  // Theme
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;

  // Language
  lang: "ko" | "en";
  setLang: (l: "ko" | "en") => void;

  // Mode
  mode: "scout" | "intraday" | "paper";
  setMode: (m: "scout" | "intraday" | "paper") => void;

  // Scout panel
  scoutPanel: "scan" | "results";
  setScoutPanel: (p: "scan" | "results") => void;

  // Market
  market: "US" | "KR";
  setMarket: (m: "US" | "KR") => void;

  // Horizon
  horizon: 5 | 20;
  setHorizon: (h: 5 | 20) => void;

  // Scan
  scanResult: ScanResult | null;
  setScanResult: (r: ScanResult | null) => void;
  scanning: boolean;
  setScanning: (b: boolean) => void;

  // Selection
  selected: Set<string>;
  toggleSelected: (sym: string) => void;
  selectAll: () => void;
  clearSelection: () => void;

  // View mode
  viewMode: "guide" | "focus";
  setViewMode: (v: "guide" | "focus") => void;
}

export const AppContext = createContext<AppState>(null!);
export const useApp = () => useContext(AppContext);

// Presets
export const KR_DEFAULT_PRESET = {
  marketCapMin: 1000000000000,
  minTurnover: 30000000000,
  todayTurnoverMin: 70000000000,
  relVolMin: 1.3,
  ret5dMin: 4,
  ret5dMax: 25,
  closePosMin: 0.6,
  freshNewsHours: 72,
  marketTurnoverRankMax: 60,
  largecapMin: 2000000000000,
  largecapQuota: 2,
  krExcludeFundlike: true,
};

export const US_LIQUIDITY_PRESETS = {
  tight: { minTurnover: 50000000, label: "보수적", desc: "평균 거래대금 $50M+ 위주. 소형주 제한." },
  balanced: { minTurnover: 20000000, label: "균형", desc: "평균 거래대금 $20M+ 기준. 기본 추천." },
  aggressive: { minTurnover: 10000000, label: "공격적", desc: "평균 거래대금 $10M+까지 확장." },
} as const;

export const SCAN_PROFILES = {
  surge: {
    title: "단기 급등 추적",
    desc: "가장 강한 종목을 빠르게 확인할 때",
    icon: "🔥",
  },
  continuation: {
    title: "거래량 동반 추세 지속",
    desc: "이미 움직인 종목 중 추가 상승 가능성",
    icon: "📈",
  },
  early: {
    title: "초기 시동 후보",
    desc: "막 탄력이 붙기 시작하는 종목",
    icon: "🌱",
  },
  manual: {
    title: "직접 조정",
    desc: "세부 조건을 직접 설정",
    icon: "⚙️",
  },
} as const;
