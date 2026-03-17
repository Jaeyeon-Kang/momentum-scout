import type { Candidate, IntradayRadarRow } from "./api";

export type Lang = "ko" | "en";

// ---------------------------------------------------------------------------
// Shared label maps
// ---------------------------------------------------------------------------

const INTRADAY_STATE_PRIORITY: Record<string, number> = {
  TRIGGERED: 0,
  CONFIRM: 1,
  PREPARE: 2,
  EXPIRED: 3,
  BLOCKED: 4,
};

export const REGIME_LABELS_KO: Record<string, string> = {
  MIXED: "혼조",
  RISK_ON: "리스크 온",
  RISK_OFF: "리스크 오프",
  NEUTRAL: "중립",
};

const MACRO_KEY_LABELS: Record<string, { ko: string; en: string }> = {
  adv_dec_ratio: { ko: "상승/하락 비율", en: "Advance/Decline" },
  advance_decline: { ko: "상승/하락 비율", en: "Advance/Decline" },
  breadth_pct: { ko: "시장 폭", en: "Market breadth" },
  breadth: { ko: "시장 폭", en: "Market breadth" },
  vix: { ko: "변동성(VIX)", en: "VIX" },
  volatility: { ko: "변동성", en: "Volatility" },
  index_return: { ko: "지수 수익률", en: "Index return" },
  spy_chg: { ko: "S&P500", en: "S&P 500" },
  qqq_chg: { ko: "나스닥100", en: "Nasdaq 100" },
  kospi_chg: { ko: "코스피", en: "KOSPI" },
  kosdaq_chg: { ko: "코스닥", en: "KOSDAQ" },
  net_highs: { ko: "순 신고가", en: "Net new highs" },
  new_highs: { ko: "신고가 종목 수", en: "New highs" },
  new_lows: { ko: "신저가 종목 수", en: "New lows" },
  put_call_ratio: { ko: "풋/콜 비율", en: "Put/Call" },
  market_turnover: { ko: "시장 거래대금", en: "Market turnover" },
  fear_greed: { ko: "공포/탐욕", en: "Fear & Greed" },
  up_volume_ratio: { ko: "상승 거래량 비율", en: "Up volume ratio" },
  down_volume_ratio: { ko: "하락 거래량 비율", en: "Down volume ratio" },
};

const DETAIL_KEY_LABELS: Record<string, { ko: string; en: string }> = {
  entry_trigger: { ko: "진입 기준가", en: "Entry trigger" },
  stop: { ko: "손절 기준가", en: "Stop" },
  target: { ko: "목표가", en: "Target" },
  rr: { ko: "손익비", en: "R:R" },
  support_1: { ko: "지지 1", en: "Support 1" },
  support_2: { ko: "지지 2", en: "Support 2" },
  resistance_1: { ko: "저항 1", en: "Resistance 1" },
  resistance_2: { ko: "저항 2", en: "Resistance 2" },
  vwap: { ko: "거래량 가중 평균가", en: "VWAP" },
  avg_volume: { ko: "평균 거래량", en: "Avg volume" },
  avg_volume_20d: { ko: "20일 평균 거래량", en: "20D avg volume" },
  beta: { ko: "베타", en: "Beta" },
  market_cap: { ko: "시가총액", en: "Market cap" },
  pe_ratio: { ko: "PER", en: "P/E" },
  atr: { ko: "ATR", en: "ATR" },
  atr_pct: { ko: "ATR(%)", en: "ATR %" },
  day_high: { ko: "당일 고가", en: "Day high" },
  day_low: { ko: "당일 저가", en: "Day low" },
  week_52_high: { ko: "52주 고가", en: "52W high" },
  week_52_low: { ko: "52주 저가", en: "52W low" },
  prev_close: { ko: "전일 종가", en: "Prev close" },
  open: { ko: "시가", en: "Open" },
  close_pct: { ko: "종가 위치", en: "Close position" },
  rel_vol_20d: { ko: "상대 거래량", en: "Rel volume" },
  turnover: { ko: "거래대금", en: "Turnover" },
  float_shares: { ko: "유통 주식 수", en: "Float" },
  short_ratio: { ko: "공매도 비율", en: "Short ratio" },
};

