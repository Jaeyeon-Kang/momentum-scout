"use client";
import { useState, useCallback } from "react";
import { useApp, SCAN_PROFILES, US_LIQUIDITY_PRESETS, KR_DEFAULT_PRESET } from "@/lib/store";
import { fetchCandidates, type ScanParams } from "@/lib/api";
import Card, { CardTitle, CardDescription } from "./ui/Card";
import Button from "./ui/Button";
import Select from "./ui/Select";
import Input from "./ui/Input";
import Badge from "./ui/Badge";
import { clsx } from "clsx";
import { toast } from "sonner";

export default function ScanSettings() {
  const {
    market, setMarket, horizon, setHorizon,
    setScanResult, scanning, setScanning, setScoutPanel, viewMode,
  } = useApp();

  const [profile, setProfile] = useState<keyof typeof SCAN_PROFILES>("surge");
  const [liquidity, setLiquidity] = useState<keyof typeof US_LIQUIDITY_PRESETS>("balanced");
  const [maxPrice, setMaxPrice] = useState(2000);
  const [minTurnover, setMinTurnover] = useState(20000000);
  const [symbols, setSymbols] = useState("");
  const [heldSymbols, setHeldSymbols] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // KR advanced
  const [krSettings, setKrSettings] = useState(KR_DEFAULT_PRESET);

  // Screener
  const [scrPreset, setScrPreset] = useState("momentum");

  const getScrIds = () => {
    if (scrPreset === "momentum") return "day_gainers,most_actives";
    if (scrPreset === "gainers") return "day_gainers,day_gainers";
    if (scrPreset === "liquidity") return "most_actives,most_actives";
    return "day_gainers,most_actives";
  };

  const runScan = useCallback(async () => {
    setScanning(true);
    try {
      const params: ScanParams = {
        market,
        horizon_days: horizon,
        top_n: 10,
        max_price: maxPrice,
        min_avg_turnover: market === "KR" ? krSettings.minTurnover : US_LIQUIDITY_PRESETS[liquidity].minTurnover,
      };

      if (market === "US") {
        params.scr_ids = getScrIds();
      } else {
        params.market_cap_min = krSettings.marketCapMin;
        params.today_turnover_min = krSettings.todayTurnoverMin;
        params.rel_volume_min = krSettings.relVolMin;
        params.ret_5d_min = krSettings.ret5dMin;
        params.ret_5d_max = krSettings.ret5dMax;
        params.close_position_min = krSettings.closePosMin;
        params.fresh_news_hours = krSettings.freshNewsHours;
        params.market_turnover_rank_max = krSettings.marketTurnoverRankMax;
        params.largecap_min = krSettings.largecapMin;
        params.largecap_quota = krSettings.largecapQuota;
        params.kr_exclude_fundlike = krSettings.krExcludeFundlike;
      }

      if (symbols.trim()) {
        params.symbols = symbols.trim();
        params.direct_mode = true;
      }
      if (heldSymbols.trim()) {
        params.held_symbols = heldSymbols.trim();
      }

      const result = await fetchCandidates(params);
      setScanResult(result);
      setScoutPanel("results");
      toast.success(`${result.candidates.length}개 종목 발견`);
    } catch (err) {
      toast.error(`스캔 실패: ${err instanceof Error ? err.message : "알 수 없는 오류"}`);
    } finally {
      setScanning(false);
    }
  }, [market, horizon, maxPrice, liquidity, symbols, heldSymbols, krSettings, profile, scrPreset]);

  const profileInfo = SCAN_PROFILES[profile];

  return (
    <div className="max-w-[1080px] mx-auto space-y-8 sm:space-y-10 animate-fade-in">
      {/* Hero */}
      <div className="pt-3 space-y-2">
        <h1 className="text-3xl sm:text-[2.15rem] font-bold tracking-tight">스캔 설정</h1>
        <p className="text-base leading-8 text-[var(--muted)]">
          기본 설정으로 시작한 뒤 필요한 항목만 조정하세요.
        </p>
      </div>

      {/* Quick start banner */}
      {viewMode === "guide" && (
        <div className="bg-[var(--accent-dim)] border border-[var(--accent)]/15 rounded-[24px] p-6 sm:p-7 animate-fade-in stagger-1">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/15 flex items-center justify-center shrink-0 mt-0.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" /></svg>
            </div>
            <div>
              <p className="text-base font-semibold text-[var(--accent)]">빠른 시작</p>
              <p className="text-sm leading-7 text-[var(--muted)] mt-1.5">
                {market === "KR"
                  ? "KR은 대형주 포함 공격형이 기본. ETF/ETN 제외, 거래대금 상위권 우선."
                  : "US는 스캔 프로필과 유동성 기준만 고르면 됩니다."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Profile */}
      {market === "US" && (
        <StepCard step={1} title="스캔 프로필" desc="어떤 종목을 찾고 싶으세요?">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {(Object.entries(SCAN_PROFILES) as [keyof typeof SCAN_PROFILES, typeof SCAN_PROFILES[keyof typeof SCAN_PROFILES]][]).map(([key, val]) => (
              <button
                key={key}
                onClick={() => setProfile(key)}
                className={clsx(
                  "text-left p-3.5 rounded-xl border transition-all duration-200 cursor-pointer",
                  profile === key
                    ? "border-[var(--accent)] bg-[var(--accent-dim)] shadow-sm"
                    : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent)]/30"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">{val.icon}</span>
                  <span className={clsx(
                    "text-sm font-semibold",
                    profile === key ? "text-[var(--accent)]" : "text-[var(--text)]"
                  )}>
                    {val.title}
                  </span>
                </div>
                <p className="text-sm text-[var(--muted)] leading-7">{val.desc}</p>
              </button>
            ))}
          </div>
        </StepCard>
      )}

      {market === "KR" && (
        <StepCard step={1} title="스캔 모드" desc="KR 시장">
          <div className="bg-[var(--card2)] rounded-xl p-3 border border-[var(--border)]">
            <p className="text-sm font-medium">대형주 포함 공격형</p>
            <p className="text-xs text-[var(--muted)] mt-1">ETF/ETN 제외, 거래대금 상위 + 대형주 우선</p>
          </div>
        </StepCard>
      )}

      {/* Step 2: Market & Horizon */}
      <StepCard step={2} title="시장과 보유 기간" desc="어디서 얼마나 볼지">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Select
            label="거래 시장"
            value={market}
            onChange={(e) => setMarket(e.target.value as "US" | "KR")}
          >
            <option value="US">US</option>
            <option value="KR">KR (KOSPI / KOSDAQ)</option>
          </Select>
          <Select
            label="보유 기간"
            value={String(horizon)}
            onChange={(e) => setHorizon(Number(e.target.value) as 5 | 20)}
          >
            <option value="5">5일 - 빠른 모멘텀</option>
            <option value="20">20일 - 지속성 확인</option>
          </Select>
        </div>
      </StepCard>

      {/* Step 3: Filters */}
      <StepCard step={3} title="기본 필터" desc="핵심 필터만 설정">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {market === "US" && (
            <Select
              label="유동성 기준"
              value={liquidity}
              onChange={(e) => {
                const v = e.target.value as keyof typeof US_LIQUIDITY_PRESETS;
                setLiquidity(v);
                setMinTurnover(US_LIQUIDITY_PRESETS[v].minTurnover);
              }}
            >
              <option value="tight">보수적 - 실패 줄이기</option>
              <option value="balanced">균형 - 기본 추천</option>
              <option value="aggressive">공격적 - 소형주 더 보기</option>
            </Select>
          )}
          <Input
            label={`최대 가격 (${market === "KR" ? "₩" : "$"})`}
            type="number"
            value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
            suffix={market === "KR" ? "₩" : "$"}
          />
          {market === "KR" && (
            <Input
              label="최소 평균 거래대금"
              type="number"
              value={krSettings.minTurnover}
              onChange={(e) => setKrSettings(s => ({ ...s, minTurnover: Number(e.target.value) }))}
            />
          )}
        </div>

        {/* Summary pills */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Badge>최대 {market === "KR" ? "₩" : "$"}{maxPrice.toLocaleString()}</Badge>
          <Badge>거래대금 {(market === "KR" ? krSettings.minTurnover / 1e8 : US_LIQUIDITY_PRESETS[liquidity].minTurnover / 1e6).toFixed(0)}{market === "KR" ? "억+" : "M+"}</Badge>
          <Badge>보유 {horizon}일</Badge>
          {market === "KR" && <Badge variant="accent">대형주 포함</Badge>}
        </div>

        {/* Advanced toggle */}
        {market === "KR" && (
          <>
            <button
              onClick={() => setAdvancedOpen(!advancedOpen)}
              className="flex items-center gap-1.5 mt-4 text-sm font-medium text-[var(--muted)] hover:text-[var(--accent)] transition-colors cursor-pointer"
            >
              <svg
                width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                className={clsx("transition-transform", advancedOpen && "rotate-90")}
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
              고급 설정 {advancedOpen ? "닫기" : "열기"}
            </button>

            {advancedOpen && (
              <div className="mt-4 pt-4 border-t border-[var(--border)] animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Input label="KR 시총 하한" type="number" value={krSettings.marketCapMin}
                    onChange={(e) => setKrSettings(s => ({ ...s, marketCapMin: Number(e.target.value) }))} />
                  <Input label="당일 거래대금 하한" type="number" value={krSettings.todayTurnoverMin}
                    onChange={(e) => setKrSettings(s => ({ ...s, todayTurnoverMin: Number(e.target.value) }))} />
                  <Input label="상대 거래량 하한" type="number" step="0.1" value={krSettings.relVolMin}
                    onChange={(e) => setKrSettings(s => ({ ...s, relVolMin: Number(e.target.value) }))} />
                  <Input label="종가 위치 하한" type="number" step="0.01" value={krSettings.closePosMin}
                    onChange={(e) => setKrSettings(s => ({ ...s, closePosMin: Number(e.target.value) }))} />
                  <Input label="5일 수익률 최소 (%)" type="number" step="0.5" value={krSettings.ret5dMin}
                    onChange={(e) => setKrSettings(s => ({ ...s, ret5dMin: Number(e.target.value) }))} />
                  <Input label="5일 수익률 최대 (%)" type="number" step="0.5" value={krSettings.ret5dMax}
                    onChange={(e) => setKrSettings(s => ({ ...s, ret5dMax: Number(e.target.value) }))} />
                  <Input label="뉴스 신선도 (시간)" type="number" value={krSettings.freshNewsHours}
                    onChange={(e) => setKrSettings(s => ({ ...s, freshNewsHours: Number(e.target.value) }))} />
                  <Input label="거래대금 순위 상한" type="number" value={krSettings.marketTurnoverRankMax}
                    onChange={(e) => setKrSettings(s => ({ ...s, marketTurnoverRankMax: Number(e.target.value) }))} />
                  <Input label="대형주 기준 시총" type="number" value={krSettings.largecapMin}
                    onChange={(e) => setKrSettings(s => ({ ...s, largecapMin: Number(e.target.value) }))} />
                  <Input label="대형주 자동 포함 수" type="number" value={krSettings.largecapQuota}
                    onChange={(e) => setKrSettings(s => ({ ...s, largecapQuota: Number(e.target.value) }))} />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <Select
                    label="ETF/ETN 제외"
                    value={String(krSettings.krExcludeFundlike)}
                    onChange={(e) => setKrSettings(s => ({ ...s, krExcludeFundlike: e.target.value === "true" }))}
                  >
                    <option value="true">ON - 기본 권장</option>
                    <option value="false">OFF</option>
                  </Select>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setKrSettings(KR_DEFAULT_PRESET)}
                  >
                    기본값 복원
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </StepCard>

      {/* Step 4: Manual symbols */}
      <StepCard step={4} title="직접 확인할 종목" desc="종목명이나 코드를 입력">
        <div className="space-y-4">
          <Input
            label="직접 볼 종목"
            placeholder={market === "KR" ? "예: 삼성전자, 한화오션" : "예: TSLA, NVDA"}
            value={symbols}
            onChange={(e) => setSymbols(e.target.value)}
          />
          <Input
            label="보유 종목 (선택)"
            placeholder={market === "KR" ? "예: 삼성전자, 005930.KS" : "예: AAPL, MSFT"}
            value={heldSymbols}
            onChange={(e) => setHeldSymbols(e.target.value)}
          />
        </div>
      </StepCard>

      {/* Run button */}
      <div className="sticky bottom-6 z-10 w-full pt-3">
        <Button
          variant="primary"
          size="lg"
          loading={scanning}
          onClick={runScan}
          className="mx-auto flex w-full max-w-[760px] shadow-lg hover:shadow-xl"
        >
          {scanning ? "스캔 중..." : "후보 스캔 시작"}
        </Button>
      </div>

      <p className="text-sm leading-7 text-[var(--muted)] text-center pb-10">
        공개 데이터 기반 참고 도구입니다. 실제 주문 전에 반드시 직접 확인하세요.
      </p>
    </div>
  );
}

function StepCard({
  step,
  title,
  desc,
  children,
}: {
  step: number;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={`animate-fade-in stagger-${step} p-8 sm:p-9`}>
      <div className="flex items-start gap-4 mb-6">
        <div className="w-8 h-8 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-sm font-bold shrink-0">
          {step}
        </div>
        <div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{desc}</CardDescription>
        </div>
      </div>
      {children}
    </Card>
  );
}
