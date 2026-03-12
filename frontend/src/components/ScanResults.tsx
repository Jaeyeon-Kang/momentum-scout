"use client";
import { useState, useCallback } from "react";
import { useApp } from "@/lib/store";
import { fetchTicker, fetchPromptMulti, type Candidate, type TickerDetail } from "@/lib/api";
import { fmtPct, fmtPrice, fmtTurnover, fmtCompact, fmt } from "@/lib/format";
import Card from "./ui/Card";
import Button from "./ui/Button";
import Badge from "./ui/Badge";
import Modal, { ModalHeader, ModalBody } from "./ui/Modal";
import { clsx } from "clsx";
import { toast } from "sonner";

export default function ScanResults() {
  const { scanResult, market, horizon, selected, toggleSelected, selectAll, clearSelection, lang } = useApp();
  const [detailModal, setDetailModal] = useState<{ symbol: string; data: TickerDetail | null; loading: boolean } | null>(null);
  const [promptPreview, setPromptPreview] = useState<string | null>(null);
  const [promptLoading, setPromptLoading] = useState(false);

  const t = lang === "ko"
    ? { empty: "스캔을 먼저 실행하세요", emptyDesc: "스캔 설정 탭에서 조건을 설정한 후 스캔을 실행하세요", marketJudge: "시장 판단", entryOk: "신규 진입 가능", entryNo: "진입 제한", items: "개 종목", sel: "개 선택", selAll: "전체 선택", desel: "선택 해제", prompt: "AI 프롬프트 미리보기", promptCopy: "클립보드 복사", close: "닫기", approved: "신규 진입 승인 후보", others: "관심종목 / 비추천", disclaimer: "공개 데이터 기반 참고 도구입니다.", promptHint: "종목을 선택한 후 AI 프롬프트를 생성하세요", entryLabel: "진입 가능", avoidLabel: "비추천", watchLabel: "관찰", turnover: "거래", mcap: "시총", rank: "순위" }
    : { empty: "Run a scan first", emptyDesc: "Set up conditions in Scan Settings tab and run", marketJudge: "Market Decision", entryOk: "Entry Allowed", entryNo: "Entry Restricted", items: " stocks", sel: " selected", selAll: "Select All", desel: "Deselect", prompt: "AI Prompt Preview", promptCopy: "Copy to clipboard", close: "Close", approved: "Approved for Entry", others: "Watchlist / Not Recommended", disclaimer: "Reference tool based on public data.", promptHint: "Select stocks to generate AI prompt", entryLabel: "Entry OK", avoidLabel: "Avoid", watchLabel: "Watch", turnover: "Vol", mcap: "MCap", rank: "Rank" };

  const openDetail = useCallback(async (symbol: string) => {
    setDetailModal({ symbol, data: null, loading: true });
    try {
      const data = await fetchTicker(symbol, market, horizon);
      setDetailModal({ symbol, data, loading: false });
    } catch {
      toast.error(lang === "ko" ? "종목 상세 로드 실패" : "Failed to load detail");
      setDetailModal(null);
    }
  }, [market, horizon, lang]);

  const generatePrompt = useCallback(async () => {
    if (selected.size === 0) return toast.error(lang === "ko" ? "종목을 먼저 선택하세요" : "Select stocks first");
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
      toast.error(lang === "ko" ? "프롬프트 생성 실패" : "Prompt generation failed");
    } finally {
      setPromptLoading(false);
    }
  }, [selected, market, horizon, lang]);

  const copyPrompt = useCallback(async () => {
    if (!promptPreview) return;
    await navigator.clipboard.writeText(promptPreview);
    toast.success(lang === "ko" ? "클립보드에 복사됨" : "Copied to clipboard");
  }, [promptPreview, lang]);

  if (!scanResult) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-5 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-[var(--card2)] flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-base font-semibold text-[var(--text)]">{t.empty}</p>
          <p className="text-sm text-[var(--muted)] mt-1">{t.emptyDesc}</p>
        </div>
      </div>
    );
  }

  const { market_decision: md, candidates } = scanResult;
  const approved = candidates.filter((c) => c.entry_status === "APPROVED_NEW");
  const others = candidates.filter((c) => c.entry_status !== "APPROVED_NEW");

  return (
    <div className="grid max-w-[1320px] mx-auto items-start gap-8 xl:grid-cols-[minmax(0,1fr)_380px] animate-fade-in">
      {/* Left: Main content */}
      <div className="min-w-0 space-y-8">
        {/* Market Decision Banner */}
        <div className={clsx(
          "rounded-[24px] p-6 sm:p-7 border",
          md.new_entries_allowed
            ? "bg-[var(--good-dim)] border-[var(--good)]/20"
            : "bg-[var(--danger-dim)] border-[var(--danger)]/20"
        )}>
          <div className="flex items-center gap-3 mb-3">
            <div className={clsx(
              "w-3 h-3 rounded-full animate-pulse",
              md.new_entries_allowed ? "bg-[var(--good)]" : "bg-[var(--danger)]"
            )} />
            <span className="text-base font-bold">
              {t.marketJudge}: {md.regime}
            </span>
            <Badge variant={md.new_entries_allowed ? "good" : "danger"}>
              {md.new_entries_allowed ? t.entryOk : t.entryNo}
            </Badge>
          </div>
          <p className="text-sm leading-7 text-[var(--muted)]">{md.reason?.join(" · ")}</p>
          {md.macro_snapshot && (
            <div className="flex flex-wrap gap-2 mt-3">
              {Object.entries(md.macro_snapshot).map(([k, v]) => (
                <Badge key={k} variant="muted">{k}: {typeof v === "number" ? v.toFixed(2) : String(v)}</Badge>
              ))}
            </div>
          )}
        </div>

        {/* Action bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="text-base text-[var(--muted)]">
            {candidates.length}{t.items} · {selected.size}{t.sel}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => selected.size > 0 ? clearSelection() : selectAll()}>
              {selected.size > 0 ? t.desel : t.selAll}
            </Button>
            <Button size="sm" variant="primary" loading={promptLoading} onClick={generatePrompt}>
              {t.prompt}
            </Button>
          </div>
        </div>

        {/* Approved section */}
        {approved.length > 0 && (
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-2 h-2 rounded-full bg-[var(--good)]" />
              <h2 className="text-lg font-bold">{t.approved}</h2>
              <span className="text-sm text-[var(--muted)]">{approved.length}{t.items}</span>
            </div>
            <div className="space-y-4">
              {approved.map((c, i) => (
                <CandidateCard key={c.symbol} candidate={c} rank={i + 1} checked={selected.has(c.symbol)}
                  onCheck={() => toggleSelected(c.symbol)} onClick={() => openDetail(c.symbol)} market={market} horizon={horizon} t={t} />
              ))}
            </div>
          </div>
        )}

        {/* Others section */}
        {others.length > 0 && (
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-2 h-2 rounded-full bg-[var(--muted)]" />
              <h2 className="text-lg font-bold">{t.others}</h2>
              <span className="text-sm text-[var(--muted)]">{others.length}{t.items}</span>
            </div>
            <div className="space-y-4">
              {others.map((c, i) => (
                <CandidateCard key={c.symbol} candidate={c} rank={approved.length + i + 1} checked={selected.has(c.symbol)}
                  onCheck={() => toggleSelected(c.symbol)} onClick={() => openDetail(c.symbol)} market={market} horizon={horizon} t={t} />
              ))}
            </div>
          </div>
        )}

        <p className="text-sm leading-7 text-[var(--muted)] text-center pb-10">{t.disclaimer}</p>
      </div>

      {/* Right: Prompt Preview Panel */}
      <div className="hidden xl:block w-[380px] shrink-0">
        <div className="sticky top-28">
          <Card className="space-y-4 p-7">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">{t.prompt}</h3>
              {promptPreview && (
                <Button size="sm" variant="ghost" onClick={() => setPromptPreview(null)}>{t.close}</Button>
              )}
            </div>

            {promptPreview ? (
              <>
                <div className="relative">
                  <textarea
                    readOnly
                    value={promptPreview}
                    className="w-full h-[460px] p-4 rounded-2xl border border-[var(--border)] bg-[var(--card2)] text-sm font-mono text-[var(--text)] resize-none outline-none leading-7"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="primary" className="flex-1" onClick={copyPrompt}>
                    {t.promptCopy}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center py-8 gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[var(--accent-dim)] flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  </svg>
                </div>
                <p className="text-sm text-[var(--muted)] text-center leading-7">{t.promptHint}</p>
                <Button size="sm" variant="primary" loading={promptLoading} onClick={generatePrompt} disabled={selected.size === 0}>
                  {t.prompt}
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal open={!!detailModal} onClose={() => setDetailModal(null)}>
        {detailModal && (
          <>
            <ModalHeader onClose={() => setDetailModal(null)}>
              <h2 className="text-lg font-bold">{detailModal.symbol}</h2>
              {detailModal.data && <p className="text-sm text-[var(--muted)]">{detailModal.data.name}</p>}
            </ModalHeader>
            <ModalBody>
              {detailModal.loading ? (
                <div className="space-y-3">
                  {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-6 rounded-lg" />)}
                </div>
              ) : detailModal.data ? (
                <DetailContent data={detailModal.data} market={market} lang={lang} />
              ) : null}
            </ModalBody>
          </>
        )}
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------------
function CandidateCard({
  candidate: c, rank, checked, onCheck, onClick, market, horizon, t,
}: {
  candidate: Candidate; rank: number; checked: boolean; onCheck: () => void; onClick: () => void; market: string;
  horizon: number;
  t: Record<string, string>;
}) {
  const isApproved = c.entry_status === "APPROVED_NEW";
  const currency = c.currency || (market === "KR" ? "KRW" : "USD");

  return (
    <div
      onClick={onClick}
      className={clsx(
        "group flex items-start gap-5 p-5 sm:p-6 rounded-[24px] border transition-all duration-200 cursor-pointer",
        "hover:-translate-y-0.5 hover:shadow-[var(--shadow)]",
        isApproved
          ? "border-[var(--good)]/20 bg-[var(--good-dim)]/30 hover:border-[var(--good)]/40"
          : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent)]/30",
        "animate-fade-in"
      )}
    >
      <div className="pt-1" onClick={(e) => e.stopPropagation()}>
        <input type="checkbox" checked={checked} onChange={onCheck}
          className="w-4 h-4 rounded accent-[var(--accent)] cursor-pointer" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-sm font-bold text-[var(--muted)]">#{rank}</span>
          <span className="font-bold tracking-tight text-xl">{c.symbol}</span>
          <Badge variant={isApproved ? "good" : c.entry_status === "AVOID" ? "danger" : "default"}>
            {isApproved ? t.entryLabel : c.entry_status === "AVOID" ? t.avoidLabel : t.watchLabel}
          </Badge>
          <PctBadge value={c.day_chg_pct} />
        </div>
        <p className="text-sm text-[var(--muted)] mt-1.5 truncate">{c.name}</p>

        <div className="flex flex-wrap gap-2 mt-3">
          <Badge variant="muted">{t.turnover} {fmtTurnover(c.day_turnover, currency)}</Badge>
          {c.market_cap > 0 && <Badge variant="muted">{t.mcap} {fmtCompact(c.market_cap)}</Badge>}
          {c.extras?.market_turnover_rank && <Badge variant="muted">{t.rank} #{c.extras.market_turnover_rank}</Badge>}
          {c.extras?.bucket_tags?.map((tag) => <Badge key={tag} variant="accent">{tag}</Badge>)}
        </div>

        {c.entry_reason?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {c.entry_reason.slice(0, 4).map((r) => (
              <span key={r} className="text-xs text-[var(--accent)] bg-[var(--accent-dim)] px-2.5 py-1 rounded-full">{r}</span>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-6 shrink-0 text-right">
        <Stat label={market === "KR" ? "현재가" : "Price"} value={fmtPrice(c.last, currency)} />
        <Stat label={market === "KR" ? "상대거래" : "Rel Vol"} value={c.rel_vol_20d ? `${c.rel_vol_20d.toFixed(1)}x` : "-"} />
        <Stat label={`${horizon}D`} value={fmtPct(c.ret_horizon_pct)} color={c.ret_horizon_pct >= 0} />
        <Stat label={market === "KR" ? "점수" : "Score"} value={c.score?.toFixed(0) || "-"} highlight />
      </div>
    </div>
  );
}

function Stat({ label, value, color, highlight }: { label: string; value: string; color?: boolean; highlight?: boolean }) {
  return (
    <div className="flex flex-col items-end gap-1 min-w-[64px]">
      <span className="text-xs text-[var(--muted)]">{label}</span>
      <span className={clsx(
        "text-base font-bold tabular-nums",
        color === true && "text-[var(--good)]",
        color === false && "text-[var(--danger)]",
        highlight && "text-[var(--accent)]"
      )}>{value}</span>
    </div>
  );
}

function PctBadge({ value }: { value: number }) {
  if (value == null || isNaN(value)) return null;
  const positive = value >= 0;
  return (
    <span className={clsx(
      "text-xs font-bold px-2 py-1 rounded-lg",
      positive ? "text-[var(--good)] bg-[var(--good-dim)]" : "text-[var(--danger)] bg-[var(--danger-dim)]"
    )}>
      {positive ? "+" : ""}{value.toFixed(2)}%
    </span>
  );
}

// ---------------------------------------------------------------------------
function DetailContent({ data, market, lang }: { data: TickerDetail; market: string; lang: string }) {
  const currency = market === "KR" ? "KRW" : "USD";
  const plan = data.trade_plan_like as Record<string, unknown> | undefined;
  const levels = data.levels as Record<string, unknown> | undefined;
  const stats = data.stats as Record<string, unknown> | undefined;
  const news = data.news as Array<{ title: string; published: string; link: string }> | undefined;

  const sec = (ko: string, en: string) => lang === "ko" ? ko : en;

  return (
    <div className="space-y-7 text-base">
      {plan && (
        <Section title={sec("트레이딩 플랜", "Trading Plan")}>
          <div className="grid grid-cols-2 gap-2">
            <KV label={sec("진입 트리거", "Entry Trigger")} value={fmtPrice(plan.entry_trigger as number, currency)} />
            <KV label={sec("스탑", "Stop")} value={fmtPrice(plan.stop as number, currency)} />
            <KV label={sec("목표가", "Target")} value={fmtPrice(plan.target as number, currency)} />
            <KV label="R:R" value={plan.rr ? fmt(plan.rr as number, 1) + ":1" : "-"} />
          </div>
        </Section>
      )}

      {levels && (
        <Section title={sec("기술적 레벨", "Technical Levels")}>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(levels).slice(0, 8).map(([k, v]) => (
              <KV key={k} label={k} value={typeof v === "number" ? fmtPrice(v, currency) : String(v ?? "-")} />
            ))}
          </div>
        </Section>
      )}

      {stats && (
        <Section title={sec("통계", "Statistics")}>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(stats).slice(0, 10).map(([k, v]) => (
              <KV key={k} label={k} value={typeof v === "number" ? fmt(v) : String(v ?? "-")} />
            ))}
          </div>
        </Section>
      )}

      {news && news.length > 0 && (
        <Section title={sec("최근 뉴스", "Recent News")}>
          <div className="space-y-2.5">
            {news.slice(0, 5).map((n, i) => (
              <div key={i} className="border-b border-[var(--border)] last:border-0 pb-2.5 last:pb-0">
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-[11px] text-[var(--muted)] mt-0.5">{n.published}</p>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-sm font-bold text-[var(--muted)] uppercase tracking-wider mb-3">{title}</h4>
      {children}
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline gap-2 py-1.5 border-b border-[var(--border)]/50 last:border-0">
      <span className="text-[var(--muted)] text-sm">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}