const STATE_LABELS: Record<string, { ko: string; en: string }> = {
  PREPARE: { ko: "준비", en: "Prepare" },
  CONFIRM: { ko: "확인 중", en: "Confirm" },
  TRIGGERED: { ko: "진입 신호", en: "Triggered" },
  EXPIRED: { ko: "추격 금지", en: "Expired" },
  BLOCKED: { ko: "신규 진입 금지", en: "Blocked" },
};

const SETUP_LABELS: Record<string, { ko: string; en: string }> = {
  intraday_continuation: { ko: "장중 추세 지속", en: "Intraday continuation" },
  opening_drive: { ko: "시가 돌파", en: "Opening drive" },
  gap_and_go: { ko: "갭 상승 지속", en: "Gap & go" },
  pullback: { ko: "눌림목", en: "Pullback" },
  reversal: { ko: "반전 시도", en: "Reversal" },
};

// ---------------------------------------------------------------------------
// Shared translators
// ---------------------------------------------------------------------------

function cleanSnakeCase(text: string): string {
  return text
    .replace(/_/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase())
    .trim();
}

export function translateRegime(value?: string, lang?: Lang): string {
  if (!value) return "-";
  if (lang === "ko") return REGIME_LABELS_KO[value] ?? cleanSnakeCase(value);
  return value.replaceAll("_", " ");
}

export function translateEntryStatus(status: string, lang: Lang): string {
  if (lang === "ko") {
    if (status === "APPROVED_NEW") return "승인 후보";
    if (status === "AVOID") return "제외";
    return "관찰";
  }
  if (status === "APPROVED_NEW") return "Approved";
  if (status === "AVOID") return "Avoid";
  return "Watch";
}

export function translateRecommendedAction(action: string, lang: Lang): string {
  const normalized = action?.toUpperCase?.() || "";
  if (lang === "ko") {
    if (normalized === "NEW_ENTRY") return "승인 후보만 보기";
    if (normalized === "WATCHLIST_ONLY") return "관찰 우선";
    if (normalized === "CASH") return "현금 대기";
    return cleanSnakeCase(action);
  }
  if (normalized === "NEW_ENTRY") return "Approved only";
  if (normalized === "WATCHLIST_ONLY") return "Watch first";
  if (normalized === "CASH") return "Stay in cash";
  return cleanSnakeCase(action);
}

export function translateMacroKey(key: string, lang: Lang): string | null {
  const entry = MACRO_KEY_LABELS[key];
  if (entry) return lang === "ko" ? entry.ko : entry.en;
  // Only show keys that look like real data, skip internal/debug keys
  if (key.startsWith("_") || key.length > 30) return null;
  return cleanSnakeCase(key);
}

export function translateDetailKey(key: string, lang: Lang): string {
  const entry = DETAIL_KEY_LABELS[key];
  if (entry) return lang === "ko" ? entry.ko : entry.en;
  return cleanSnakeCase(key);
}

export function translateState(value: string, lang: Lang): string {
  const entry = STATE_LABELS[value];
  if (entry) return lang === "ko" ? entry.ko : entry.en;
  return value.replaceAll("_", " ");
}

export function translateSetup(value: string | undefined, lang: Lang): string {
  if (!value) return "";
  const entry = SETUP_LABELS[value];
  if (entry) return lang === "ko" ? entry.ko : entry.en;
  return cleanSnakeCase(value);
}

// ---------------------------------------------------------------------------
// Reason translation (expanded)
// ---------------------------------------------------------------------------

