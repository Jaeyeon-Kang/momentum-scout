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
    label: "보수형",
    desc: "평균 거래대금 5천만 달러 이상. 슬리피지와 실패 확률을 줄이는 쪽입니다.",
  },
  balanced: {
    minTurnover: 20_000_000,
    label: "균형형",
    desc: "평균 거래대금 2천만 달러 이상. 가장 무난한 기본값입니다.",
  },
  aggressive: {
    minTurnover: 10_000_000,
    label: "공격형",
    desc: "평균 거래대금 1천만 달러까지 확장. 더 빠른 종목도 보지만 변동성은 커집니다.",
  },
} as const;

export const SCAN_PROFILES = {
  surge: {
    title: "당일 강도 추적",
    desc: "이미 거래가 붙은 종목에서 속도가 계속 붙는 후보를 찾습니다.",
    icon: "01",
    screeners: "day_gainers,most_actives",
  },
  continuation: {
    title: "추세 지속 후보",
    desc: "과열 한 끗 전의 연속성 있는 모멘텀을 우선 봅니다.",
    icon: "02",
    screeners: "most_actives,undervalued_growth_stocks",
  },
  early: {
    title: "초기 포착",
    desc: "막 거래가 붙기 시작하는 종목을 넓게 확인합니다.",
    icon: "03",
    screeners: "day_gainers,trending_tickers",
  },
  manual: {
    title: "직접 조정",
    desc: "직접 심볼을 넣거나 필터를 만져서 좁혀갑니다.",
    icon: "04",
    screeners: "day_gainers,most_actives",
  },
} as const;
