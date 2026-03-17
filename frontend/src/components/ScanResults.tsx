"use client";

import { useMemo, useState } from "react";
import { clsx } from "clsx";
import { toast } from "sonner";
import { fetchPromptMulti, fetchTicker, type Candidate, type TickerDetail } from "@/lib/api";
import {
  buildCandidateInterpretation,
  buildCandidateReasonBullets,
  formatRelativeTime,
  getDecisionActionSummary,
  getEntryStatusActionHint,
  translateDetailKey,
  translateEntryStatus,
  translateMacroKey,
  translateReasonText,
  translateRecommendedAction,
  translateRegime,
} from "@/lib/decision";
import { fmt, fmtCompact, fmtPct, fmtPrice, fmtTurnover } from "@/lib/format";
import { useApp } from "@/lib/store";
import Badge from "./ui/Badge";
import Button from "./ui/Button";
import Card from "./ui/Card";
import Modal, { ModalBody, ModalHeader } from "./ui/Modal";

export default function ScanResults() {
  const { lang, market, horizon, scanResult, selected, toggleSelected, selectAll, clearSelection } =
    useApp();

  const [detailModal, setDetailModal] = useState<{
    candidate: Candidate;
    data: TickerDetail | null;
    loading: boolean;
  } | null>(null);
  const [promptPreview, setPromptPreview] = useState<string | null>(null);
  const [promptLoading, setPromptLoading] = useState(false);
  const [promptModalOpen, setPromptModalOpen] = useState(false);

  const copy =
    lang === "ko"
      ? {
          empty: "먼저 스캔을 실행해 주세요",
          emptyDesc: "설정 화면에서 기준을 정하고 돌리면, 오늘 볼 후보가 여기로 모입니다.",
          summaryTitle: "오늘의 결론",
          marketDecision: "시장 판단",
          entryAllowed: "신규 진입 가능",
          entryBlocked: "보수 운영",
          approved: "지금 볼 후보",
          watchlist: "관찰 또는 제외",
          total: "총 후보",
          selected: "선택",
          selectAll: "전체 선택",
          clearSelection: "선택 해제",
          prompt: "해석용 프롬프트 만들기",
          promptHint: "체크한 종목만 묶어서 해석용 프롬프트를 만듭니다.",
          promptCopy: "해석용 프롬프트 복사",
          rawCopy: "검증용 원본 데이터 복사",
          close: "닫기",
          disclaimer:
            "공개 데이터 기준 참고 화면입니다. 실제 주문 전에는 체결 가능 가격과 유동성을 다시 확인하세요.",
          detailError: "상세 데이터를 불러오지 못했습니다.",
          promptError: "프롬프트 생성에 실패했습니다.",
          promptCopied: "프롬프트를 복사했습니다.",
          rawCopied: "원본 데이터를 복사했습니다.",
          approvedLabel: "승인",
          avoidLabel: "제외",
          watchLabel: "관찰",
          turnover: "거래대금",
          marketCap: "시총",
          rank: "순위",
          price: "현재가",
          relVol: "상대 거래량",
          score: "점수",
          whyShown: "왜 뜨는지",
          actionNow: "지금 할 일",
          detailSummary: "한눈에 보기",
          detailPlan: "매매 계획",
          detailLevels: "가격 레벨",
          detailStats: "통계",
          detailNews: "최근 뉴스",
          detailRaw: "검증용 원본 데이터",
          detailRawExpand: "원본 데이터 펼치기",
          detailRawCollapse: "원본 데이터 접기",
          entryTrigger: "진입 트리거",
          stop: "손절",
          target: "목표",
        }
      : {
          empty: "Run a scan first",
          emptyDesc: "Candidates will show up here after you run the setup.",
          summaryTitle: "Today's conclusion",
          marketDecision: "Market decision",
          entryAllowed: "New entries allowed",
          entryBlocked: "Defensive mode",
          approved: "Priority candidates",
          watchlist: "Watch or avoid",
          total: "Total",
          selected: "Selected",
          selectAll: "Select all",
          clearSelection: "Clear selection",
          prompt: "Build interpretation prompt",
          promptHint: "Only checked symbols are bundled into an interpretation prompt.",
          promptCopy: "Copy interpretation prompt",
          rawCopy: "Copy raw verification data",
          close: "Close",
          disclaimer: "Reference view based on public data. Re-check quotes and liquidity before any live order.",
          detailError: "Failed to load detail.",
          promptError: "Failed to generate prompt.",
          promptCopied: "Prompt copied.",
          rawCopied: "Raw data copied.",
          approvedLabel: "Approved",
          avoidLabel: "Avoid",
          watchLabel: "Watch",
          turnover: "Turnover",
          marketCap: "Mcap",
          rank: "Rank",
          price: "Price",
          relVol: "Rel vol",
          score: "Score",
          whyShown: "Why it surfaced",
          actionNow: "Action now",
          detailSummary: "At a glance",
          detailPlan: "Trade plan",
          detailLevels: "Levels",
          detailStats: "Statistics",
          detailNews: "Recent news",
          detailRaw: "Raw verification data",
          detailRawExpand: "Expand raw data",
          detailRawCollapse: "Collapse raw data",
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

  const openDetail = async (c: Candidate) => {
    setDetailModal({ candidate: c, data: null, loading: true });
    try {
      const data = await fetchTicker(c.symbol, market, horizon);
      setDetailModal({ candidate: c, data, loading: false });
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
      // Open modal on narrow screens (xl breakpoint)
      if (window.matchMedia("(max-width: 1279px)").matches) {
        setPromptModalOpen(true);
      }
    } catch {
      toast.error(copy.promptError);
    } finally {
      setPromptLoading(false);
    }
  };

  const copyPrompt = async () => {
    if (!promptPreview) return;
    try {
      await navigator.clipboard.writeText(promptPreview);
      toast.success(copy.promptCopied);
    } catch {
      toast.error(lang === "ko" ? "복사에 실패했습니다." : "Failed to copy.");
    }
  };

  const copyRawDetail = async () => {
    if (!detailModal?.data) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(detailModal.data, null, 2));
      toast.success(copy.rawCopied);
    } catch {
      toast.error(lang === "ko" ? "복사에 실패했습니다." : "Failed to copy.");
    }
  };

  if (!scanResult) {
    return (
      <div className="flex min-h-[48vh] animate-fade-in flex-col items-center justify-center gap-5">
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
  const marketReasons = decision.reason
    ?.map((reason) => translateReasonText(reason, lang))
    .filter(Boolean)
    .slice(0, 4);
  const actionSummary = getDecisionActionSummary(decision.recommended_action, lang);

  // Translate macro_snapshot keys, hide unknowns
  const macroEntries = decision.macro_snapshot
    ? Object.entries(decision.macro_snapshot)
        .map(([key, value]) => {
          const label = translateMacroKey(key, lang);
          if (!label) return null;
          return { key, label, value };
        })
        .filter(Boolean)
        .slice(0, 5) as { key: string; label: string; value: number }[]
    : [];

  return (
    <div className="grid max-w-[1280px] animate-fade-in items-start gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-7">
        <Card
          className={clsx(
            "space-y-5 p-7",
            decision.new_entries_allowed ? "border-[var(--good)]/20" : "border-[var(--danger)]/20"
          )}
        >
          <div className="flex flex-wrap items-center gap-3">
            <div
              className={clsx(
                "h-2.5 w-2.5 rounded-full",
                decision.new_entries_allowed ? "bg-[var(--good)]" : "bg-[var(--danger)]"
              )}
            />
            <div className="text-base font-semibold">{copy.summaryTitle}</div>
            <Badge variant={decision.new_entries_allowed ? "good" : "danger"}>
              {decision.new_entries_allowed ? copy.entryAllowed : copy.entryBlocked}
            </Badge>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="space-y-3">
              <div className="text-lg font-semibold">
                {copy.marketDecision}: {translateRegime(decision.regime, lang)}
              </div>
              <p className="text-sm leading-7 text-[var(--fg)]/88">{actionSummary}</p>
              {marketReasons?.length ? (
                <div className="flex flex-wrap gap-2">
                  {marketReasons.map((reason) => (
                    <span
                      key={reason}
                      className="rounded-full border border-[var(--border)] bg-[var(--card2)] px-3 py-1 text-xs text-[var(--muted)]"
                    >
                      {reason}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="rounded-[22px] border border-[var(--border)] bg-[var(--card2)] p-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
                {translateRecommendedAction(decision.recommended_action, lang)}
              </div>
              <div className="mt-2 text-sm leading-7 text-[var(--muted)]">
                {lang === "ko"
                  ? "오늘은 이 문장 하나만 보고도 신규 진입, 관찰, 현금 대기 중 무엇이 기본값인지 알 수 있어야 합니다."
                  : "This line should tell you whether the base case is entry, watch, or cash."}
              </div>
            </div>
          </div>

          {macroEntries.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {macroEntries.map(({ key, label, value }) => (
                <Badge key={key} variant="muted">
                  {label}: {typeof value === "number" ? value.toFixed(2) : String(value)}
                </Badge>
              ))}
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-3 rounded-[28px] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-sm)] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
            <Badge variant="muted">
              {copy.total} {scanResult.candidates.length}
            </Badge>
            <Badge variant="muted">
              {copy.selected} {selected.size}
            </Badge>
            <Badge variant="muted">{market}</Badge>
            <Badge variant="muted">{horizon}D</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => (allSelected ? clearSelection() : selectAll())}
            >
              {allSelected ? copy.clearSelection : copy.selectAll}
            </Button>
            <Button
              size="sm"
              variant="primary"
              loading={promptLoading}
              disabled={!selected.size}
              onClick={generatePrompt}
            >
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
                onOpen={() => openDetail(candidate)}
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
                onOpen={() => openDetail(candidate)}
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

      {/* Desktop sidebar for prompt preview */}
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
                <Button
                  className="mt-4 w-full justify-center"
                  size="sm"
                  variant="primary"
                  onClick={copyPrompt}
                >
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

      {/* Mobile prompt preview modal */}
      <Modal open={promptModalOpen && !!promptPreview} onClose={() => setPromptModalOpen(false)}>
        <ModalHeader onClose={() => setPromptModalOpen(false)}>
          <h2 className="text-lg font-semibold">{copy.prompt}</h2>
        </ModalHeader>
        <ModalBody>
          {promptPreview && (
            <div className="space-y-4">
              <textarea
                readOnly
                value={promptPreview}
                className="h-[400px] w-full resize-none rounded-[20px] border border-[var(--border)] bg-[var(--card2)] p-4 font-mono text-sm leading-7 text-[var(--text)] outline-none"
              />
              <Button className="w-full justify-center" size="sm" variant="primary" onClick={copyPrompt}>
                {copy.promptCopy}
              </Button>
            </div>
          )}
        </ModalBody>
      </Modal>

      {/* Detail modal */}
      <Modal open={!!detailModal} onClose={() => setDetailModal(null)}>
        {detailModal && (
          <>
            <ModalHeader onClose={() => setDetailModal(null)}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{detailModal.candidate.symbol}</h2>
                  {detailModal.data && (
                    <p className="text-sm text-[var(--muted)]">{detailModal.data.name}</p>
                  )}
                </div>
                {detailModal.data && (
                  <Button size="sm" variant="ghost" onClick={copyRawDetail}>
                    {copy.rawCopy}
                  </Button>
                )}
              </div>
            </ModalHeader>
            <ModalBody>
              {detailModal.loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="skeleton h-7 rounded-[14px]" />
                  ))}
                </div>
              ) : detailModal.data ? (
                <DetailContent
                  data={detailModal.data}
                  candidate={detailModal.candidate}
                  market={market}
                  lang={lang}
                  labels={copy}
                />
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
  const tone =
    candidate.entry_status === "APPROVED_NEW"
      ? "good"
      : candidate.entry_status === "AVOID"
        ? "danger"
        : "accent";
  const reasonBullets = buildCandidateReasonBullets(candidate, lang).slice(0, 3);
  const actionHint = getEntryStatusActionHint(candidate.entry_status, lang);
  const interpretation = buildCandidateInterpretation(candidate, lang);

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
        <div className="min-w-0 flex-1 space-y-4">
          <div>
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
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                #{rank}
              </span>
              <span className="text-xl font-semibold tracking-tight">{candidate.symbol}</span>
              <Badge variant={tone}>{translateEntryStatus(candidate.entry_status, lang)}</Badge>
              <PctBadge value={candidate.day_chg_pct} />
            </div>
            <p className="mt-2 truncate text-sm text-[var(--muted)]">{candidate.name}</p>
          </div>

          {/* Action hint */}
          <div className={clsx(
            "rounded-[18px] px-4 py-2.5 text-sm leading-7",
            isApproved
              ? "bg-[var(--good-dim)] text-[var(--good)]"
              : candidate.entry_status === "AVOID"
                ? "bg-[var(--danger-dim)] text-[var(--danger)]"
                : "bg-[var(--card2)] text-[var(--fg)]/80"
          )}>
            <span className="font-semibold">{labels.actionNow}: </span>
            {actionHint}
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="muted">
              {labels.turnover} {fmtTurnover(candidate.day_turnover, currency)}
            </Badge>
            {candidate.market_cap > 0 && (
              <Badge variant="muted">
                {labels.marketCap} {fmtCompact(candidate.market_cap, lang)}
              </Badge>
            )}
            {candidate.extras?.market_turnover_rank && (
              <Badge variant="muted">
                {labels.rank} #{candidate.extras.market_turnover_rank}
              </Badge>
            )}
            {candidate.extras?.bucket_tags?.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="accent">
                {tag}
              </Badge>
            ))}
          </div>

          {/* entry_reason as tags (판정 태그) */}
          {candidate.entry_reason?.length ? (
            <div className="flex flex-wrap gap-2">
              {candidate.entry_reason.slice(0, 3).map((reason) => (
                <span
                  key={reason}
                  className="rounded-full border border-[var(--border)] bg-[var(--card2)] px-3 py-1 text-xs text-[var(--muted)]"
                >
                  {translateReasonText(reason, lang)}
                </span>
              ))}
            </div>
          ) : null}

          {/* whyShown bullets (평문 설명) — only if not redundant with entry_reason */}
          {reasonBullets.length > 0 && (
            <div className="rounded-[22px] border border-[var(--border)] bg-[var(--card2)] p-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
                {labels.whyShown}
              </div>
              <ul className="mt-3 space-y-2 text-sm leading-7 text-[var(--fg)]/88">
                {reasonBullets.map((reason) => (
                  <li key={reason} className="flex gap-2">
                    <span className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Short interpretation */}
          <p className="text-sm leading-7 text-[var(--muted)]">{interpretation}</p>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-4 sm:grid-cols-4 xl:min-w-[340px]">
          <Stat label={labels.price} value={fmtPrice(candidate.last, currency)} />
          <Stat
            label={labels.relVol}
            value={candidate.rel_vol_20d ? `${candidate.rel_vol_20d.toFixed(1)}x` : "-"}
          />
          <Stat
            label={`${horizon}D`}
            value={fmtPct(candidate.ret_horizon_pct)}
            tone={candidate.ret_horizon_pct >= 0 ? "good" : "danger"}
          />
          <Stat
            label={labels.score}
            value={candidate.score ? candidate.score.toFixed(0) : "-"}
            tone="accent"
          />
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
  candidate,
  market,
  lang,
  labels,
}: {
  data: TickerDetail;
  candidate?: Candidate;
  market: string;
  lang: "ko" | "en";
  labels: Record<string, string>;
}) {
  const [rawOpen, setRawOpen] = useState(false);
  const currency = market === "KR" ? "KRW" : "USD";
  const plan = data.trade_plan_like as Record<string, unknown> | undefined;
  const levels = data.levels as Record<string, unknown> | undefined;
  const stats = data.stats as Record<string, unknown> | undefined;
  const news = data.news as Array<{ title: string; published: string; link: string }> | undefined;

  const statusLabel = candidate ? translateEntryStatus(candidate.entry_status, lang) : null;
  const actionHint = candidate ? getEntryStatusActionHint(candidate.entry_status, lang) : null;
  const reasonBullets = candidate ? buildCandidateReasonBullets(candidate, lang).slice(0, 3) : [];
  const statusTone = candidate?.entry_status === "APPROVED_NEW" ? "good" : candidate?.entry_status === "AVOID" ? "danger" : "accent";

  return (
    <div className="space-y-8 text-base">
      {/* Summary card at top */}
      {candidate && (
        <div className={clsx(
          "rounded-[22px] border p-5 space-y-3",
          statusTone === "good" ? "border-[var(--good)]/20 bg-[var(--good-dim)]" :
          statusTone === "danger" ? "border-[var(--danger)]/20 bg-[var(--danger-dim)]" :
          "border-[var(--border)] bg-[var(--card2)]"
        )}>
          <div className="flex items-center gap-3">
            <Badge variant={statusTone}>{statusLabel}</Badge>
            <span className="text-sm font-semibold">{labels.detailSummary}</span>
          </div>
          {actionHint && <p className="text-sm leading-7">{actionHint}</p>}
          {reasonBullets.length > 0 && (
            <ul className="space-y-1 text-sm leading-7 text-[var(--muted)]">
              {reasonBullets.map((reason) => (
                <li key={reason} className="flex gap-2">
                  <span className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {plan && (
        <DetailSection title={labels.detailPlan}>
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailRow
              label={labels.entryTrigger}
              value={fmtPrice(plan.entry_trigger as number, currency)}
            />
            <DetailRow label={labels.stop} value={fmtPrice(plan.stop as number, currency)} />
            <DetailRow label={labels.target} value={fmtPrice(plan.target as number, currency)} />
            <DetailRow label="R:R" value={plan.rr ? `${fmt(plan.rr as number, 1)}:1` : "-"} />
          </div>
        </DetailSection>
      )}

      {levels && (
        <DetailSection title={labels.detailLevels}>
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(levels)
              .slice(0, 8)
              .map(([key, value]) => (
                <DetailRow
                  key={key}
                  label={translateDetailKey(key, lang)}
                  value={typeof value === "number" ? fmtPrice(value, currency) : String(value ?? "-")}
                />
              ))}
          </div>
        </DetailSection>
      )}

      {stats && (
        <DetailSection title={labels.detailStats}>
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(stats)
              .slice(0, 10)
              .map(([key, value]) => (
                <DetailRow
                  key={key}
                  label={translateDetailKey(key, lang)}
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
              <div
                key={`${item.title}-${index}`}
                className="rounded-[20px] border border-[var(--border)] bg-[var(--card2)] px-4 py-4"
              >
                <p className="text-sm font-medium leading-7">{item.title}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {formatRelativeTime(item.published, lang)}
                </p>
              </div>
            ))}
          </div>
        </DetailSection>
      )}

      {/* Collapsible raw JSON */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setRawOpen((prev) => !prev)}
          className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)] hover:text-[var(--text)] transition-colors"
        >
          {rawOpen ? labels.detailRawCollapse : labels.detailRawExpand}
        </button>
        {rawOpen && (
          <pre className="animate-fade-in overflow-x-auto rounded-[20px] border border-[var(--border)] bg-[var(--card2)] p-4 text-xs leading-6 text-[var(--muted)]">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
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
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        {title}
      </h4>
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
