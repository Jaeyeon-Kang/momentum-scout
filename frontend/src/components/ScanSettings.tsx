"use client";
import { useMemo, useState } from "react";
import { clsx } from "clsx";
import { toast } from "sonner";
import { fetchCandidates, type ScanParams } from "@/lib/api";
import { useApp, KR_DEFAULT_PRESET, SCAN_PROFILES, US_LIQUIDITY_PRESETS } from "@/lib/store";
import Badge from "./ui/Badge";
import Button from "./ui/Button";
import Card, { CardDescription, CardTitle } from "./ui/Card";
import Input from "./ui/Input";
import Select from "./ui/Select";

type ProfileKey = keyof typeof SCAN_PROFILES;
type LiquidityKey = keyof typeof US_LIQUIDITY_PRESETS;

export default function ScanSettings() {
  const {
    lang,
    market,
    setMarket,
    horizon,
    setHorizon,
    setScanResult,
    scanning,
    setScanning,
    setScoutPanel,
    viewMode,
  } = useApp();

  const [profile, setProfile] = useState<ProfileKey>("surge");
  const [liquidity, setLiquidity] = useState<LiquidityKey>("balanced");
  const [maxPrice, setMaxPrice] = useState(80);
  const [symbols, setSymbols] = useState("");
  const [heldSymbols, setHeldSymbols] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [krSettings, setKrSettings] = useState(KR_DEFAULT_PRESET);

  const copy = lang === "ko"
    ? {
        title: "스캔 설정",
        subtitle: "복잡하게 꾸미기보다, 지금 어떤 흐름을 찾는지 먼저 정합니다.",
        heroNote: "컬러는 얌전히, 데이터는 선명하게. 괜히 번쩍거리면 시세가 삐집니다.",
        quickTitle: "현재 스캔 관점",
        quickBody: "시장, 보유 기간, 유동성 강도를 먼저 잡고 세부값은 필요한 만큼만 만지면 됩니다.",
        profileTitle: "탐색 프로파일",
        profileDesc: "찾고 싶은 리듬을 먼저 고르면 나머지 필터가 덜 소란스러워집니다.",
        contextTitle: "시장과 보유 기간",
        contextDesc: "어디를 볼지와 얼마나 짧게 잡을지부터 고정합니다.",
        filterTitle: "핵심 필터",
        filterDesc: "지금 결과를 가장 많이 흔드는 값만 전면에 남겼습니다.",
        symbolTitle: "직접 확인할 심볼",
        symbolDesc: "보고 싶은 종목이 이미 있으면 스크리너보다 우선합니다.",
        market: "시장",
        horizon: "보유 기간",
        usLiquidity: "유동성 강도",
        maxPrice: "최대 가격",
        krMinTurnover: "최소 평균 거래대금",
        symbolInput: "직접 분석할 종목",
        symbolHintKr: "예: 삼성전자, 005930.KS, 한화오션",
        symbolHintUs: "예: NVDA, TSLA, HIMS",
        heldInput: "보유 종목",
        heldHintKr: "예: 005930.KS, 000660.KS",
        heldHintUs: "예: AAPL, AMD",
        advanced: "고급 KR 필터",
        advancedOpen: "고급 필터 열기",
        advancedClose: "고급 필터 닫기",
        reset: "기본값 복원",
        run: "후보 스캔 시작",
        running: "스캔 중...",
        footer: "공개 데이터 기반 참고 화면입니다. 실주문 전에는 시세와 체결 조건을 다시 확인하세요.",
        success: (count: number) => `${count}개 후보를 정리했습니다.`,
        error: (msg: string) => `스캔 실패: ${msg}`,
        marketCapMin: "최소 시가총액",
        todayTurnoverMin: "당일 거래대금 하한",
        relVolMin: "상대 거래량 하한",
        closePosMin: "종가 위치 하한",
        ret5dMin: "5일 수익률 최소 (%)",
        ret5dMax: "5일 수익률 최대 (%)",
        freshNewsHours: "뉴스 신선도 (시간)",
        marketTurnoverRankMax: "거래대금 순위 상한",
        largecapMin: "대형주 기준 시가총액",
        largecapQuota: "대형주 자동 포함 수",
        excludeFundlike: "ETF/ETN 제외",
        on: "권장",
        off: "해제",
        guideTag: "조용한 기본값",
      }
    : {
        title: "Scan setup",
        subtitle: "Pick the tempo first, then tune only the filters that truly matter.",
        heroNote: "Quiet chrome, clearer data. If the interface screams, the signal sulks.",
        quickTitle: "Current scan stance",
        quickBody: "Set the market, holding window, and liquidity bias first. Touch the rest only if you have a reason.",
        profileTitle: "Scan profile",
        profileDesc: "Choose the rhythm you want before you start twisting filters into modern art.",
        contextTitle: "Market and holding window",
        contextDesc: "Lock the arena and the time horizon before chasing symbols.",
        filterTitle: "Core filters",
        filterDesc: "Only the settings that materially move the result stay up front.",
        symbolTitle: "Direct symbols",
        symbolDesc: "If you already know what to inspect, these override the screener.",
        market: "Market",
        horizon: "Holding window",
        usLiquidity: "Liquidity bias",
        maxPrice: "Max price",
        krMinTurnover: "Min avg turnover",
        symbolInput: "Symbols to inspect",
        symbolHintKr: "ex. 005930.KS, 000660.KS",
        symbolHintUs: "ex. NVDA, TSLA, HIMS",
        heldInput: "Held symbols",
        heldHintKr: "ex. 005930.KS, 068270.KS",
        heldHintUs: "ex. AAPL, AMD",
        advanced: "Advanced KR filters",
        advancedOpen: "Open advanced filters",
        advancedClose: "Hide advanced filters",
        reset: "Restore defaults",
        run: "Run scan",
        running: "Scanning...",
        footer: "Reference view based on public data. Re-check quotes and liquidity before any live order.",
        success: (count: number) => `Sorted ${count} candidates.`,
        error: (msg: string) => `Scan failed: ${msg}`,
        marketCapMin: "Min market cap",
        todayTurnoverMin: "Min today turnover",
        relVolMin: "Min relative volume",
        closePosMin: "Min close position",
        ret5dMin: "Min 5D return (%)",
        ret5dMax: "Max 5D return (%)",
        freshNewsHours: "News freshness (hours)",
        marketTurnoverRankMax: "Turnover rank cap",
        largecapMin: "Large-cap threshold",
        largecapQuota: "Auto include large-cap",
        excludeFundlike: "Exclude ETF/ETN",
        on: "On",
        off: "Off",
        guideTag: "Calm defaults",
      };

  const profileMeta = SCAN_PROFILES[profile];
  const liquidityMeta = US_LIQUIDITY_PRESETS[liquidity];

  const summaryBadges = useMemo(() => {
    const marketLabel = market === "KR" ? "KR" : "US";
    const priceLabel = `${market === "KR" ? "₩" : "$"}${maxPrice.toLocaleString()}`;
    return [
      marketLabel,
      `${horizon}${lang === "ko" ? "일" : "D"}`,
      market === "US" ? liquidityMeta.label : `${(krSettings.minTurnover / 100000000).toFixed(0)}억+`,
      priceLabel,
    ];
  }, [horizon, krSettings.minTurnover, lang, liquidityMeta.label, market, maxPrice]);

  const handleMarketChange = (nextMarket: "US" | "KR") => {
    setMarket(nextMarket);
    setMaxPrice(nextMarket === "KR" ? 100000 : 80);
  };

  const runScan = async () => {
    setScanning(true);
    try {
      const params: ScanParams = {
        market,
        horizon_days: horizon,
        top_n: 10,
        max_price: maxPrice,
        min_avg_turnover: market === "KR" ? krSettings.minTurnover : liquidityMeta.minTurnover,
      };

      if (market === "US") {
        params.scr_ids = profileMeta.screeners;
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
      toast.success(copy.success(result.candidates.length));
    } catch (error) {
      toast.error(copy.error(error instanceof Error ? error.message : "unknown error"));
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="w-full max-w-[1180px] mx-auto animate-fade-in">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_320px]">
        <Card className="glass-panel overflow-hidden p-8 sm:p-10">
          <div className="space-y-5">
            <div className="inline-flex rounded-full border border-[var(--border)] bg-[var(--card2)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              {copy.guideTag}
            </div>
            <div className="space-y-3">
              <h2 className="max-w-[720px] text-3xl font-bold tracking-tight sm:text-[2.3rem]">{copy.title}</h2>
              <p className="max-w-[760px] text-base leading-8 text-[var(--muted)]">{copy.subtitle}</p>
            </div>
            <p className="max-w-[680px] text-sm leading-7 text-[var(--muted)]">{copy.heroNote}</p>
          </div>
        </Card>

        <Card className="glass-panel p-7">
          <div className="space-y-4">
            <div>
              <CardTitle className="text-lg">{copy.quickTitle}</CardTitle>
              <CardDescription>{copy.quickBody}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {summaryBadges.map((item) => (
                <Badge key={item} variant="muted">
                  {item}
                </Badge>
              ))}
            </div>
            {viewMode === "guide" && (
              <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card2)] px-4 py-4 text-sm leading-7 text-[var(--muted)]">
                {market === "KR"
                  ? "KR은 대형주와 거래대금 상위 후보를 우선 보고, ETF/ETN은 기본적으로 걷어냅니다."
                  : `${profileMeta.title} 관점으로 ${liquidityMeta.label} 유동성 기준을 적용합니다.`}
              </div>
            )}
          </div>
        </Card>
      </section>

      <div className="mt-8 flex flex-col gap-7">
        {market === "US" && (
          <StepCard step="01" title={copy.profileTitle} desc={copy.profileDesc}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {(Object.entries(SCAN_PROFILES) as [ProfileKey, (typeof SCAN_PROFILES)[ProfileKey]][]).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => setProfile(key)}
                  className={clsx(
                    "rounded-[24px] border p-5 text-left transition-all duration-200",
                    profile === key
                      ? "border-[var(--text)] bg-[var(--card2)] shadow-[var(--shadow-sm)]"
                      : "border-[var(--border)] bg-[var(--card)] hover:bg-[var(--card2)]"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{value.icon}</div>
                    {profile === key && <Badge variant="accent">Active</Badge>}
                  </div>
                  <div className="mt-4 text-base font-semibold">{value.title}</div>
                  <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{value.desc}</p>
                </button>
              ))}
            </div>
          </StepCard>
        )}

        <StepCard step="02" title={copy.contextTitle} desc={copy.contextDesc}>
          <div className="grid gap-5 md:grid-cols-2">
            <Select label={copy.market} value={market} onChange={(e) => handleMarketChange(e.target.value as "US" | "KR")}>
              <option value="US">US</option>
              <option value="KR">KR</option>
            </Select>
            <Select label={copy.horizon} value={String(horizon)} onChange={(e) => setHorizon(Number(e.target.value) as 5 | 20)}>
              <option value="5">{lang === "ko" ? "5일 스윙" : "5-day swing"}</option>
              <option value="20">{lang === "ko" ? "20일 추세" : "20-day trend"}</option>
            </Select>
          </div>
        </StepCard>

        <StepCard step="03" title={copy.filterTitle} desc={copy.filterDesc}>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {market === "US" && (
              <Select label={copy.usLiquidity} value={liquidity} onChange={(e) => setLiquidity(e.target.value as LiquidityKey)} help={liquidityMeta.desc}>
                {(Object.entries(US_LIQUIDITY_PRESETS) as [LiquidityKey, (typeof US_LIQUIDITY_PRESETS)[LiquidityKey]][]).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.label}
                  </option>
                ))}
              </Select>
            )}

            <Input
              label={`${copy.maxPrice} (${market === "KR" ? "₩" : "$"})`}
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              suffix={market === "KR" ? "₩" : "$"}
            />

            {market === "KR" && (
              <Input
                label={copy.krMinTurnover}
                type="number"
                value={krSettings.minTurnover}
                onChange={(e) => setKrSettings((prev) => ({ ...prev, minTurnover: Number(e.target.value) }))}
              />
            )}
          </div>

          {market === "KR" && (
            <div className="mt-5 rounded-[24px] border border-[var(--border)] bg-[var(--card2)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{copy.advanced}</div>
                  <p className="mt-1 text-sm leading-7 text-[var(--muted)]">
                    뉴스 신선도, 거래대금 순위, 대형주 자동 포함 수까지 직접 조정할 수 있습니다.
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setAdvancedOpen((prev) => !prev)}>
                  {advancedOpen ? copy.advancedClose : copy.advancedOpen}
                </Button>
              </div>

              {advancedOpen && (
                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3 animate-fade-in">
                  <Input label={copy.marketCapMin} type="number" value={krSettings.marketCapMin} onChange={(e) => setKrSettings((prev) => ({ ...prev, marketCapMin: Number(e.target.value) }))} />
                  <Input label={copy.todayTurnoverMin} type="number" value={krSettings.todayTurnoverMin} onChange={(e) => setKrSettings((prev) => ({ ...prev, todayTurnoverMin: Number(e.target.value) }))} />
                  <Input label={copy.relVolMin} type="number" step="0.1" value={krSettings.relVolMin} onChange={(e) => setKrSettings((prev) => ({ ...prev, relVolMin: Number(e.target.value) }))} />
                  <Input label={copy.closePosMin} type="number" step="0.05" value={krSettings.closePosMin} onChange={(e) => setKrSettings((prev) => ({ ...prev, closePosMin: Number(e.target.value) }))} />
                  <Input label={copy.ret5dMin} type="number" step="0.5" value={krSettings.ret5dMin} onChange={(e) => setKrSettings((prev) => ({ ...prev, ret5dMin: Number(e.target.value) }))} />
                  <Input label={copy.ret5dMax} type="number" step="0.5" value={krSettings.ret5dMax} onChange={(e) => setKrSettings((prev) => ({ ...prev, ret5dMax: Number(e.target.value) }))} />
                  <Input label={copy.freshNewsHours} type="number" value={krSettings.freshNewsHours} onChange={(e) => setKrSettings((prev) => ({ ...prev, freshNewsHours: Number(e.target.value) }))} />
                  <Input label={copy.marketTurnoverRankMax} type="number" value={krSettings.marketTurnoverRankMax} onChange={(e) => setKrSettings((prev) => ({ ...prev, marketTurnoverRankMax: Number(e.target.value) }))} />
                  <Input label={copy.largecapMin} type="number" value={krSettings.largecapMin} onChange={(e) => setKrSettings((prev) => ({ ...prev, largecapMin: Number(e.target.value) }))} />
                  <Input label={copy.largecapQuota} type="number" value={krSettings.largecapQuota} onChange={(e) => setKrSettings((prev) => ({ ...prev, largecapQuota: Number(e.target.value) }))} />
                  <Select label={copy.excludeFundlike} value={String(krSettings.krExcludeFundlike)} onChange={(e) => setKrSettings((prev) => ({ ...prev, krExcludeFundlike: e.target.value === "true" }))}>
                    <option value="true">{copy.on}</option>
                    <option value="false">{copy.off}</option>
                  </Select>
                  <div className="flex items-end">
                    <Button variant="secondary" onClick={() => setKrSettings(KR_DEFAULT_PRESET)}>
                      {copy.reset}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </StepCard>

        <StepCard step="04" title={copy.symbolTitle} desc={copy.symbolDesc}>
          <div className="grid gap-5 md:grid-cols-2">
            <Input
              label={copy.symbolInput}
              placeholder={market === "KR" ? copy.symbolHintKr : copy.symbolHintUs}
              value={symbols}
              onChange={(e) => setSymbols(e.target.value)}
            />
            <Input
              label={copy.heldInput}
              placeholder={market === "KR" ? copy.heldHintKr : copy.heldHintUs}
              value={heldSymbols}
              onChange={(e) => setHeldSymbols(e.target.value)}
            />
          </div>
        </StepCard>
      </div>

      <div className="sticky bottom-5 z-10 mt-8 flex justify-center">
        <div className="glass-panel w-full max-w-[760px] rounded-full border border-[var(--border)] p-2 shadow-[var(--shadow)]">
          <Button variant="primary" size="lg" loading={scanning} onClick={runScan} className="w-full justify-center">
            {scanning ? copy.running : copy.run}
          </Button>
        </div>
      </div>

      <p className="pb-10 pt-5 text-center text-sm leading-7 text-[var(--muted)]">{copy.footer}</p>
    </div>
  );
}

function StepCard({
  step,
  title,
  desc,
  children,
}: {
  step: string;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="glass-panel p-7 sm:p-8">
      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card2)] text-[11px] font-semibold tracking-[0.18em] text-[var(--muted)]">
          {step}
        </div>
        <div>
          <CardTitle className="text-[1.15rem]">{title}</CardTitle>
          <CardDescription>{desc}</CardDescription>
        </div>
      </div>
      {children}
    </Card>
  );
}
