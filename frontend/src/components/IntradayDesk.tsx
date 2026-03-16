"use client";
import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import {
  fetchIntradayMeta,
  fetchIntradayRadar,
  type IntradayMeta,
  type IntradayRadarResult,
  type IntradayRadarRow,
} from "@/lib/api";
import { fmtCompact, fmtPrice } from "@/lib/format";
import Badge from "./ui/Badge";
import Button from "./ui/Button";
import Card from "./ui/Card";
import Input from "./ui/Input";
import Select from "./ui/Select";

const REGIME_LABELS_KO: Record<string, string> = {
  MIXED: "혼조",
  RISK_ON: "리스크 온",
  RISK_OFF: "리스크 오프",
  NEUTRAL: "중립",
};

const STATE_LABELS_KO: Record<string, string> = {
  PREPARE: "준비",
  CONFIRM: "확인",
  TRIGGERED: "트리거",
  BLOCKED: "보류",
  EXPIRED: "만료",
};

const SETUP_LABELS_KO: Record<string, string> = {
  intraday_continuation: "추세 지속",
  opening_drive: "시가 드라이브",
  gap_and_go: "갭앤고",
  pullback: "눌림",
  reversal: "반전",
};

function translateRegime(value?: string, lang?: "ko" | "en") {
  if (!value) return "-";
  return lang === "ko" ? (REGIME_LABELS_KO[value] ?? value) : value;
}

function translateState(value: string, lang: "ko" | "en") {
  return lang === "ko" ? (STATE_LABELS_KO[value] ?? value) : value;
}

function translateSetup(value?: string, lang?: "ko" | "en") {
  if (!value) return "";
  return lang === "ko" ? (SETUP_LABELS_KO[value] ?? value) : value;
}

function translateReason(reason: string, lang: "ko" | "en") {
  if (lang !== "ko") return reason;
  const normalized = reason.toLowerCase();
  if (normalized.includes("watch only")) return "감시 전용";
  if (normalized.includes("today turnover filter passed")) return "당일 거래대금 기준 통과";
  if (normalized.includes("relative volume filter passed")) return "상대 거래량 기준 통과";
  if (normalized.includes("session")) return "세션 점검 완료";
  return reason;
}

