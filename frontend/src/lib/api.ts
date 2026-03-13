// ---------------------------------------------------------------------------
// API client – all calls to FastAPI backend
// ---------------------------------------------------------------------------

const rawBase = process.env.NEXT_PUBLIC_API_BASE?.trim() || "";
const BASE = rawBase.replace(/\/$/, "");

async function get<T>(url: string): Promise<T> {
  const res = await fetch(`${BASE}${url}`);
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return (await res.text()) as unknown as T;
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json();
}

// --- Types ---

export interface MarketDecision {
  regime: string;
  recommended_action: string;
  new_entries_allowed: boolean;
  reason: string[];
  macro_snapshot: Record<string, number>;
}

export interface Candidate {
  symbol: string;
  name: string;
  currency: string;
  day_chg_pct: number;
  day_turnover: number;
  market_cap: number;
  last: number;
  rel_vol_20d: number;
  ret_horizon_pct: number;
  score: number;
  entry_status: string;
  entry_reason: string[];
  rejection_flags: string[];
  scan_reason: string[];
  extras: {
    market_turnover_rank?: number;
    bucket_tags?: string[];
    news_asof?: string;
    flow_asof?: string;
    timestamps?: Record<string, string>;
  };
}

export interface ScanResult {
  market_decision: MarketDecision;
  candidates: Candidate[];
  context: Record<string, unknown>;
  asof_kst: string;
  asof_et: string;
  auto_selected_symbols: string[];
}

export interface TickerDetail {
  symbol: string;
  name: string;
  quote: Record<string, unknown>;
  stats: Record<string, unknown>;
  levels: Record<string, unknown>;
  trade_plan_like: Record<string, unknown>;
  extras: Record<string, unknown>;
  news?: Array<{ title: string; published: string; link: string }>;
  [key: string]: unknown;
}

export interface IntradayRadarRow {
  symbol: string;
  name: string;
  state: string;
  state_reason: string[];
  setup_type: string;
  trigger_price: number;
  stop_price: number;
  target_price_1: number;
  allowed_chase_pct: number;
  flow_scores: Record<string, number>;
  position_notional: number;
  last_updated_at: string;
  last?: number;
  day_chg_pct?: number;
}

export interface IntradayMeta {
  session: Record<string, unknown>;
  market_state: Record<string, unknown>;
  market_decision: MarketDecision;
  risk_rules: Record<string, unknown>;
  session_rules: Record<string, unknown>;
  adapter_settings: Record<string, unknown>;
  api_connection: Record<string, unknown>;
  [key: string]: unknown;
}

export interface IntradayRadarResult {
  radar: IntradayRadarRow[];
  snapshot_preview: unknown[];
  active_trades: unknown[];
  asof_kst: string;
  asof_et: string;
  session: Record<string, unknown>;
  market_state: Record<string, unknown>;
  market_decision: MarketDecision;
  [key: string]: unknown;
}

// --- API Functions ---

export function fetchHealth() {
  return get<Record<string, unknown>>("/api/health");
}

export interface ScanParams {
  market: string;
  horizon_days: number;
  top_n?: number;
  scr_ids?: string;
  symbols?: string;
  max_price?: number;
  min_avg_turnover?: number;
  market_cap_min?: number;
  today_turnover_min?: number;
  rel_volume_min?: number;
  ret_5d_min?: number;
  ret_5d_max?: number;
  close_position_min?: number;
  fresh_news_hours?: number;
  market_turnover_rank_max?: number;
  largecap_min?: number;
  largecap_quota?: number;
  kr_exclude_fundlike?: boolean;
  direct_mode?: boolean;
  held_symbols?: string;
}

export function fetchCandidates(p: ScanParams) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  }
  return get<ScanResult>(`/api/candidates?${q}`);
}

export function fetchTicker(symbol: string, market: string, horizon: number) {
  return get<TickerDetail>(
    `/api/ticker/${encodeURIComponent(symbol)}?market=${market}&horizon_days=${horizon}`
  );
}

export function fetchPromptMulti(params: Record<string, string>) {
  const q = new URLSearchParams(params);
  return get<string>(`/prompt_multi?${q}`);
}

export function fetchReportMultiData(params: Record<string, string>) {
  const q = new URLSearchParams(params);
  return get<unknown>(`/report_multi_data?${q}`);
}

export function fetchIntradayMeta(market: string) {
  return get<IntradayMeta>(`/api/intraday/meta?market=${market}`);
}

export function fetchIntradayRadar(params: {
  market: string;
  account_cash: number;
  account_equity: number;
  risk_budget_pct: number;
  max_items?: number;
}) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) q.set(k, String(v));
  return get<IntradayRadarResult>(`/api/intraday/radar?${q}`);
}

export function fetchIntradayJournal() {
  return get<{ journal: unknown[]; stats_preview: unknown }>("/api/intraday/journal");
}

export function fetchIntradayStats() {
  return get<{ stats: unknown }>("/api/intraday/stats");
}

export function postIntradayAdapter(body: Record<string, unknown>) {
  return post<{ saved: boolean; message: string; meta: unknown }>(
    "/api/intraday/adapter",
    body
  );
}

export function postJournalUpdate(body: Record<string, unknown>) {
  return post<{ saved: boolean; message: string }>(
    "/api/intraday/journal/update",
    body
  );
}