export function translateReasonText(reason: string, lang: Lang): string {
  if (lang !== "ko") return reason;
  const normalized = reason.toLowerCase();

  if (normalized.includes("watch only")) return "관찰 전용";
  if (normalized.includes("session check complete")) return "세션 점검 완료";
  if (normalized.includes("today turnover filter passed")) return "당일 거래대금 기준 통과";
  if (normalized.includes("relative volume filter passed")) return "상대 거래량 기준 통과";
  if (normalized.includes("market risk-off blocks new entries")) return "시장 리스크 때문에 신규 진입이 막혀 있습니다";
  if (normalized.includes("market risk")) return "시장 리스크 경고";
  if (normalized.includes("new entries blocked")) return "신규 진입 차단";
  if (normalized.includes("trigger armed") || normalized.includes("near trigger")) return "트리거 접근";
  if (normalized.includes("extended move") || normalized.includes("already extended")) return "이미 많이 움직임";
  if (normalized.includes("position capped by cash")) return "현금 한도로 규모 제한";
  if (normalized.includes("risk budget cap")) return "손실 한도 기준 적용";
  if (normalized.includes("multiple risk flags")) return "리스크 신호가 여러 개 겹쳤습니다";
  if (normalized.includes("news freshness")) return "뉴스 신선도 유지";
  if (normalized.includes("breakout")) return "돌파 구간 확인";
  if (normalized.includes("relative strength")) return "상대 강도 유지";
  if (normalized.includes("momentum")) return "모멘텀 유지";
  if (normalized.includes("volume surge")) return "거래량 급증";
  if (normalized.includes("gap up")) return "갭 상승";
  if (normalized.includes("gap down")) return "갭 하락";
  if (normalized.includes("above vwap")) return "VWAP 위에서 거래 중";
  if (normalized.includes("below vwap")) return "VWAP 아래로 밀림";
  if (normalized.includes("large cap auto")) return "대형주 자동 포함";
  if (normalized.includes("earnings")) return "실적 관련";
  if (normalized.includes("sector leader")) return "업종 선도";
  if (normalized.includes("high turnover")) return "거래대금 상위";
  if (normalized.includes("flagged")) return "리스크 플래그 감지";

  // Fallback: clean up snake_case or raw-looking text
  if (reason.includes("_")) return cleanSnakeCase(reason);
  if (/^[A-Z_\s]+$/.test(reason)) return cleanSnakeCase(reason.toLowerCase());
  return reason;
}

// ---------------------------------------------------------------------------
// State/action hints
// ---------------------------------------------------------------------------

export function getStateActionHint(state: string, lang: Lang): string {
  const ko: Record<string, string> = {
    PREPARE: "감시 시작",
    CONFIRM: "마지막 확인",
    TRIGGERED: "조건 충족",
    EXPIRED: "지금은 추격 금지",
    BLOCKED: "시장 때문에 보류",
  };
  const en: Record<string, string> = {
    PREPARE: "Start watching",
    CONFIRM: "Final check",
    TRIGGERED: "Conditions met",
    EXPIRED: "Do not chase now",
    BLOCKED: "Blocked by market",
  };
  const dictionary = lang === "ko" ? ko : en;
  return dictionary[state] ?? state;
}

export function getEntryStatusActionHint(status: string, lang: Lang): string {
  if (lang === "ko") {
    if (status === "APPROVED_NEW") return "트리거와 손절 간격을 확인한 뒤, 조건이 맞으면 신규 진입 후보로 취급";
    if (status === "AVOID") return "오늘은 제외. 이유만 확인하고 넘기세요";
    return "기록만 하고 다음 타이밍을 기다리세요";
  }
  if (status === "APPROVED_NEW") return "Check trigger-to-stop distance, then treat as a fresh entry candidate";
  if (status === "AVOID") return "Skip today. Just note the reason and move on";
  return "Log it and wait for a better entry window";
}

// ---------------------------------------------------------------------------
// Risk/Reward
// ---------------------------------------------------------------------------

export function calcRiskReward(row: Pick<IntradayRadarRow, "trigger_price" | "stop_price" | "target_price_1">): number | null {
  const trigger = Number(row.trigger_price);
  const stop = Number(row.stop_price);
  const target = Number(row.target_price_1);

  if (![trigger, stop, target].every((value) => Number.isFinite(value))) return null;

  // Support both long (trigger > stop) and short (trigger < stop)
  const risk = Math.abs(trigger - stop);
  const reward = Math.abs(target - trigger);
  if (risk <= 0 || reward <= 0) return null;
  const isLong = trigger > stop;
  if (isLong && target <= trigger) return null;
  if (!isLong && target >= trigger) return null;
  return reward / risk;
}

// ---------------------------------------------------------------------------
// Time formatting
// ---------------------------------------------------------------------------

export function formatUpdatedAt(value?: string, lang: Lang = "ko"): string {
  if (!value) return "";
  const match = value.match(/(\d{2}):(\d{2})/);
  if (!match) return value;
  return lang === "ko" ? `업데이트 ${match[1]}:${match[2]}` : `Updated ${match[1]}:${match[2]}`;
}

