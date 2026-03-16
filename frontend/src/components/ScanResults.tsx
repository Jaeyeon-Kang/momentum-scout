"use client";
import { useMemo, useState } from "react";
import { clsx } from "clsx";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import { fetchPromptMulti, fetchTicker, type Candidate, type TickerDetail } from "@/lib/api";
import { fmt, fmtCompact, fmtPct, fmtPrice, fmtTurnover } from "@/lib/format";
import Badge from "./ui/Badge";
import Button from "./ui/Button";
import Card from "./ui/Card";
import Modal, { ModalBody, ModalHeader } from "./ui/Modal";

export default function ScanResults() {
  const {
    lang,
    market,
    horizon,
    scanResult,
    selected,
    toggleSelected,
    selectAll,
    clearSelection,
  } = useApp();

  const [detailModal, setDetailModal] = useState<{
    symbol: string;
    data: TickerDetail | null;
    loading: boolean;
  } | null>(null);
  const [promptPreview, setPromptPreview] = useState<string | null>(null);
  const [promptLoading, setPromptLoading] = useState(false);

  const copy = lang === "ko"
    ? {
        empty: "먼저 스캔을 돌려주세요",
        emptyDesc: "설정 화면에서 기준을 잡고 스캔하면 후보가 여기에 모입니다.",
        marketDecision: "시장 판단",
        entryAllowed: "신규 진입 가능",
        entryBlocked: "신규 진입 보수",
        approved: "우선 확인 후보",
        watchlist: "관찰 또는 보류",
        total: "총 후보",
        selected: "선택",
        selectAll: "전체 선택",
        clearSelection: "선택 해제",
        prompt: "AI 프롬프트 만들기",
        promptHint: "체크한 종목만 묶어서 프롬프트를 만듭니다.",
        promptCopy: "클립보드 복사",
        close: "닫기",
        disclaimer: "공개 데이터 기준 참고 화면입니다. 실제 주문 전에는 체결가와 호가를 다시 확인하세요.",
        detailError: "상세 데이터를 불러오지 못했습니다.",
        promptError: "프롬프트 생성에 실패했습니다.",
        promptCopied: "프롬프트를 복사했습니다.",
        approvedLabel: "우선순위",
        avoidLabel: "보수",
        watchLabel: "관찰",
        turnover: "거래대금",
        marketCap: "시총",
        rank: "순위",
        price: "현재가",
        relVol: "상대 거래량",
        score: "점수",
        detailPlan: "트레이드 플랜",
        detailLevels: "가격 레벨",
        detailStats: "통계",
        detailNews: "최근 뉴스",
        entryTrigger: "진입 트리거",
        stop: "손절",
        target: "목표",
      }
    : {
        empty: "Run a scan first",
        emptyDesc: "Candidates will gather here once you scan from the setup view.",
        marketDecision: "Market read",
        entryAllowed: "New entries allowed",
        entryBlocked: "Stay selective",
        approved: "Priority names",
        watchlist: "Watch or hold",
        total: "Total",
        selected: "Selected",
        selectAll: "Select all",
        clearSelection: "Clear selection",
        prompt: "Build AI prompt",
        promptHint: "Only checked symbols are bundled into the prompt.",
        promptCopy: "Copy prompt",
        close: "Close",
        disclaimer: "Reference view based on public data. Re-check quotes and spreads before any live order.",
        detailError: "Failed to load detail.",
        promptError: "Failed to generate prompt.",
        promptCopied: "Prompt copied.",
        approvedLabel: "Priority",
        avoidLabel: "Avoid",
        watchLabel: "Watch",
        turnover: "Turnover",
        marketCap: "Mcap",
        rank: "Rank",
        price: "Price",
        relVol: "Rel vol",
        score: "Score",
        detailPlan: "Trade plan",
        detailLevels: "Levels",
        detailStats: "Statistics",
        detailNews: "Recent news",
        entryTrigger: "Entry trigger",
        stop: "Stop",
        target: "Target",
      };

  const allSelected = scanResult?.candidates?.length
    ? selected.size === scanResult.candidates.length
    : false;

  const approved = useMemo(
    () => scanResult?.candidates.filter((candidate) => candidate.entry_status === "APPROVED_NEW") ?? [],
    [scanResult]
  );
  const watchlist = useMemo(
    () => scanResult?.candidates.filter((candidate) => candidate.entry_status !== "APPROVED_NEW") ?? [],
    [scanResult]
  );

  const openDetail = async (symbol: string) => {
    setDetailModal({ symbol, data: null, loading: true });
    try {
      const data = await fetchTicker(symbol, market, horizon);
      setDetailModal({ symbol, data, loading: false });
    } catch {
      toast.error(copy.detailError);
      setDetailModal(null);
    }
  };

  const generatePrompt = async () => {
    if (!selected.size) return;
    setPromptLoading(true);
    try {
      const text = await fetchPromptMulti({
        symbols: [...selected].join(","),
        market,
        horizon_days: String(horizon),
        max_items: String(Math.min(selected.size, 5)),
      });
      setPromptPreview(String(text));
    } catch {
      toast.error(copy.promptError);
    } finally {
      setPromptLoading(false);
    }
  };

  const copyPrompt = async () => {
    if (!promptPreview) return;
    await navigator.clipboard.writeText(promptPreview);
    toast.success(copy.promptCopied);
  };

  if (!scanResult) {
    return (
      <div className="flex min-h-[48vh] flex-col items-center justify-center gap-5 animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-[24px] border border-[var(--border)] bg-[var(--card2)]">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5">
            <circle cx="11" cy="11" r="7.5" />
            <path d="m20 20-4-4" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold">{copy.empty}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">{copy.emptyDesc}</p>
        </div>
      </div>
    );
  }

  const decision = scanResult.market_decision;
  const marketReasons = decision.reason?.join(lang === "ko" ? " · " : " · ") ?? "";

  return (
    <div className="grid max-w-[1320px] items-start gap-8 xl:grid-cols-[minmax(0,1fr)_380px] animate-fade-in">
      <div className="min-w-0 space-y-7">
        <Card className={clsx(
          "p-7",
          decision.new_entries_allowed ? "border-[var(--good)]/20" : "border-[var(--danger)]/20"
        )}>
          <div className="flex flex-wrap items-center gap-3">
            <div className={clsx("h-2.5 w-2.5 rounded-full", decision.new_entries_allowed ? "bg-[var(--good)]" : "bg-[var(--danger)]")} />
            <div className="text-base font-semibold">
              {copy.marketDecision}: {decision.regime}
            </div>
            <Badge variant={decision.new_entries_allowed ? "good" : "danger"}>
              {decision.new_entries_allowed ? copy.entryAllowed : copy.entryBlocked}
            </Badge>
          </div>
          <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{marketReasons}</p>
          {decision.macro_snapshot && (
            <div className="mt-4 flex flex-wrap gap-2">
              {Object.entries(decision.macro_snapshot).map(([key, value]) => (
                <Badge key={key} variant="muted">
                  {key}: {typeof value === "number" ? value.toFixed(2) : String(value)}
                </Badge>
              ))}
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-3 rounded-[28px] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-sm)] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
            <Badge variant="muted">{copy.total} {scanResult.candidates.length}</Badge>
            <Badge variant="muted">{copy.selected} {selected.size}</Badge>
            <Badge variant="muted">{market}</Badge>
            <Badge variant="muted">{horizon}D</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => (allSelected ? clearSelection() : selectAll())}>
              {allSelected ? copy.clearSelection : copy.selectAll}
            </Button>
            <Button size="sm" variant="primary" loading={promptLoading} disabled={!selected.size} onClick={generatePrompt}>
              {copy.prompt}
            </Button>
          </div>
        </div>

        {approved.length > 0 && (
          <ResultSection title={copy.approved} count={approved.length}>
            {approved.map((candidate, index) => (
              <CandidateCard
                key={candidate.symbol}
                candidate={candidate}
                rank={index + 1}
                checked={selected.has(candidate.symbol)}
                onToggle={() => toggleSelected(candidate.symbol)}
                onOpen={() => openDetail(candidate.symbol)}
                market={market}
                horizon={horizon}
                lang={lang}
                labels={copy}
              />
            ))}
          </ResultSection>
        )}

        {watchlist.length > 0 && (
          <ResultSection title={copy.watchlist} count={watchlist.length}>
            {watchlist.map((candidate, index) => (
              <CandidateCard
                key={candidate.symbol}
                candidate={candidate}
                rank={approved.length + index + 1}
                checked={selected.has(candidate.symbol)}
                onToggle={() => toggleSelected(candidate.symbol)}
                onOpen={() => openDetail(candidate.symbol)}
                market={market}
                horizon={horizon}
                lang={lang}
                labels={copy}
              />
            ))}
          </ResultSection>
        )}

        <p className="pb-10 text-center text-sm leading-7 text-[var(--muted)]">{copy.disclaimer}</p>
      </div>

      <aside className="hidden xl:block">
        <div className="sticky top-28">
          <Card className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">{copy.prompt}</div>
                <p className="mt-1 text-sm leading-7 text-[var(--muted)]">{copy.promptHint}</p>
              </div>
              {promptPreview && (
                <Button size="sm" variant="ghost" onClick={() => setPromptPreview(null)}>
                  {copy.close}
                </Button>
              )}
            </div>

            {promptPreview ? (
              <>
                <textarea
                  readOnly
                  value={promptPreview}
                  className="mt-5 h-[460px] w-full resize-none rounded-[24px] border border-[var(--border)] bg-[var(--card2)] p-4 font-mono text-sm leading-7 text-[var(--text)] outline-none"
                />
                <Button className="mt-4 w-full justify-center" size="sm" variant="primary" onClick={copyPrompt}>
                  {copy.promptCopy}
                </Button>
              </>
            ) : (
              <div className="mt-6 rounded-[24px] border border-dashed border-[var(--border)] bg-[var(--card2)] px-5 py-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-dim)] text-[var(--accent)]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M8 10h8M8 14h5M6 3h8l4 4v14H6z" />
                  </svg>
                </div>
                <p className="mt-4 text-sm leading-7 text-[var(--muted)]">{copy.promptHint}</p>
              </div>
            )}
          </Card>
        </div>
      </aside>

      <Modal open={!!detailModal} onClose={() => setDetailModal(null)}>
        {detailModal && (
          <>
            <ModalHeader onClose={() => setDetailModal(null)}>
              <h2 className="text-lg font-semibold">{detailModal.symbol}</h2>
              {detailModal.data && <p className="text-sm text-[var(--muted)]">{detailModal.data.name}</p>}
            </ModalHeader>
            <ModalBody>
              {detailModal.loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="skeleton h-7 rounded-[14px]" />
                  ))}
                </div>
              ) : detailModal.data ? (
                <DetailContent data={detailModal.data} market={market} labels={copy} />
              ) : null}
            </ModalBody>
          </>
        )}
      </Modal>
    </div>
  );
}

