"use client";

import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { toast } from "sonner";
import {
  fetchIntradayMeta,
  fetchIntradayRadar,
  type IntradayMeta,
  type IntradayRadarResult,
  type IntradayRadarRow,
} from "@/lib/api";
import {
  calcRiskReward,
  formatUpdatedAt,
  getIntradayCardInterpretation,
  getIntradayModeHint,
  getIntradayRules,
  getStateActionHint,
  sortIntradayRows,
  translateReasonText,
  translateRegime,
  translateSetup,
  translateState,
} from "@/lib/decision";
import { fmtCompact, fmtPrice } from "@/lib/format";
import { useApp } from "@/lib/store";
import Badge from "./ui/Badge";
import Button from "./ui/Button";
import Card from "./ui/Card";
import Input from "./ui/Input";
import Select from "./ui/Select";

export default function IntradayDesk() {
  const { lang, viewMode } = useApp();
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState<IntradayMeta | null>(null);
  const [radar, setRadar] = useState<IntradayRadarResult | null>(null);
  const [market, setMarket] = useState<"KR" | "US">("KR");
  const [cash, setCash] = useState(10000000);
  const [equity, setEquity] = useState(10000000);
  const [riskBudget, setRiskBudget] = useState(0.8);

  const currency = market === "KR" ? "KRW" : "USD";
  const riskBudgetAmount = useMemo(
    () => Math.max(0, equity * (riskBudget / 100)),
    [equity, riskBudget]
  );

  // Input validation
  const cashWarn = cash < 0 ? (lang === "ko" ? "현금은 0 이상이어야 합니다" : "Cash must be >= 0") : undefined;
  const equityWarn = equity < 0 ? (lang === "ko" ? "자산은 0 이상이어야 합니다" : "Equity must be >= 0") : undefined;
  const riskWarn =
    riskBudget < 0
      ? (lang === "ko" ? "손실 한도는 0 이상이어야 합니다" : "Loss cap must be >= 0")
      : riskBudget > 10
        ? (lang === "ko" ? "10%를 넘으면 위험합니다. 정말 이 값이 맞는지 확인하세요" : "Above 10% is risky. Double-check this value")
        : undefined;
  const inputsValid = cash >= 0 && equity >= 0 && riskBudget >= 0 && riskBudget <= 100;

  const copy =
    lang === "ko"
      ? {
          title: "인트라데이 데스크",
          subtitle: "지금 눌러도 되는지부터 판단하는 당일 매매 작업대",
          desc: "이 화면은 종목 추천보다 먼저, 시장 상태·손실 한도·진입 타이밍을 한 번에 보는 데 집중합니다.",
          refresh: "실시간 후보 다시 계산",
          market: "시장",
          cash: "주문 가능 현금",
          cashHelp: "오늘 새 포지션에 실제로 넣을 수 있는 현금입니다.",
          equity: "총 자산 평가액",
          equityHelp: "현금과 보유 종목을 합친 계좌 전체 크기입니다. 손실 한도 계산의 기준입니다.",
          risk: "오늘 손실 한도 (%)",
          riskHelp: "오늘 하루 이 계좌에서 감수할 최대 손실 비율입니다.",
          marketDecision: "오늘의 운영 모드",
          entryAllowed: "진입 열림",
          entryBlocked: "보수 운영",
          whyInputsMatterTitle: "왜 이 값을 묻나",
          whyInputsMatterText:
            "이 값들은 보기 좋으라고 받는 게 아니라, 추천별 포지션 규모와 허용 손실을 계산하려고 필요합니다.",
          riskBudgetAmountLabel: "오늘 허용 손실",
          rulesTitle: "오늘 기본 규칙",
          stateLegendTitle: "상태 해석",
          priority: "지금 볼 후보",
          watch: "관찰 또는 제외",
          empty: "지금 당길 만한 후보가 없습니다",
          emptyDesc: "시장 상태가 애매하거나, 손실 한도 대비 좋은 자리가 아직 없습니다.",
          trigger: "진입",
          stop: "손절",
          target: "1차 목표",
          size: "권장 규모",
          actionHint: "지금 행동",
          reasons: "왜 이 후보인가",
          interpretation: "해석",
          disclaimer:
            "공개 데이터 기준 참고 화면입니다. 실제 체결 전에는 호가와 스프레드를 한 번 더 확인하세요.",
          loadError: "인트라데이 데이터를 불러오지 못했습니다.",
          heroTag: "의사결정 데스크",
        }
      : {
          title: "Intraday Desk",
          subtitle: "A same-day decision desk that starts by asking whether pressing risk even makes sense.",
          desc: "This screen focuses on market tone, loss limits, and entry timing before it talks about symbols.",
          refresh: "Recompute live candidates",
          market: "Market",
          cash: "Orderable cash",
          cashHelp: "Cash you can actually deploy into fresh positions today.",
          equity: "Total account equity",
          equityHelp: "Your full account size, including cash and open positions. It anchors risk sizing.",
          risk: "Daily loss cap (%)",
          riskHelp: "The maximum loss percentage you are willing to take today.",
          marketDecision: "Today's operating mode",
          entryAllowed: "Entry open",
          entryBlocked: "Defensive mode",
          whyInputsMatterTitle: "Why ask for this",
          whyInputsMatterText:
            "These values are used to size positions and calculate allowed loss, not to decorate the form.",
          riskBudgetAmountLabel: "Today's allowed loss",
          rulesTitle: "Today's ground rules",
          stateLegendTitle: "State legend",
          priority: "Priority candidates",
          watch: "Watch or avoid",
          empty: "There is nothing worth forcing right now",
          emptyDesc: "Market conditions are mixed, or no setup clears your loss budget cleanly yet.",
          trigger: "Trigger",
          stop: "Stop",
          target: "Target 1",
          size: "Suggested size",
          actionHint: "Action",
          reasons: "Why it is on the desk",
          interpretation: "Read",
          disclaimer:
            "Reference view based on public data. Check live spreads and tape before you touch an order.",
          loadError: "Failed to load intraday data.",
          heroTag: "Decision Desk",
        };

  const loadIdeas = async () => {
    if (!inputsValid) return;
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
    // Initial load only. Inputs update on explicit refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const marketDecision = radar?.market_decision ?? meta?.market_decision;
  const rows = useMemo(() => sortIntradayRows(radar?.radar ?? []), [radar?.radar]);
  const priorityRows = useMemo(
    () => rows.filter((row) => ["TRIGGERED", "CONFIRM", "PREPARE"].includes(row.state)),
    [rows]
  );
  const watchRows = useMemo(
    () => rows.filter((row) => !["TRIGGERED", "CONFIRM", "PREPARE"].includes(row.state)),
    [rows]
  );
  const rules = useMemo(
    () => getIntradayRules(marketDecision?.new_entries_allowed ?? false, lang),
    [marketDecision?.new_entries_allowed, lang]
  );

  return (
    <div className="mx-auto w-full max-w-[1280px] animate-fade-in">
      <div className="space-y-7">
        <Card className="p-8 sm:p-10">
          <div className="max-w-[860px] space-y-4">
            <div className="inline-flex rounded-full border border-[var(--border)] bg-[var(--card2)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              {copy.heroTag}
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight sm:text-[2.2rem]">{copy.title}</h2>
              <p className="text-base leading-8 text-[var(--fg)]/84">{copy.subtitle}</p>
            </div>
            <p className="max-w-[760px] text-sm leading-7 text-[var(--muted)]">{copy.desc}</p>
          </div>
        </Card>

        {marketDecision && (
          <Card
            className={clsx(
              "space-y-4 p-6",
              marketDecision.new_entries_allowed
                ? "border-[var(--good)]/20"
                : "border-[var(--danger)]/20"
            )}
          >
            <div className="flex flex-wrap items-center gap-3">
              <div
                className={clsx(
                  "h-2.5 w-2.5 rounded-full",
                  marketDecision.new_entries_allowed ? "bg-[var(--good)]" : "bg-[var(--danger)]"
                )}
              />
              <div className="text-base font-semibold">
                {copy.marketDecision}: {translateRegime(marketDecision.regime, lang)}
              </div>
              <Badge variant={marketDecision.new_entries_allowed ? "good" : "danger"}>
                {marketDecision.new_entries_allowed ? copy.entryAllowed : copy.entryBlocked}
              </Badge>
            </div>
            <p className="text-sm leading-7 text-[var(--fg)]/88">
              {getIntradayModeHint(marketDecision.new_entries_allowed, lang)}
            </p>
            {marketDecision.reason?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {marketDecision.reason.slice(0, 4).map((reason) => (
                  <span
                    key={reason}
                    className="rounded-full border border-[var(--border)] bg-[var(--card2)] px-3 py-1 text-xs text-[var(--muted)]"
                  >
                    {translateReasonText(reason, lang)}
                  </span>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Rules strip */}
        {viewMode === "guide" && marketDecision && (
          <div className="flex flex-wrap gap-3">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)] self-center">
              {copy.rulesTitle}
            </div>
            {rules.map((rule) => (
              <span
                key={rule}
                className="rounded-full border border-[var(--border)] bg-[var(--card2)] px-3 py-1.5 text-xs text-[var(--muted)]"
              >
                {rule}
              </span>
            ))}
          </div>
        )}

        <Card className="space-y-5 p-7">
          {viewMode === "guide" && (
            <div className="space-y-2">
              <div className="text-sm font-semibold">{copy.whyInputsMatterTitle}</div>
              <p className="text-sm leading-7 text-[var(--muted)]">{copy.whyInputsMatterText}</p>
            </div>
          )}
          <div className="grid gap-3 lg:grid-cols-3">
            <SummaryMetricCard
              label={copy.cash}
              value={fmtPrice(cash, currency)}
              description={copy.cashHelp}
            />
            <SummaryMetricCard
              label={copy.equity}
              value={fmtPrice(equity, currency)}
              description={copy.equityHelp}
            />
            <SummaryMetricCard
              label={copy.riskBudgetAmountLabel}
              value={`${riskBudget.toFixed(1)}% · ${fmtPrice(riskBudgetAmount, currency)}`}
              description={copy.riskHelp}
            />
          </div>
        </Card>

        <Card className="p-7">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Select
              label={copy.market}
              value={market}
              help={lang === "ko" ? "시장에 따라 통화와 후보 풀이 달라집니다." : "Market changes the currency and candidate pool."}
              onChange={(e) => setMarket(e.target.value as "KR" | "US")}
            >
              <option value="KR">KR</option>
              <option value="US">US</option>
            </Select>
            <Input
              label={copy.cash}
              type="number"
              value={cash}
              help={copy.cashHelp}
              warn={cashWarn}
              onChange={(e) => setCash(Number(e.target.value))}
            />
            <Input
              label={copy.equity}
              type="number"
              value={equity}
              help={copy.equityHelp}
              warn={equityWarn}
              onChange={(e) => setEquity(Number(e.target.value))}
            />
            <Input
              label={copy.risk}
              type="number"
              step="0.1"
              value={riskBudget}
              help={copy.riskHelp}
              warn={riskWarn}
              onChange={(e) => setRiskBudget(Number(e.target.value))}
              suffix="%"
            />
          </div>
          <div className="mt-5 flex justify-center">
            <Button
              variant="primary"
              className="w-full max-w-[320px] justify-center"
              loading={loading}
              disabled={!inputsValid}
              onClick={loadIdeas}
            >
              {copy.refresh}
            </Button>
          </div>
        </Card>

        {viewMode === "guide" && (
          <Card className="space-y-4 p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold">{copy.stateLegendTitle}</h3>
              <Badge variant="muted">{lang === "ko" ? "신호 읽는 법" : "How to read states"}</Badge>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <LegendCard
                state={translateState("PREPARE", lang)}
                description={lang === "ko" ? "감시만 시작" : "Start watching only"}
              />
              <LegendCard
                state={translateState("CONFIRM", lang)}
                description={lang === "ko" ? "조건 거의 충족" : "Conditions nearly met"}
              />
              <LegendCard
                state={translateState("TRIGGERED", lang)}
                description={lang === "ko" ? "유효 구간 진입 가능" : "Valid entry window"}
                tone="good"
              />
              <LegendCard
                state={translateState("EXPIRED", lang)}
                description={lang === "ko" ? "이미 많이 움직여 추격 위험" : "Already extended"}
                tone="danger"
              />
              <LegendCard
                state={translateState("BLOCKED", lang)}
                description={
                  lang === "ko"
                    ? "시장 리스크로 신규 진입 금지"
                    : "Market risk blocks fresh entries"
                }
                tone="danger"
              />
            </div>
          </Card>
        )}

        {!rows.length ? (
          <div className="flex min-h-[36vh] flex-col items-center justify-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-[22px] border border-[var(--border)] bg-[var(--card2)]">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--muted)"
                strokeWidth="1.5"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v4l2.5 2.5" />
              </svg>
            </div>
            <p className="text-lg font-semibold">{copy.empty}</p>
            <p className="max-w-[520px] text-center text-sm leading-7 text-[var(--muted)]">
              {copy.emptyDesc}
            </p>
          </div>
        ) : (
          <div className="space-y-7">
            {priorityRows.length > 0 && (
              <DeskSection title={copy.priority} count={priorityRows.length}>
                {priorityRows.map((row) => (
                  <IntradayIdeaCard key={row.symbol} row={row} market={market} equity={equity} lang={lang} labels={copy} />
                ))}
              </DeskSection>
            )}

            {watchRows.length > 0 && (
              <DeskSection title={copy.watch} count={watchRows.length}>
                {watchRows.map((row) => (
                  <IntradayIdeaCard
                    key={row.symbol}
                    row={row}
                    market={market}
                    equity={equity}
                    lang={lang}
                    labels={copy}
                    muted
                  />
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

function SummaryMetricCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-[22px] border border-[var(--border)] bg-[var(--card2)] p-4">
      <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">{label}</div>
      <div className="mt-2 text-lg font-semibold tabular-nums">{value}</div>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
    </div>
  );
}

function LegendCard({
  state,
  description,
  tone,
}: {
  state: string;
  description: string;
  tone?: "good" | "danger";
}) {
  return (
    <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card2)] p-4">
      <div
        className={clsx(
          "text-sm font-semibold",
          tone === "good" && "text-[var(--good)]",
          tone === "danger" && "text-[var(--danger)]"
        )}
      >
        {state}
      </div>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
    </div>
  );
}

function IntradayIdeaCard({
  row,
  market,
  equity,
  labels,
  lang,
  muted,
}: {
  row: IntradayRadarRow;
  market: string;
  equity: number;
  labels: Record<string, string>;
  lang: "ko" | "en";
  muted?: boolean;
}) {
  const currency = market === "KR" ? "KRW" : "USD";
  const strongState = row.state === "TRIGGERED" || row.state === "CONFIRM";
  const badgeVariant =
    row.state === "BLOCKED" || row.state === "EXPIRED" ? "danger" : strongState ? "good" : "accent";
  const translatedReasons = row.state_reason
    ?.map((reason) => translateReasonText(reason, lang))
    .filter(Boolean)
    .slice(0, 3);
  const riskReward = calcRiskReward(row);
  const updateLabel = formatUpdatedAt(row.last_updated_at, lang);
  const interpretation = getIntradayCardInterpretation(row, lang);

  // Size with % of equity
  const sizeLabel = useMemo(() => {
    if (typeof row.position_notional !== "number" || row.position_notional <= 0) return null;
    const pct = equity > 0 ? ((row.position_notional / equity) * 100).toFixed(1) : null;
    const amount = fmtCompact(row.position_notional, lang);
    if (pct) {
      return lang === "ko"
        ? `${amount} · 자산의 ${pct}%`
        : `${amount} · ${pct}% of equity`;
    }
    return amount;
  }, [row.position_notional, equity, lang]);

  const isWarning = row.state === "EXPIRED" || row.state === "BLOCKED";

  return (
    <Card className={clsx("p-6 sm:p-7", muted ? "" : "border-[var(--accent)]/18")}>
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xl font-semibold tracking-tight">{row.symbol}</span>
              <Badge variant={badgeVariant}>{translateState(row.state, lang)}</Badge>
              {row.setup_type && <Badge variant="muted">{translateSetup(row.setup_type, lang)}</Badge>}
              <Badge variant="muted">{getStateActionHint(row.state, lang)}</Badge>
            </div>
            <p className="mt-2 text-sm text-[var(--muted)]">{row.name}</p>
          </div>

          {/* Warning for EXPIRED / BLOCKED */}
          {isWarning && (
            <div className="rounded-[18px] bg-[var(--danger-dim)] px-4 py-2.5 text-sm leading-7 text-[var(--danger)]">
              {interpretation}
            </div>
          )}

          {/* Interpretation for non-warning */}
          {!isWarning && interpretation && (
            <p className="text-sm leading-7 text-[var(--fg)]/80">
              <span className="font-semibold text-[var(--muted)]">{labels.interpretation}: </span>
              {interpretation}
            </p>
          )}

          {translatedReasons?.length ? (
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                {labels.reasons}
              </div>
              <div className="flex flex-wrap gap-2">
                {translatedReasons.map((reason) => (
                  <span
                    key={reason}
                    className="rounded-full border border-[var(--border)] bg-[var(--card2)] px-3 py-1 text-xs text-[var(--muted)]"
                  >
                    {reason}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {sizeLabel && (
              <Badge variant="muted">
                {labels.size} {sizeLabel}
              </Badge>
            )}
            {typeof row.allowed_chase_pct === "number" && row.allowed_chase_pct >= 0 && (
              <Badge variant="muted">
                {lang === "ko"
                  ? `추격 허용 +${row.allowed_chase_pct.toFixed(1)}%`
                  : `Chase room +${row.allowed_chase_pct.toFixed(1)}%`}
              </Badge>
            )}
            {riskReward && (
              <Badge variant={riskReward >= 2 ? "good" : "muted"}>
                {lang === "ko" ? `손익비 ${riskReward.toFixed(1)}R` : `R:R ${riskReward.toFixed(1)}R`}
              </Badge>
            )}
            {updateLabel && <Badge variant="muted">{updateLabel}</Badge>}
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
