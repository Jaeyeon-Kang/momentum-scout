import type { Candidate, IntradayRadarRow } from "./api";

export type Lang = "ko" | "en";

const INTRADAY_STATE_PRIORITY: Record<string, number> = {
  TRIGGERED: 0,
  CONFIRM: 1,
  PREPARE: 2,
  EXPIRED: 3,
  BLOCKED: 4,
};

export function translateReasonText(reason: string, lang: Lang): string {
  if (lang !== "ko") return reason;
  const normalized = reason.toLowerCase();

  if (normalized.includes("watch only")) return "관찰 전용";
  if (normalized.includes("session check complete")) return "세션 점검 완료";
  if (normalized.includes("today turnover filter passed")) return "당일 거래대금 기준 통과";
  if (normalized.includes("relative volume filter passed")) return "상대 거래량 기준 통과";
  if (normalized.includes("market risk")) return "시장 리스크 경고";
  if (normalized.includes("new entries blocked")) return "신규 진입 차단";
  if (normalized.includes("market risk-off blocks new entries")) return "시장 리스크 때문에 신규 진입이 막혀 있습니다";
  if (normalized.includes("trigger armed") || normalized.includes("near trigger")) return "트리거 접근";
  if (normalized.includes("extended move") || normalized.includes("already extended")) return "이미 많이 움직임";
  if (normalized.includes("position capped by cash")) return "현금 한도로 규모 제한";
  if (normalized.includes("risk budget cap")) return "손실 한도 기준 적용";
  if (normalized.includes("multiple risk flags")) return "리스크 신호가 여러 개 겹쳤습니다";
  if (normalized.includes("news freshness")) return "뉴스 신선도 유지";
  if (normalized.includes("breakout")) return "돌파 구간 확인";
  if (normalized.includes("relative strength")) return "상대 강도 유지";

  return reason;
}

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

export function calcRiskReward(row: Pick<IntradayRadarRow, "trigger_price" | "stop_price" | "target_price_1">): number | null {
  const trigger = Number(row.trigger_price);
  const stop = Number(row.stop_price);
  const target = Number(row.target_price_1);

  if (![trigger, stop, target].every((value) => Number.isFinite(value))) return null;
  if (trigger <= stop || target <= trigger) return null;

  const risk = trigger - stop;
  const reward = target - trigger;
  if (risk <= 0 || reward <= 0) return null;
  return reward / risk;
}

export function formatUpdatedAt(value?: string, lang: Lang = "ko"): string {
  if (!value) return "";
  const match = value.match(/(\d{2}):(\d{2})/);
  if (!match) return value;
  return lang === "ko" ? `업데이트 ${match[1]}:${match[2]}` : `Updated ${match[1]}:${match[2]}`;
}

export function sortIntradayRows(rows: IntradayRadarRow[]): IntradayRadarRow[] {
  return [...rows].sort((a, b) => {
    const aOrder = INTRADAY_STATE_PRIORITY[a.state] ?? 99;
    const bOrder = INTRADAY_STATE_PRIORITY[b.state] ?? 99;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return (b.day_chg_pct ?? 0) - (a.day_chg_pct ?? 0);
  });
}

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

export function buildCandidateReasonBullets(candidate: Candidate, lang: Lang): string[] {
  const translatedReasons = [...(candidate.entry_reason || []), ...(candidate.scan_reason || [])]
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