export function formatRelativeTime(dateStr: string, lang: Lang): string {
  if (!dateStr) return dateStr;
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) {
      return date.toLocaleDateString(lang === "ko" ? "ko-KR" : "en-US", { month: "short", day: "numeric" });
    }
    const diffMin = Math.floor(diffMs / 60_000);
    const diffHr = Math.floor(diffMs / 3_600_000);
    const diffDay = Math.floor(diffMs / 86_400_000);

    if (lang === "ko") {
      if (diffMin < 1) return "방금";
      if (diffMin < 60) return `${diffMin}분 전`;
      if (diffHr < 24) return `${diffHr}시간 전`;
      if (diffDay === 1) return "어제";
      if (diffDay < 7) return `${diffDay}일 전`;
      return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
    }
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay === 1) return "Yesterday";
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

export function sortIntradayRows(rows: IntradayRadarRow[]): IntradayRadarRow[] {
  return [...rows].sort((a, b) => {
    const aOrder = INTRADAY_STATE_PRIORITY[a.state] ?? 99;
    const bOrder = INTRADAY_STATE_PRIORITY[b.state] ?? 99;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return (b.day_chg_pct ?? 0) - (a.day_chg_pct ?? 0);
  });
}

// ---------------------------------------------------------------------------
// Decision summaries
// ---------------------------------------------------------------------------

export function getDecisionActionSummary(recommendedAction: string, lang: Lang): string {
  const action = recommendedAction?.toUpperCase?.() || "";
  if (lang === "ko") {
    if (action === "NEW_ENTRY") return "오늘은 승인 후보만 보세요. 관찰 후보까지 다 건드릴 날은 아닙니다.";
    if (action === "WATCHLIST_ONLY") return "오늘은 추격보다 관찰이 우선입니다. 이유를 적어두고 다음 타이밍을 기다리세요.";
    if (action === "CASH") return "억지로 누르지 마세요. 현금 대기가 기본값입니다.";
    return "시장 결론부터 보고, 그다음에 후보를 줄여서 보세요.";
  }
  if (action === "NEW_ENTRY") return "Focus on approved names only today. This is not a day to touch every watchlist idea.";
  if (action === "WATCHLIST_ONLY") return "Observation comes before chasing today. Write down the reason and wait for a cleaner entry.";
  if (action === "CASH") return "Do not force it. Cash is the correct default until the tape improves.";
  return "Start with the market regime, then narrow the list.";
}

export function getIntradayModeHint(newEntriesAllowed: boolean, lang: Lang): string {
  if (lang === "ko") {
    return newEntriesAllowed
      ? "오늘은 신규 진입을 열어도 됩니다. 단, 진입 신호가 나온 후보만 보세요."
      : "오늘은 보수 운영이 기본입니다. 추격보다 관찰과 기록이 우선입니다.";
  }
  return newEntriesAllowed
    ? "New entries are open today, but only for candidates that actually trigger."
    : "Today is a defensive session. Observation and note-taking come before chasing.";
}

export function getIntradayRules(newEntriesAllowed: boolean, lang: Lang): string[] {
  if (lang === "ko") {
    if (newEntriesAllowed) {
      return [
        "신규 진입은 TRIGGERED 상태만",
        "CONFIRM은 감시만, 아직 진입 아님",
        "EXPIRED는 추격 금지",
      ];
    }
    return [
      "신규 진입 보류 — 관찰만",
      "기존 포지션 관리가 우선",
      "기록해 두고 다음 기회 대기",
    ];
  }
  if (newEntriesAllowed) {
    return [
      "Fresh entries only for TRIGGERED state",
      "CONFIRM means watch, not enter",
      "EXPIRED means do not chase",
    ];
  }
  return [
    "No new entries — observe only",
    "Manage existing positions first",
    "Log and wait for next opportunity",
  ];
}

// ---------------------------------------------------------------------------
// Intraday card interpretation
// ---------------------------------------------------------------------------

export function getIntradayCardInterpretation(row: IntradayRadarRow, lang: Lang): string {
  const rr = calcRiskReward(row);
  if (lang === "ko") {
    if (row.state === "TRIGGERED") {
      if (rr && rr >= 2) return "조건 충족. 손익비도 괜찮아 진입 검토 가능";
      if (rr && rr < 1.5) return "조건은 충족됐지만 손절 간격이 넓어 주의 필요";
      return "조건 충족. 호가와 스프레드를 확인하세요";
    }
    if (row.state === "CONFIRM") return "조건은 거의 왔지만 아직 트리거 전입니다";
    if (row.state === "PREPARE") return "감시 대상. 아직 조건이 멀어 대기만 하세요";
    if (row.state === "EXPIRED") return "이미 많이 움직여 지금은 추격 위험이 큽니다";
    if (row.state === "BLOCKED") return "시장 리스크 때문에 신규 진입은 보류입니다";
    return "";
  }
  if (row.state === "TRIGGERED") {
    if (rr && rr >= 2) return "Conditions met. R:R looks workable";
    if (rr && rr < 1.5) return "Triggered but stop distance is wide — size carefully";
    return "Conditions met. Check spreads before acting";
  }
  if (row.state === "CONFIRM") return "Almost there but not triggered yet";
  if (row.state === "PREPARE") return "On the watchlist. Still waiting for conditions";
  if (row.state === "EXPIRED") return "Already extended — chasing here carries extra risk";
  if (row.state === "BLOCKED") return "Market risk blocks fresh entries";
  return "";
}

