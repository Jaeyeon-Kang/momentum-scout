"use client";
import { createContext, useContext } from "react";
import type { ScanResult } from "./api";

export interface AppState {
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
  lang: "ko" | "en";
  setLang: (l: "ko" | "en") => void;
  mode: "scout" | "intraday" | "paper";
  setMode: (m: "scout" | "intraday" | "paper") => void;
  scoutPanel: "scan" | "results";
  setScoutPanel: (p: "scan" | "results") => void;
  market: "US" | "KR";
  setMarket: (m: "US" | "KR") => void;
  horizon: 5 | 20;
  setHorizon: (h: 5 | 20) => void;
  scanResult: ScanResult | null;
  setScanResult: (r: ScanResult | null) => void;
  scanning: boolean;
  setScanning: (b: boolean) => void;
  selected: Set<string>;
  toggleSelected: (sym: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  viewMode: "guide" | "focus";
  setViewMode: (v: "guide" | "focus") => void;
}

export const AppContext = createContext<AppState>(null!);
export const useApp = () => useContext(AppContext);

export const KR_DEFAULT_PRESET = {
  marketCapMin: 1_000_000_000_000,
  minTurnover: 30_000_000_000,
  todayTurnoverMin: 70_000_000_000,
  relVolMin: 1.3,
  ret5dMin: 4,
  ret5dMax: 25,
  closePosMin: 0.6,
  freshNewsHours: 72,
  marketTurnoverRankMax: 60,
  largecapMin: 2_000_000_000_000,
  largecapQuota: 2,
  krExcludeFundlike: true,
};

export const US_LIQUIDITY_PRESETS = {
  tight: {
    minTurnover: 50_000_000,
    label: { ko: "보수형", en: "Conservative" },
    desc: { ko: "평균 거래대금 5천만 달러 이상. 슬리피지와 실패 확률을 줄이는 쪽입니다.", en: "Avg turnover $50M+. Lower slippage and failure rates." },
  },
  balanced: {
    minTurnover: 20_000_000,
    label: { ko: "균형형", en: "Balanced" },
    desc: { ko: "평균 거래대금 2천만 달러 이상. 가장 무난한 기본값입니다.", en: "Avg turnover $20M+. The safest default for most sessions." },
  },
  aggressive: {
    minTurnover: 10_000_000,
    label: { ko: "공격형", en: "Aggressive" },
    desc: { ko: "평균 거래대금 1천만 달러까지 확장. 더 빠른 종목도 보지만 변동성은 커집니다.", en: "Extends to $10M turnover. Faster names, more volatility." },
  },
} as const;

export const SCAN_PROFILES = {
  surge: {
    title: { ko: "당일 강도 추적", en: "Day Surge" },
    desc: { ko: "이미 거래가 붙은 종목에서 속도가 계속 붙는 후보를 찾습니다.", en: "Finds names where volume is already building and keeps going." },
    icon: "01",
    screeners: "day_gainers,most_actives",
  },
  continuation: {
    title: { ko: "추세 지속 후보", en: "Trend Continuation" },
    desc: { ko: "과열 한 끗 전의 연속성 있는 모멘텀을 우선 봅니다.", en: "Focuses on sustained momentum just before overextension." },
    icon: "02",
    screeners: "most_actives,undervalued_growth_stocks",
  },
  early: {
    title: { ko: "초기 포착", en: "Early Detection" },
    desc: { ko: "막 거래가 붙기 시작하는 종목을 넓게 확인합니다.", en: "Wide scan for names where volume is just starting to arrive." },
    icon: "03",
    screeners: "day_gainers,trending_tickers",
  },
  manual: {
    title: { ko: "직접 조정", en: "Manual" },
    desc: { ko: "직접 심볼을 넣거나 필터를 만져서 좁혀갑니다.", en: "Enter your own symbols or manually adjust filters." },
    icon: "04",
    screeners: "day_gainers,most_actives",
  },
} as const;