function ResultSection({
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

function CandidateCard({
  candidate,
  rank,
  checked,
  onToggle,
  onOpen,
  market,
  horizon,
  lang,
  labels,
}: {
  candidate: Candidate;
  rank: number;
  checked: boolean;
  onToggle: () => void;
  onOpen: () => void;
  market: string;
  horizon: number;
  lang: "ko" | "en";
  labels: Record<string, string>;
}) {
  const isApproved = candidate.entry_status === "APPROVED_NEW";
  const currency = candidate.currency || (market === "KR" ? "KRW" : "USD");
  const tagLabel = isApproved
    ? labels.approvedLabel
    : candidate.entry_status === "AVOID"
      ? labels.avoidLabel
      : labels.watchLabel;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={clsx(
        "glass-panel w-full rounded-[28px] border p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow)]",
        isApproved ? "border-[var(--good)]/22" : "border-[var(--border)]"
      )}
    >
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <label
              className="flex h-6 w-6 shrink-0 items-center justify-center"
              onClick={(event) => event.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={onToggle}
                className="h-4 w-4 cursor-pointer rounded accent-[var(--accent)]"
              />
            </label>
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">#{rank}</span>
            <span className="text-xl font-semibold tracking-tight">{candidate.symbol}</span>
            <Badge variant={isApproved ? "good" : candidate.entry_status === "AVOID" ? "danger" : "accent"}>
              {tagLabel}
            </Badge>
            <PctBadge value={candidate.day_chg_pct} />
          </div>

          <p className="mt-2 truncate text-sm text-[var(--muted)]">{candidate.name}</p>

          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="muted">{labels.turnover} {fmtTurnover(candidate.day_turnover, currency)}</Badge>
            {candidate.market_cap > 0 && <Badge variant="muted">{labels.marketCap} {fmtCompact(candidate.market_cap)}</Badge>}
            {candidate.extras?.market_turnover_rank && <Badge variant="muted">{labels.rank} #{candidate.extras.market_turnover_rank}</Badge>}
            {candidate.extras?.bucket_tags?.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="accent">
                {tag}
              </Badge>
            ))}
          </div>

          {candidate.entry_reason?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {candidate.entry_reason.slice(0, 4).map((reason) => (
                <span key={reason} className="rounded-full bg-[var(--card2)] px-3 py-1 text-xs text-[var(--muted)]">
                  {reason}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-4 sm:grid-cols-4 xl:min-w-[340px]">
          <Stat label={labels.price} value={fmtPrice(candidate.last, currency)} />
          <Stat label={labels.relVol} value={candidate.rel_vol_20d ? `${candidate.rel_vol_20d.toFixed(1)}x` : "-"} />
          <Stat label={`${horizon}D`} value={fmtPct(candidate.ret_horizon_pct)} tone={candidate.ret_horizon_pct >= 0 ? "good" : "danger"} />
          <Stat label={labels.score} value={candidate.score ? candidate.score.toFixed(0) : "-"} tone="accent" />
        </div>
      </div>
    </button>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "danger" | "accent";
}) {
  return (
    <div className="rounded-[22px] border border-[var(--border)] bg-[var(--card2)] px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">{label}</div>
      <div
        className={clsx(
          "mt-2 text-base font-semibold tabular-nums",
          tone === "good" && "text-[var(--good)]",
          tone === "danger" && "text-[var(--danger)]",
          tone === "accent" && "text-[var(--accent)]"
        )}
      >
        {value}
      </div>
    </div>
  );
}

function PctBadge({ value }: { value: number }) {
  if (value == null || Number.isNaN(value)) return null;
  const positive = value >= 0;
  return (
    <span
      className={clsx(
        "rounded-full px-2.5 py-1 text-xs font-semibold",
        positive ? "bg-[var(--good-dim)] text-[var(--good)]" : "bg-[var(--danger-dim)] text-[var(--danger)]"
      )}
    >
      {positive ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  );
}

function DetailContent({
  data,
  market,
  labels,
}: {
  data: TickerDetail;
  market: string;
  labels: Record<string, string>;
}) {
  const currency = market === "KR" ? "KRW" : "USD";
  const plan = data.trade_plan_like as Record<string, unknown> | undefined;
  const levels = data.levels as Record<string, unknown> | undefined;
  const stats = data.stats as Record<string, unknown> | undefined;
  const news = data.news as Array<{ title: string; published: string; link: string }> | undefined;

  return (
    <div className="space-y-8 text-base">
      {plan && (
        <DetailSection title={labels.detailPlan}>
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailRow label={labels.entryTrigger} value={fmtPrice(plan.entry_trigger as number, currency)} />
            <DetailRow label={labels.stop} value={fmtPrice(plan.stop as number, currency)} />
            <DetailRow label={labels.target} value={fmtPrice(plan.target as number, currency)} />
            <DetailRow label="R:R" value={plan.rr ? `${fmt(plan.rr as number, 1)}:1` : "-"} />
          </div>
        </DetailSection>
      )}

      {levels && (
        <DetailSection title={labels.detailLevels}>
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(levels).slice(0, 8).map(([key, value]) => (
              <DetailRow
                key={key}
                label={key}
                value={typeof value === "number" ? fmtPrice(value, currency) : String(value ?? "-")}
              />
            ))}
          </div>
        </DetailSection>
      )}

      {stats && (
        <DetailSection title={labels.detailStats}>
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(stats).slice(0, 10).map(([key, value]) => (
              <DetailRow
                key={key}
                label={key}
                value={typeof value === "number" ? fmt(value) : String(value ?? "-")}
              />
            ))}
          </div>
        </DetailSection>
      )}

      {news && news.length > 0 && (
        <DetailSection title={labels.detailNews}>
          <div className="space-y-3">
            {news.slice(0, 5).map((item, index) => (
              <div key={`${item.title}-${index}`} className="rounded-[20px] border border-[var(--border)] bg-[var(--card2)] px-4 py-4">
                <p className="text-sm font-medium leading-7">{item.title}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">{item.published}</p>
              </div>
            ))}
          </div>
        </DetailSection>
      )}
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{title}</h4>
      {children}
    </section>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card2)] px-4 py-3">
      <div className="text-xs text-[var(--muted)]">{label}</div>
      <div className="mt-1 font-semibold tabular-nums">{value}</div>
    </div>
  );
}