export default function IntradayDesk() {
  const { lang } = useApp();
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState<IntradayMeta | null>(null);
  const [radar, setRadar] = useState<IntradayRadarResult | null>(null);
  const [market, setMarket] = useState<"KR" | "US">("KR");
  const [cash, setCash] = useState(10000000);
  const [equity, setEquity] = useState(10000000);
  const [riskBudget, setRiskBudget] = useState(0.8);

  const copy = lang === "ko"
    ? {
        title: "인트라데이 데스크",
        subtitle: "같은 날 안에서 바로 반응할 만한 세팅만 짧고 선명하게 정리합니다.",
        desc: "모멘텀 스카우트가 스윙용 정찰이라면, 여기는 당일 트리거를 빠르게 훑는 상황판에 가깝습니다.",
        refresh: "아이디어 새로고침",
        market: "시장",
        cash: "현금",
        equity: "총 평가금액",
        risk: "리스크 예산 (%)",
        marketDecision: "시장 판단",
        entryAllowed: "공격 가능",
        entryBlocked: "보수 운영",
        priority: "우선 감시",
        watch: "관찰 또는 대기",
        empty: "지금은 당길 만한 세팅이 없습니다",
        emptyDesc: "시장, 자금, 리스크 비율을 바꾸고 다시 불러와 보세요.",
        trigger: "트리거",
        stop: "손절",
        target: "목표",
        size: "권장 규모",
        disclaimer: "공개 데이터 기준 참고 화면입니다. 실제 체결 전에는 라이브 호가를 꼭 다시 보세요.",
        loadError: "인트라데이 데이터를 불러오지 못했습니다.",
      }
    : {
        title: "Intraday desk",
        subtitle: "A tighter board for same-session setups that might actually be worth your attention.",
        desc: "If Momentum Scout is the swing watchlist, this is the shorter-horizon radar for same-day triggers.",
        refresh: "Refresh ideas",
        market: "Market",
        cash: "Cash",
        equity: "Equity",
        risk: "Risk budget (%)",
        marketDecision: "Market read",
        entryAllowed: "Can press",
        entryBlocked: "Stay selective",
        priority: "Priority watch",
        watch: "Watch or wait",
        empty: "No actionable intraday setups right now",
        emptyDesc: "Try another market, cash size, or risk budget and refresh.",
        trigger: "Trigger",
        stop: "Stop",
        target: "Target",
        size: "Size",
        disclaimer: "Reference view based on public data. Check live spreads before touching any order button.",
        loadError: "Failed to load intraday data.",
      };

  const loadIdeas = async () => {
    setLoading(true);
    try {
      const [nextMeta, nextRadar] = await Promise.all([
        fetchIntradayMeta(market),
        fetchIntradayRadar({
          market,
          account_cash: cash,
          account_equity: equity,
          risk_budget_pct: riskBudget / 100,
        }),
      ]);
      setMeta(nextMeta);
      setRadar(nextRadar);
    } catch (error) {
      toast.error(
        `${copy.loadError}${error instanceof Error && error.message ? ` (${error.message})` : ""}`
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadIdeas();
  }, []);

  const marketDecision = radar?.market_decision ?? meta?.market_decision;
  const rows = radar?.radar ?? [];
  const priorityRows = useMemo(
    () => rows.filter((row) => ["TRIGGERED", "CONFIRM", "PREPARE"].includes(row.state)),
    [rows]
  );
  const watchRows = useMemo(
    () => rows.filter((row) => !["TRIGGERED", "CONFIRM", "PREPARE"].includes(row.state)),
    [rows]
  );

  return (
    <div className="w-full max-w-[1180px] mx-auto animate-fade-in">
      <div className="space-y-7">
        <Card className="p-8 sm:p-10">
          <div className="max-w-[820px] space-y-3">
            <div className="inline-flex rounded-full border border-[var(--border)] bg-[var(--card2)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              Intraday Radar
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-[2.2rem]">{copy.title}</h2>
            <p className="text-base leading-8 text-[var(--muted)]">{copy.subtitle}</p>
            <p className="text-sm leading-7 text-[var(--muted)]">{copy.desc}</p>
          </div>
        </Card>

        {marketDecision && (
          <Card className={clsx("p-6", marketDecision.new_entries_allowed ? "border-[var(--good)]/20" : "border-[var(--danger)]/20")}>
            <div className="flex flex-wrap items-center gap-3">
              <div className={clsx("h-2.5 w-2.5 rounded-full", marketDecision.new_entries_allowed ? "bg-[var(--good)]" : "bg-[var(--danger)]")} />
              <div className="text-base font-semibold">
                {copy.marketDecision}: {translateRegime(marketDecision.regime, lang)}
              </div>
              <Badge variant={marketDecision.new_entries_allowed ? "good" : "danger"}>
                {marketDecision.new_entries_allowed ? copy.entryAllowed : copy.entryBlocked}
              </Badge>
            </div>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
              {marketDecision.reason?.map((reason) => translateReason(reason, lang)).join(" · ")}
            </p>
          </Card>
        )}

        <Card className="p-7">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Select label={copy.market} value={market} onChange={(e) => setMarket(e.target.value as "KR" | "US")}>
              <option value="KR">KR</option>
              <option value="US">US</option>
            </Select>
            <Input label={copy.cash} type="number" value={cash} onChange={(e) => setCash(Number(e.target.value))} />
            <Input label={copy.equity} type="number" value={equity} onChange={(e) => setEquity(Number(e.target.value))} />
            <Input label={copy.risk} type="number" step="0.1" value={riskBudget} onChange={(e) => setRiskBudget(Number(e.target.value))} suffix="%" />
          </div>
          <div className="mt-5 flex justify-center">
            <Button variant="primary" className="w-full max-w-[320px] justify-center" loading={loading} onClick={loadIdeas}>
              {copy.refresh}
            </Button>
          </div>
        </Card>

        {!rows.length ? (
          <div className="flex min-h-[36vh] flex-col items-center justify-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-[22px] border border-[var(--border)] bg-[var(--card2)]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v4l2.5 2.5" />
              </svg>
            </div>
            <p className="text-lg font-semibold">{copy.empty}</p>
            <p className="text-sm text-[var(--muted)]">{copy.emptyDesc}</p>
          </div>
        ) : (
          <div className="space-y-7">
            {priorityRows.length > 0 && (
              <DeskSection title={copy.priority} count={priorityRows.length}>
                {priorityRows.map((row) => (
                  <IntradayIdeaCard key={row.symbol} row={row} market={market} lang={lang} labels={copy} />
                ))}
              </DeskSection>
            )}

            {watchRows.length > 0 && (
              <DeskSection title={copy.watch} count={watchRows.length}>
                {watchRows.map((row) => (
                  <IntradayIdeaCard key={row.symbol} row={row} market={market} lang={lang} labels={copy} muted />
                ))}
              </DeskSection>
            )}
          </div>
        )}

        <p className="pb-10 text-center text-sm leading-7 text-[var(--muted)]">{copy.disclaimer}</p>
      </div>
    </div>
  );
}

function DeskSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-2 w-2 rounded-full bg-[var(--accent)]" />
        <h3 className="text-lg font-semibold">{title}</h3>
        <span className="text-sm text-[var(--muted)]">{count}</span>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function IntradayIdeaCard({
  row,
  market,
  labels,
  lang,
  muted,
}: {
  row: IntradayRadarRow;
  market: string;
  labels: Record<string, string>;
  lang: "ko" | "en";
  muted?: boolean;
}) {
  const currency = market === "KR" ? "KRW" : "USD";
  const strongState = row.state === "TRIGGERED" || row.state === "CONFIRM";
  const badgeVariant = row.state === "BLOCKED" || row.state === "EXPIRED" ? "danger" : strongState ? "good" : "accent";

  return (
    <Card className={clsx("p-6 sm:p-7", muted ? "" : "border-[var(--accent)]/18")}>
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xl font-semibold tracking-tight">{row.symbol}</span>
            <Badge variant={badgeVariant}>{translateState(row.state, lang)}</Badge>
            {row.setup_type && <Badge variant="muted">{translateSetup(row.setup_type, lang)}</Badge>}
          </div>
          <p className="mt-2 text-sm text-[var(--muted)]">{row.name}</p>

          {row.state_reason?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {row.state_reason.slice(0, 3).map((reason) => (
                <span key={reason} className="rounded-full bg-[var(--card2)] px-3 py-1 text-xs text-[var(--muted)]">
                  {translateReason(reason, lang)}
                </span>
              ))}
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {typeof row.position_notional === "number" && row.position_notional > 0 && (
              <Badge variant="muted">
                {labels.size} {fmtCompact(row.position_notional)}
              </Badge>
            )}
            {typeof row.allowed_chase_pct === "number" && (
              <Badge variant="muted">Chase {row.allowed_chase_pct.toFixed(1)}%</Badge>
            )}
            {row.last_updated_at && <Badge variant="muted">{row.last_updated_at}</Badge>}
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-3 gap-4 xl:min-w-[320px]">
          <DeskStat label={labels.trigger} value={fmtPrice(row.trigger_price, currency)} />
          <DeskStat label={labels.stop} value={fmtPrice(row.stop_price, currency)} tone="danger" />
          <DeskStat label={labels.target} value={fmtPrice(row.target_price_1, currency)} tone="good" />
        </div>
      </div>
    </Card>
  );
}

function DeskStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "danger";
}) {
  return (
    <div className="rounded-[22px] border border-[var(--border)] bg-[var(--card2)] px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">{label}</div>
      <div
        className={clsx(
          "mt-2 text-base font-semibold tabular-nums",
          tone === "good" && "text-[var(--good)]",
          tone === "danger" && "text-[var(--danger)]"
        )}
      >
        {value}
      </div>
    </div>
  );
}