// ---------------------------------------------------------------------------
// Candidate reason bullets (for ScanResults)
// ---------------------------------------------------------------------------

export function buildCandidateReasonBullets(candidate: Candidate, lang: Lang): string[] {
  // Use scan_reason only (entry_reason shows as tags separately)
  const translatedReasons = (candidate.scan_reason || [])
    .map((reason) => translateReasonText(reason, lang))
    .filter(Boolean);

  const bullets: string[] = [];
  for (const reason of translatedReasons) {
    if (!bullets.includes(reason)) bullets.push(reason);
    if (bullets.length >= 3) break;
  }

  if (bullets.length < 3 && candidate.day_turnover > 0) {
    bullets.push(lang === "ko" ? "거래대금이 실제로 붙었습니다" : "Dollar volume is actually there.");
  }
  if (bullets.length < 3 && (candidate.rel_vol_20d ?? 0) >= 1.3) {
    bullets.push(lang === "ko" ? "평소보다 거래가 붙고 있습니다" : "Volume is running above normal.");
  }
  if (bullets.length < 3 && (candidate.ret_horizon_pct ?? 0) > 0) {
    bullets.push(lang === "ko" ? "최근 모멘텀이 아직 꺾이지 않았습니다" : "Recent momentum is still holding up.");
  }
  if (bullets.length < 3 && candidate.extras?.news_asof) {
    bullets.push(lang === "ko" ? "뉴스 신선도가 아직 살아 있습니다" : "News freshness is still alive.");
  }
  if (bullets.length < 3 && (candidate.market_cap ?? 0) > 0) {
    bullets.push(lang === "ko" ? "규모와 유동성이 어느 정도 받쳐줍니다" : "Size and liquidity are at least workable.");
  }

  return bullets.slice(0, 3);
}

// ---------------------------------------------------------------------------
// Candidate card interpretation (short 1-line)
// ---------------------------------------------------------------------------

export function buildCandidateInterpretation(candidate: Candidate, lang: Lang): string {
  const relVol = candidate.rel_vol_20d ?? 0;
  const retPct = candidate.ret_horizon_pct ?? 0;
  const hasNews = !!candidate.extras?.news_asof;

  if (lang === "ko") {
    if (candidate.entry_status === "AVOID") {
      return "조건에 맞지 않아 오늘은 건너뜁니다";
    }
    if (relVol >= 2 && retPct > 8) return "거래와 모멘텀 모두 강하지만, 과열 구간 진입 여부를 확인하세요";
    if (relVol >= 1.5 && retPct > 0 && retPct <= 8) return "거래는 붙지만 아직 과열은 아닙니다";
    if (retPct > 0 && relVol < 1.3) return "모멘텀은 유지되지만 거래가 아직 약합니다";
    if (relVol >= 1.3 && !hasNews) return "유동성은 괜찮지만 재료 신선도는 약합니다";
    if (retPct < 0) return "최근 수익률이 마이너스입니다. 관찰 우선";
    return "기본 조건은 통과했지만 강한 확신 구간은 아닙니다";
  }
  if (candidate.entry_status === "AVOID") return "Does not meet criteria today — skip";
  if (relVol >= 2 && retPct > 8) return "Strong volume and momentum, but check for overextension";
  if (relVol >= 1.5 && retPct > 0 && retPct <= 8) return "Volume is there and not overheated yet";
  if (retPct > 0 && relVol < 1.3) return "Momentum holds but volume is still thin";
  if (relVol >= 1.3 && !hasNews) return "Liquidity is fine but catalyst freshness is weak";
  if (retPct < 0) return "Recent return is negative — observation only";
  return "Passes baseline filters but not a high-conviction setup";
}
