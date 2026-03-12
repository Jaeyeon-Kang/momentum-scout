"use client";
import { useState, useEffect, useCallback } from "react";
import { useApp } from "@/lib/store";
import {
  fetchIntradayMeta,
  fetchIntradayRadar,
  type IntradayMeta,
  type IntradayRadarResult,
  type IntradayRadarRow,
} from "@/lib/api";
import { fmtPrice, fmtCompact } from "@/lib/format";
import Card from "./ui/Card";
import Button from "./ui/Button";
import Badge from "./ui/Badge";
import Input from "./ui/Input";
import Select from "./ui/Select";
import { clsx } from "clsx";
import { toast } from "sonner";

export default function IntradayDesk() {
  const { lang } = useApp();
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState<IntradayMeta | null>(null);
  const [radar, setRadar] = useState<IntradayRadarResult | null>(null);

  const [intradayMarket, setIntradayMarket] = useState<"KR" | "US">("KR");
  const [cash, setCash] = useState(10000000);
  const [equity, setEquity] = useState(10000000);
  const [riskBudget, setRiskBudget] = useState(0.8);

  const t = lang === "ko"
    ? {
        title: "데이트레이딩",
        subtitle: "당일 매매 후보를 한 번에 추려봅니다.",
        desc: "모멘텀 스카우트와 같은 흐름으로, 시장 상태를 보고 당일 대응 후보만 간단하게 추천받는 화면입니다.",
        refresh: "후보 다시 받기",
        market: "시장",
        cash: "계좌 현금",
        equity: "평가 금액",
        risk: "리스크 예산 (%)",
        marketJudge: "시장 판단",
        entryOk: "진입 가능",
        entryNo: "진입 제한",
        approved: "우선 확인 후보",
        watch: "관찰 / 보류 후보",
        items: "개",
        trigger: "트리거",
        stop: "손절",
        target: "목표",
        size: "추천 금액",
        empty: "추천 후보가 없습니다",
        emptyDesc: "조건을 조금 바꾸거나 다시 불러와 보세요.",
        disclaimer: "공개 데이터 기반 참고용 화면입니다. 실제 주문 전에는 호가와 체결을 직접 확인하세요.",
      }
    : {
        title: "Day Trading",
        subtitle: "Review same-day setups in one place.",
        desc: "This mirrors Momentum Scout, but focuses on simple intraday setup recommendations instead of desk-style tools.",
        refresh: "Refresh ideas",
        market: "Market",
        cash: "Cash",
        equity: "Equity",
        risk: "Risk Budget (%)",
        marketJudge: "Market Decision",
        entryOk: "Entry Allowed",
        entryNo: "Entry Restricted",
        approved: "Priority Setups",
        watch: "Watch / Hold",
        items: "items",
        trigger: "Trigger",
        stop: "Stop",
        target: "Target",
        size: "Size",
        empty: "No setups found",
        emptyDesc: "Try refreshing with a different configuration.",
        disclaimer: "Reference view based on public data. Check live quotes before sending any order.",
      };

  const loadIdeas = useCallback(async () => {
    setLoading(true);
    try {
      const [m, r] = await Promise.all([
        fetchIntradayMeta(intradayMarket),
        fetchIntradayRadar({
          market: intradayMarket,
          account_cash: cash,
          account_equity: equity,
          risk_budget_pct: riskBudget / 100,
        }),
      ]);
      setMeta(m);
      setRadar(r);
    } catch (err) {
      toast.error(`${lang === "ko" ? "불러오기 실패" : "Load failed"}: ${err instanceof Error ? err.message : ""}`);
    } finally {
      setLoading(false);
    }
  }, [intradayMarket, cash, equity, riskBudget, lang]);

  useEffect(() => {
    loadIdeas();
  }, [loadIdeas]);

  const marketDecision = radar?.market_decision || meta?.market_decision;
  const rows = radar?.radar || [];
  const approved = rows.filter((row) => ["TRIGGERED", "CONFIRM", "PREPARE"].includes(row.state));
  const watch = rows.filter((row) => !["TRIGGERED", "CONFIRM", "PREPARE"].includes(row.state));

  return (
    <div className="max-w-[1320px] mx-auto space-y-10 animate-fade-in">
      <div className="space-y-10">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-[2.15rem] font-bold tracking-tight">{t.title}</h1>
          <p className="text-base leading-8 text-[var(--muted)]">{t.subtitle}</p>
          <p className="text-base leading-8 text-[var(--muted)]">{t.desc}</p>
        </div>

        {marketDecision && (
          <div className={clsx(
            "rounded-[24px] p-6 sm:p-7 border",
            marketDecision.new_entries_allowed
              ? "bg-[var(--good-dim)] border-[var(--good)]/20"
              : "bg-[var(--danger-dim)] border-[var(--danger)]/20"
          )}>
            <div className="flex items-center gap-3 mb-3">
              <div className={clsx(
                "w-3 h-3 rounded-full animate-pulse",
                marketDecision.new_entries_allowed ? "bg-[var(--good)]" : "bg-[var(--danger)]"
              )} />
              <span className="text-base font-bold">
                {t.marketJudge}: {marketDecision.regime}
              </span>
              <Badge variant={marketDecision.new_entries_allowed ? "good" : "danger"}>
                {marketDecision.new_entries_allowed ? t.entryOk : t.entryNo}
              </Badge>
            </div>
            <p className="text-sm leading-7 text-[var(--muted)]">{marketDecision.reason?.join(" · ")}</p>
          </div>
        )}

        <Card className="space-y-5 p-7 sm:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Select label={t.market} value={intradayMarket} onChange={(e) => setIntradayMarket(e.target.value as "KR" | "US")}>
              <option value="KR">KR</option>
              <option value="US">US</option>
            </Select>
            <Input label={t.cash} type="number" value={cash} onChange={(e) => setCash(Number(e.target.value))} />
            <Input label={t.equity} type="number" value={equity} onChange={(e) => setEquity(Number(e.target.value))} />
            <Input label={t.risk} type="number" step="0.1" value={riskBudget} onChange={(e) => setRiskBudget(Number(e.target.value))} suffix="%" />
          </div>
          <Button variant="primary" className="w-full sm:w-auto" loading={loading} onClick={loadIdeas}>
            {t.refresh}
          </Button>
        </Card>

        {!rows.length ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[var(--card2)] flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v4l2.5 2.5" />
              </svg>
            </div>
            <p className="text-lg font-semibold">{t.empty}</p>
            <p className="text-base text-[var(--muted)]">{t.emptyDesc}</p>
          </div>
        ) : (
          <>
            {approved.length > 0 && (
              <Section title={t.approved} count={approved.length} suffix={t.items}>
                {approved.map((row) => (
                  <IntradayIdeaCard key={row.symbol} row={row} market={intradayMarket} labels={t} />
                ))}
              </Section>
            )}

            {watch.length > 0 && (
              <Section title={t.watch} count={watch.length} suffix={t.items}>
                {watch.map((row) => (
                  <IntradayIdeaCard key={row.symbol} row={row} market={intradayMarket} labels={t} muted />
                ))}
              </Section>
            )}
          </>
        )}

        <p className="text-sm leading-7 text-[var(--muted)] text-center pb-10">{t.disclaimer}</p>
      </div>
    </div>
  );
}

