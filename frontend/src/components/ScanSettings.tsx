"use client";

import { useMemo, useState } from "react";
import { clsx } from "clsx";
import { toast } from "sonner";
import { fetchCandidates, type ScanParams } from "@/lib/api";
import { KR_DEFAULT_PRESET, SCAN_PROFILES, US_LIQUIDITY_PRESETS, useApp } from "@/lib/store";
import Badge from "./ui/Badge";
import Button from "./ui/Button";
import Card, { CardDescription, CardTitle } from "./ui/Card";
import Input from "./ui/Input";
import Select from "./ui/Select";

type ProfileKey = keyof typeof SCAN_PROFILES;
type LiquidityKey = keyof typeof US_LIQUIDITY_PRESETS;

type KrPreset = typeof KR_DEFAULT_PRESET;

const KR_CONSERVATIVE_PRESET: KrPreset = {
  marketCapMin: 2_000_000_000_000,
  minTurnover: 50_000_000_000,
  todayTurnoverMin: 100_000_000_000,
  relVolMin: 1.5,
  ret5dMin: 3,
  ret5dMax: 15,
  closePosMin: 0.65,
  freshNewsHours: 48,
  marketTurnoverRankMax: 40,
  largecapMin: 3_000_000_000_000,
  largecapQuota: 3,
  krExcludeFundlike: true,
};

const KR_AGGRESSIVE_PRESET: KrPreset = {
  marketCapMin: 500_000_000_000,
  minTurnover: 15_000_000_000,
  todayTurnoverMin: 30_000_000_000,
  relVolMin: 1.0,
  ret5dMin: 5,
  ret5dMax: 35,
  closePosMin: 0.5,
  freshNewsHours: 96,
  marketTurnoverRankMax: 100,
  largecapMin: 1_500_000_000_000,
  largecapQuota: 1,
  krExcludeFundlike: true,
};

type KrPresetKey = "default" | "conservative" | "aggressive";