function Section({
  title,
  count,
  suffix,
  children,
}: {
  title: string;
  count: number;
  suffix: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2.5 mb-1">
        <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
        <h2 className="text-lg font-bold">{title}</h2>
        <span className="text-sm text-[var(--muted)]">{count}{suffix}</span>
      </div>
      <div className="space-y-6">{children}</div>
    </div>
  );
}

function IntradayIdeaCard({
  row,
  market,
  labels,
  muted,
}: {
  row: IntradayRadarRow;
  market: string;
  labels: Record<string, string>;
  muted?: boolean;
}) {
  const currency = market === "KR" ? "KRW" : "USD";
  const strongState = row.state === "TRIGGERED" || row.state === "CONFIRM";
  const badgeVariant = row.state === "BLOCKED" || row.state === "EXPIRED"
    ? "danger"
    : strongState
      ? "good"
      : "accent";

  return (
    <div className={clsx(
      "group flex items-start gap-5 p-6 sm:p-7 rounded-[26px] border shadow-[var(--shadow-sm)] transition-all duration-200",
      muted
        ? "border-[var(--border)] bg-white"
        : "border-[var(--accent)]/25 bg-white"
    )}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="font-bold tracking-tight text-xl">{row.symbol}</span>
          <Badge variant={badgeVariant}>{row.state}</Badge>
          {row.setup_type && <Badge variant="muted">{row.setup_type}</Badge>}
        </div>
        <p className="text-sm text-[var(--muted)] mt-1.5 truncate">{row.name}</p>
        {row.state_reason?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {row.state_reason.slice(0, 3).map((reason) => (
              <span key={reason} className="text-xs text-[var(--accent)] bg-[var(--accent-dim)] px-2.5 py-1 rounded-full">
                {reason}
              </span>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2 mt-3">
          {typeof row.position_notional === "number" && row.position_notional > 0 && (
            <Badge variant="muted">{labels.size} {fmtCompact(row.position_notional)}</Badge>
          )}
          {typeof row.allowed_chase_pct === "number" && (
            <Badge variant="muted">Chase {row.allowed_chase_pct.toFixed(1)}%</Badge>
          )}
          {row.last_updated_at && <Badge variant="muted">{row.last_updated_at}</Badge>}
        </div>
      </div>

      <div className="flex gap-6 shrink-0 text-right">
        <Stat label={labels.trigger} value={fmtPrice(row.trigger_price, currency)} />
        <Stat label={labels.stop} value={fmtPrice(row.stop_price, currency)} color={false} />
        <Stat label={labels.target} value={fmtPrice(row.target_price_1, currency)} color />
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: boolean }) {
  return (
    <div className="flex flex-col items-end gap-1 min-w-[64px]">
      <span className="text-xs text-[var(--muted)]">{label}</span>
      <span className={clsx(
        "text-base font-bold tabular-nums",
        color === true && "text-[var(--good)]",
        color === false && "text-[var(--danger)]"
      )}>
        {value}
      </span>
    </div>
  );
}