const KR_PRESETS: Record<KrPresetKey, { settings: KrPreset; label: { ko: string; en: string }; desc: { ko: string; en: string } }> = {
  default: {
    settings: KR_DEFAULT_PRESET,
    label: { ko: "기본", en: "Default" },
    desc: { ko: "가장 무난한 기본값. 대부분의 경우 여기서 시작하면 됩니다.", en: "The safest starting point for most sessions." },
  },
  conservative: {
    settings: KR_CONSERVATIVE_PRESET,
    label: { ko: "보수", en: "Conservative" },
    desc: { ko: "대형주 위주, 거래대금 높은 종목만. 변동성을 줄이고 싶을 때.", en: "Large-caps only, higher liquidity floor. Less noise." },
  },
  aggressive: {
    settings: KR_AGGRESSIVE_PRESET,
    label: { ko: "공격", en: "Aggressive" },
    desc: { ko: "더 넓은 범위, 더 빠른 종목까지. 변동성 감수할 준비가 됐을 때.", en: "Wider net, faster names. Ready for more volatility." },
  },
};

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
  const [krPreset, setKrPreset] = useState<KrPresetKey>("default");

  const copy =
    lang === "ko"
      ? {
          title: "스캔 설정",
          subtitle: "강한 종목을 뽑는 앱이 아니라, 오늘 신규 진입을 열어도 되는지부터 판단하는 도구입니다.",
          heroNote: "평소에는 기본값으로 시작해도 충분합니다. 바꾸는 값마다 왜 필요한지 같이 보여줍니다.",
          quickTitle: "지금 스캔 기준",
          quickBody:
            "시장, 보유 기간, 유동성 기준만 먼저 정해도 방향이 잡힙니다. 나머지는 필요할 때만 건드리면 됩니다.",
          profileTitle: "무슨 장면을 찾는지 먼저 정합니다.",
          profileDesc: "시가 돌파를 볼지, 장중 추세를 볼지처럼 탐색 리듬부터 맞춥니다.",
          contextTitle: "어느 시장을 볼지, 얼마나 짧게 볼지 정합니다.",
          contextDesc: "시장과 보유 기간이 먼저 고정돼야 결과를 같은 기준으로 비교할 수 있습니다.",
          filterTitle: "실패하기 쉬운 종목을 먼저 빼는 기본 필터입니다.",
          filterDesc: "결과를 크게 바꾸는 값만 앞에 두고, 나머지는 뒤로 숨겼습니다.",
          symbolTitle: "이미 가진 종목은 새 후보와 분리해서 봅니다.",
          symbolDesc: "직접 확인할 종목과 기존 보유 종목을 나눠 적으면, 새 진입 후보와 섞이지 않습니다.",
          market: "시장",
          marketHelp: "시장에 따라 후보 풀과 통화가 달라집니다.",
          horizon: "보유 기간",
          horizonHelp: "보유 기간에 따라 모멘텀 기준과 결과 해석이 달라집니다.",
          usLiquidity: "유동성 기준",
          maxPrice: "최대 주가",
          maxPriceHelp: "너무 비싸서 관리가 어려운 종목이나 과열 구간을 초반에 걸러냅니다.",
          krMinTurnover: "최소 평균 거래대금",
          krMinTurnoverHelp: "실제로 돈이 붙는 종목만 남기기 위한 기본 유동성 기준입니다.",
          symbolInput: "직접 확인할 종목",
          symbolHintKr: "예: 005930.KS, 000660.KS",
          symbolHintUs: "예: NVDA, TSLA, HIMS",
          symbolHelp: "이미 볼 종목이 정해져 있으면 스크리너보다 우선해서 확인합니다.",
          heldInput: "보유 종목",
          heldHintKr: "예: 005930.KS, 068270.KS",
          heldHintUs: "예: AAPL, AMD",
          heldHelp: "보유 종목은 새 진입 후보와 분리해서 읽기 위한 입력입니다.",
          advanced: "고급 KR 필터",
          advancedOpen: "고급 필터 열기",
          advancedClose: "고급 필터 닫기",
          advancedDesc: "뉴스 신선도, 당일 거래대금, 대형주 자동 포함 같은 세부 기준을 직접 조절할 수 있습니다.",
          advancedPresetTitle: "프리셋",
          reset: "기본값 복원",
          run: "후보 스캔 시작",
          running: "스캔 중...",
          footer: "공개 데이터 기준 참고 화면입니다. 실제 주문 전에는 시세와 체결 가능성을 다시 확인하세요.",
          success: (count: number) => `${count}개 후보를 정리했습니다.`,
          error: (msg: string) => `스캔 실패: ${msg}`,
          marketCapMin: "최소 시가총액",
          marketCapMinHelp: "초저유동성 소형주를 초반에 거르기 위한 기준입니다.",
          todayTurnoverMin: "당일 거래대금 하한",
          todayTurnoverMinHelp: "오늘 실제로 돈이 붙는 종목만 남기기 위한 기준입니다.",
          relVolMin: "상대 거래량 하한",
          relVolMinHelp: "평소보다 거래가 붙는지 확인하는 기준입니다.",
          closePosMin: "종가 위치 하한",
          closePosMinHelp: "종가가 눌려 끝난 종목을 덜 보기 위한 기준입니다.",
          ret5dMin: "5일 수익률 최소 (%)",
          ret5dMax: "5일 수익률 최대 (%)",
          ret5dHelp: "너무 약하거나 너무 과열된 종목을 같이 걸러냅니다.",
          freshNewsHours: "뉴스 신선도 (시간)",
          freshNewsHoursHelp: "오래된 재료보다 아직 시장이 반응하는 재료를 우선 보기 위한 기준입니다.",
          marketTurnoverRankMax: "거래대금 순위 상한",
          marketTurnoverRankMaxHelp: "시장 전체에서 너무 뒤쪽 종목을 덜 보기 위한 기준입니다.",
          largecapMin: "대형주 기준 시가총액",
          largecapMinHelp: "유동성 좋은 큰 종목을 자동으로 섞기 위한 기준입니다.",
          largecapQuota: "대형주 자동 포함 수",
          largecapQuotaHelp: "유동성 좋은 큰 종목을 일부 자동으로 섞기 위한 설정입니다.",
          excludeFundlike: "ETF/ETN 제외",
          on: "사용",
          off: "해제",
          guideTag: "기본값 우선",
          active: "선택됨",
          autoGuideKr: "KR은 거래대금과 유동성 기준으로 먼저 거른 뒤, 위험한 찌꺼기를 뒤에서 더 걸러냅니다.",
          autoGuideUs: (profileLabel: string, liquidityLabel: string) =>
            `${profileLabel} 기준으로 찾고, ${liquidityLabel} 유동성 필터를 같이 적용합니다.`,
        }
      : {
          title: "Scan Setup",
          subtitle:
            "This is not a stock picker that must always find something. It decides whether fresh entries even deserve attention today.",
          heroNote: "The defaults are enough to start. When you change a value, the UI tells you why it exists.",
          quickTitle: "Current scan stance",
          quickBody:
            "Market, holding window, and liquidity bias usually do most of the work. Touch the rest only when you need to.",
          profileTitle: "Choose the scene you want to find first.",
          profileDesc: "Set the scan rhythm before you start tweaking filters.",
          contextTitle: "Pick the market and time window.",
          contextDesc: "You need a fixed arena and holding horizon before you compare candidates cleanly.",
          filterTitle: "Use basic filters to remove easy failures first.",
          filterDesc: "Only the settings that materially change the result stay in front.",
          symbolTitle: "Separate held names from new candidates.",
          symbolDesc: "Direct symbols and held positions stay split so the desk can read them differently.",
          market: "Market",
          marketHelp: "The market changes both the candidate pool and currency.",
          horizon: "Holding window",
          horizonHelp: "Holding window changes the momentum lens and how results should be read.",
          usLiquidity: "Liquidity bias",
          maxPrice: "Max price",
          maxPriceHelp: "Keeps out names that are too stretched or too expensive to manage well.",
          krMinTurnover: "Min avg turnover",
          krMinTurnoverHelp: "A baseline liquidity floor so only names with real trading interest remain.",
          symbolInput: "Symbols to inspect",
          symbolHintKr: "ex. 005930.KS, 000660.KS",
          symbolHintUs: "ex. NVDA, TSLA, HIMS",
          symbolHelp: "If you already know the names, they override the screener.",
          heldInput: "Held symbols",
          heldHintKr: "ex. 005930.KS, 068270.KS",
          heldHintUs: "ex. AAPL, AMD",
          heldHelp: "Held names are separated so the desk does not treat them like fresh entries.",
          advanced: "Advanced KR filters",
          advancedOpen: "Open advanced filters",
          advancedClose: "Hide advanced filters",
          advancedDesc:
            "Manually tune news freshness, today turnover, and large-cap inclusion when the defaults need help.",
          advancedPresetTitle: "Presets",
          reset: "Restore defaults",
          run: "Run candidate scan",
          running: "Scanning...",
          footer: "Reference view based on public data. Re-check quotes and liquidity before any live order.",
          success: (count: number) => `Sorted ${count} candidates.`,
          error: (msg: string) => `Scan failed: ${msg}`,
          marketCapMin: "Min market cap",
          marketCapMinHelp: "Filters out micro-caps with very thin liquidity.",
          todayTurnoverMin: "Min today turnover",
          todayTurnoverMinHelp: "Keeps only names where money is actually flowing today.",
          relVolMin: "Min relative volume",
          relVolMinHelp: "Checks if today's volume is above the recent average.",
          closePosMin: "Min close position",
          closePosMinHelp: "Avoids names that closed weak near the low of the range.",
          ret5dMin: "Min 5D return (%)",
          ret5dMax: "Max 5D return (%)",
          ret5dHelp: "Filters out names that are too cold or too overheated.",
          freshNewsHours: "News freshness (hours)",
          freshNewsHoursHelp: "Prioritizes names with catalysts the market is still reacting to.",
          marketTurnoverRankMax: "Turnover rank cap",
          marketTurnoverRankMaxHelp: "Cuts names ranked too far back in market-wide turnover.",
          largecapMin: "Large-cap threshold",
          largecapMinHelp: "Market cap floor for auto-included large-cap names.",
          largecapQuota: "Auto include large-cap",
          largecapQuotaHelp: "Mixes in a few liquid large-cap names automatically.",
          excludeFundlike: "Exclude ETF/ETN",
          on: "On",
          off: "Off",
          guideTag: "Calm defaults",
          active: "Active",
          autoGuideKr:
            "KR starts with liquidity and turnover rules, then uses the advanced filters to strip out fragile names.",
          autoGuideUs: (profileLabel: string, liquidityLabel: string) =>
            `Runs the ${profileLabel} profile with the ${liquidityLabel} liquidity preset.`,
        };

  const profileMeta = SCAN_PROFILES[profile];
  const liquidityMeta = US_LIQUIDITY_PRESETS[liquidity];

  // Dynamic step numbering
  const steps = useMemo(() => {
    const list: string[] = [];
    if (market === "US") list.push("profile");
    list.push("context", "filter", "symbol");
    return list;
  }, [market]);

  const stepNumber = (id: string) => String(steps.indexOf(id) + 1).padStart(2, "0");

  // Human-readable summary badges
  const summaryBadges = useMemo(() => {
    const marketLabel = lang === "ko" ? `시장 ${market}` : `Market ${market}`;
    const horizonLabel = lang === "ko" ? `${horizon}일 스윙` : `${horizon}-day swing`;
    const liquidityLabel =
      market === "US"
        ? liquidityMeta.label[lang]
        : lang === "ko"
          ? `평균 거래대금 ${(krSettings.minTurnover / 1e8).toFixed(0)}억+`
          : `Avg turnover ${(krSettings.minTurnover / 1e8).toFixed(0)}e8+`;
    const priceLabel =
      lang === "ko"
        ? `최대주가 ${market === "KR" ? "￦" : "$"}${maxPrice.toLocaleString()}`
        : `Max ${market === "KR" ? "￦" : "$"}${maxPrice.toLocaleString()}`;
    return [marketLabel, horizonLabel, liquidityLabel, priceLabel];
  }, [horizon, krSettings.minTurnover, lang, liquidityMeta.label, market, maxPrice]);

  // Intent sentence
  const intentSentence = useMemo(() => {
    if (lang === "ko") {
      if (market === "KR") {
        return `거래대금이 붙고 뉴스가 아직 살아 있는 ${horizon}일 단기 모멘텀 후보를 먼저 찾습니다.`;
      }
      return `${profileMeta.title[lang]} 기준, ${liquidityMeta.label[lang]} 유동성으로 ${horizon}일 신규 진입 후보를 압축합니다.`;
    }
    if (market === "KR") {
      return `Looking for ${horizon}-day momentum candidates with active turnover and fresh catalysts.`;
    }
    return `Compressing ${horizon}-day entry candidates using ${profileMeta.title[lang]} profile with ${liquidityMeta.label[lang]} liquidity.`;
  }, [horizon, lang, liquidityMeta.label, market, profileMeta.title]);

  const handleMarketChange = (nextMarket: "US" | "KR") => {
    setMarket(nextMarket);
    setMaxPrice(nextMarket === "KR" ? 100000 : 80);
  };

  const applyKrPreset = (key: KrPresetKey) => {
    setKrPreset(key);
    setKrSettings(KR_PRESETS[key].settings);
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
    <div className="mx-auto w-full max-w-[1280px] animate-fade-in">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_320px]">
        <Card className="glass-panel overflow-hidden p-8 sm:p-10">
          <div className="space-y-5">
            <div className="inline-flex rounded-full border border-[var(--border)] bg-[var(--card2)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              {copy.guideTag}
            </div>
            <div className="space-y-3">
              <h2 className="max-w-[720px] text-3xl font-bold tracking-tight sm:text-[2.3rem]">
                {copy.title}
              </h2>
              <p className="max-w-[760px] text-base leading-8 text-[var(--fg)]/86">{copy.subtitle}</p>
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
            <p className="text-sm leading-7 text-[var(--fg)]/80">{intentSentence}</p>
            {viewMode === "guide" && (
              <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card2)] px-4 py-4 text-sm leading-7 text-[var(--muted)]">
                {market === "KR"
                  ? copy.autoGuideKr
                  : copy.autoGuideUs(profileMeta.title[lang], liquidityMeta.label[lang])}
              </div>
            )}
          </div>
        </Card>
      </section>

      <div className="mt-8 flex flex-col gap-7">
        {market === "US" && (
          <StepCard step={stepNumber("profile")} title={copy.profileTitle} desc={copy.profileDesc}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {(Object.entries(SCAN_PROFILES) as [ProfileKey, (typeof SCAN_PROFILES)[ProfileKey]][]).map(
                ([key, value]) => (
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
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                        {value.icon}
                      </div>
                      {profile === key && <Badge variant="accent">{copy.active}</Badge>}
                    </div>
                    <div className="mt-4 text-base font-semibold">{value.title[lang]}</div>
                    <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{value.desc[lang]}</p>
                  </button>
                )
              )}
            </div>
          </StepCard>
        )}

        <StepCard step={stepNumber("context")} title={copy.contextTitle} desc={copy.contextDesc}>
          <div className="grid gap-5 md:grid-cols-2">
            <Select
              label={copy.market}
              value={market}
              help={copy.marketHelp}
              onChange={(e) => handleMarketChange(e.target.value as "US" | "KR")}
            >
              <option value="US">US</option>
              <option value="KR">KR</option>
            </Select>
            <Select
              label={copy.horizon}
              value={String(horizon)}
              help={copy.horizonHelp}
              onChange={(e) => setHorizon(Number(e.target.value) as 5 | 20)}
            >
              <option value="5">{lang === "ko" ? "5일 스윙" : "5-day swing"}</option>
              <option value="20">{lang === "ko" ? "20일 추세" : "20-day trend"}</option>
            </Select>
          </div>
        </StepCard>

        <StepCard step={stepNumber("filter")} title={copy.filterTitle} desc={copy.filterDesc}>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {market === "US" && (
              <Select
                label={copy.usLiquidity}
                value={liquidity}
                help={liquidityMeta.desc[lang]}
                onChange={(e) => setLiquidity(e.target.value as LiquidityKey)}
              >
                {(Object.entries(US_LIQUIDITY_PRESETS) as [
                  LiquidityKey,
                  (typeof US_LIQUIDITY_PRESETS)[LiquidityKey],
                ][]).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.label[lang]}
                  </option>
                ))}
              </Select>
            )}

            <Input
              label={`${copy.maxPrice} (${market === "KR" ? "￦" : "$"})`}
              type="number"
              value={maxPrice}
              help={copy.maxPriceHelp}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              suffix={market === "KR" ? "￦" : "$"}
            />

            {market === "KR" && (
              <Input
                label={copy.krMinTurnover}
                type="number"
                value={krSettings.minTurnover}
                help={copy.krMinTurnoverHelp}
                onChange={(e) =>
                  setKrSettings((prev) => ({ ...prev, minTurnover: Number(e.target.value) }))
                }
              />
            )}
          </div>

          {market === "KR" && (
            <div className="mt-5 rounded-[24px] border border-[var(--border)] bg-[var(--card2)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{copy.advanced}</div>
                  <p className="mt-1 text-sm leading-7 text-[var(--muted)]">{copy.advancedDesc}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setAdvancedOpen((prev) => !prev)}>
                  {advancedOpen ? copy.advancedClose : copy.advancedOpen}
                </Button>
              </div>

              {advancedOpen && (
                <div className="mt-5 animate-fade-in space-y-5">
                  <div className="space-y-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                      {copy.advancedPresetTitle}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(Object.entries(KR_PRESETS) as [KrPresetKey, (typeof KR_PRESETS)[KrPresetKey]][]).map(
                        ([key, meta]) => (
                          <button
                            key={key}
                            onClick={() => applyKrPreset(key)}
                            className={clsx(
                              "rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200",
                              krPreset === key
                                ? "border-[var(--text)] bg-[var(--card)] text-[var(--text)] shadow-[var(--shadow-sm)]"
                                : "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--card)]"
                            )}
                          >
                            {meta.label[lang]}
                          </button>
                        )
                      )}
                    </div>
                    <p className="text-sm leading-7 text-[var(--muted)]">
                      {KR_PRESETS[krPreset].desc[lang]}
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <Input
                      label={copy.marketCapMin}
                      type="number"
                      value={krSettings.marketCapMin}
                      help={copy.marketCapMinHelp}
                      onChange={(e) =>
                        setKrSettings((prev) => ({ ...prev, marketCapMin: Number(e.target.value) }))
                      }
                    />
                    <Input
                      label={copy.todayTurnoverMin}
                      type="number"
                      value={krSettings.todayTurnoverMin}
                      help={copy.todayTurnoverMinHelp}
                      onChange={(e) =>
                        setKrSettings((prev) => ({
                          ...prev,
                          todayTurnoverMin: Number(e.target.value),
                        }))
                      }
                    />
                    <Input
                      label={copy.relVolMin}
                      type="number"
                      step="0.1"
                      value={krSettings.relVolMin}
                      help={copy.relVolMinHelp}
                      onChange={(e) =>
                        setKrSettings((prev) => ({ ...prev, relVolMin: Number(e.target.value) }))
                      }
                    />
                    <Input
                      label={copy.closePosMin}
                      type="number"
                      step="0.05"
                      value={krSettings.closePosMin}
                      help={copy.closePosMinHelp}
                      onChange={(e) =>
                        setKrSettings((prev) => ({ ...prev, closePosMin: Number(e.target.value) }))
                      }
                    />
                    <Input
                      label={copy.ret5dMin}
                      type="number"
                      step="0.5"
                      value={krSettings.ret5dMin}
                      help={copy.ret5dHelp}
                      onChange={(e) =>
                        setKrSettings((prev) => ({ ...prev, ret5dMin: Number(e.target.value) }))
                      }
                    />
                    <Input
                      label={copy.ret5dMax}
                      type="number"
                      step="0.5"
                      value={krSettings.ret5dMax}
                      help={copy.ret5dHelp}
                      onChange={(e) =>
                        setKrSettings((prev) => ({ ...prev, ret5dMax: Number(e.target.value) }))
                      }
                    />
                    <Input
                      label={copy.freshNewsHours}
                      type="number"
                      value={krSettings.freshNewsHours}
                      help={copy.freshNewsHoursHelp}
                      onChange={(e) =>
                        setKrSettings((prev) => ({
                          ...prev,
                          freshNewsHours: Number(e.target.value),
                        }))
                      }
                    />
                    <Input
                      label={copy.marketTurnoverRankMax}
                      type="number"
                      value={krSettings.marketTurnoverRankMax}
                      help={copy.marketTurnoverRankMaxHelp}
                      onChange={(e) =>
                        setKrSettings((prev) => ({
                          ...prev,
                          marketTurnoverRankMax: Number(e.target.value),
                        }))
                      }
                    />
                    <Input
                      label={copy.largecapMin}
                      type="number"
                      value={krSettings.largecapMin}
                      help={copy.largecapMinHelp}
                      onChange={(e) =>
                        setKrSettings((prev) => ({ ...prev, largecapMin: Number(e.target.value) }))
                      }
                    />
                    <Input
                      label={copy.largecapQuota}
                      type="number"
                      value={krSettings.largecapQuota}
                      help={copy.largecapQuotaHelp}
                      onChange={(e) =>
                        setKrSettings((prev) => ({ ...prev, largecapQuota: Number(e.target.value) }))
                      }
                    />
                    <Select
                      label={copy.excludeFundlike}
                      value={String(krSettings.krExcludeFundlike)}
                      onChange={(e) =>
                        setKrSettings((prev) => ({
                          ...prev,
                          krExcludeFundlike: e.target.value === "true",
                        }))
                      }
                    >
                      <option value="true">{copy.on}</option>
                      <option value="false">{copy.off}</option>
                    </Select>
                    <div className="flex items-end">
                      <Button variant="secondary" onClick={() => applyKrPreset("default")}>
                        {copy.reset}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </StepCard>

        <StepCard step={stepNumber("symbol")} title={copy.symbolTitle} desc={copy.symbolDesc}>
          <div className="grid gap-5 md:grid-cols-2">
            <Input
              label={copy.symbolInput}
              placeholder={market === "KR" ? copy.symbolHintKr : copy.symbolHintUs}
              help={copy.symbolHelp}
              value={symbols}
              onChange={(e) => setSymbols(e.target.value)}
            />
            <Input
              label={copy.heldInput}
              placeholder={market === "KR" ? copy.heldHintKr : copy.heldHintUs}
              help={copy.heldHelp}
              value={heldSymbols}
              onChange={(e) => setHeldSymbols(e.target.value)}
            />
          </div>
        </StepCard>
      </div>

      <div className="sticky bottom-5 z-10 mt-8 flex justify-center">
        <div className="glass-panel w-full max-w-[760px] rounded-full border border-[var(--border)] p-2 shadow-[var(--shadow)]">
          <Button
            variant="primary"
            size="lg"
            loading={scanning}
            onClick={runScan}
            className="w-full justify-center"
          >
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
