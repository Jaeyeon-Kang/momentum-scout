<<<<<<< ours
﻿const $ = (id) => document.getElementById(id);

const KR_DEFAULT_PRESET = {
  marketCapMin: 1000000000000,
  minTurnover: 30000000000,
  todayTurnoverMin: 70000000000,
  relVolMin: 1.3,
  ret5dMin: 4,
  ret5dMax: 25,
  closePosMin: 0.6,
  freshNewsHours: 72,
  marketTurnoverRankMax: 60,
  largecapMin: 2000000000000,
  largecapQuota: 2,
  krExcludeFundlike: true,
};

const US_DEFAULT_PRESET = {
  maxPrice: 2000,
  minTurnover: 20000000,
};

const US_LIQUIDITY_PRESETS = {
  tight: {
    minTurnover: 50000000,
    label: "보수적",
    desc: "하루 평균 거래대금 5천만 달러 이상 위주로 봅니다. 이상한 소형주는 덜 보이지만, 작은 강세주는 놓칠 수 있습니다.",
  },
  balanced: {
    minTurnover: 20000000,
    label: "균형",
    desc: "하루 평균 거래대금 2천만 달러 이상 기준입니다. 너무 마른 종목은 줄이면서도 중형주 기회는 꽤 남겨둡니다.",
  },
  aggressive: {
    minTurnover: 10000000,
    label: "공격적",
    desc: "하루 평균 거래대금 1천만 달러 이상까지 넓혀 봅니다. 괜찮은 소형주를 더 볼 수 있지만 노이즈도 늘어납니다.",
  },
};

const PROFILE_HELP = {
  surge: {
    title: "단기 급등 추적",
    desc: "가장 강한 종목을 빠르게 확인할 때 좋습니다.",
    pros: "장점: 오늘 가장 뜨거운 후보를 보기 쉽습니다.",
    cons: "주의: 과열 구간이 섞일 수 있어 시장 상태를 먼저 봐야 합니다.",
  },
  continuation: {
    title: "거래량 동반 추세 지속",
    desc: "이미 움직인 종목 중에서도 더 이어질 가능성이 있는 쪽을 보려는 설정입니다.",
    pros: "장점: 급등주보다 상대적으로 덜 과열된 경우가 많습니다.",
    cons: "주의: 초반 폭발력은 약할 수 있습니다.",
  },
  early: {
    title: "초기 시동 후보",
    desc: "막 막히는 자리보다 이제 막 탄력 붙는 후보를 보고 싶을 때 씁니다.",
    pros: "장점: 진입 단가가 늦지 않을 수 있습니다.",
    cons: "주의: 실패 후보도 더 많이 섞입니다.",
  },
  manual: {
    title: "직접 조정",
    desc: "왜 이 종목이 뜨는지 이미 감이 있을 때 세부 조건을 직접 바꾸는 모드입니다.",
    pros: "장점: 원하는 성향대로 세밀하게 조정할 수 있습니다.",
    cons: "주의: 기준을 많이 바꾸면 결과 해석이 어려워집니다.",
  },
};

let lastScanPayload = null;
let lastCandidates = [];
let selected = new Set();
let allChecked = false;
let activePanel = "panelScan";
let activeMode = "scout";
let lastDetailPayload = null;
let advancedOpen = false;
let lastIntradayPayload = null;
let lastIntradayMeta = null;
=======
// ═══════════════════════════════════════════════════════════════════════════════
// i18n
// ═══════════════════════════════════════════════════════════════════════════════
const S = {
  en: {
    tagline:       'loading…',
    lbMarket:      'Market',
    lbHorizon:     'Horizon (trading days)',
    lbMaxPrice:    'Max Price',
    lbMinTurnover: 'Min Avg Turnover (20D)',
    lbSymbols:     'Analyze specific symbols (overrides screener)',
    lbScreeners:   'US Screeners',
    phSymbols:     'e.g. TSLA,NVDA or 005930.KS,035420.KS',
    phReport:      'Scan first. Report will appear here.',
    phPrompt:      'Choose prompt type and click Generate prompt.',
    opt5d:         '5D (default)',
    opt20d:        '20D (~1 month)',
    btnScan:       'Scan',
    btnScanning:   'Scanning…',
    btnAdvancedShow:'Show advanced filters',
    btnAdvancedHide:'Hide advanced filters',
    hBatch:        'AI copy pad (optional)',
    metaBatch:     'One report output + one copy/paste prompt output.',
    lbReportOutput:'Report output',
    lbPromptOutput:'Prompt output',
    btnReportSel:  'Generate: Selected',
    btnPromptGen:  'Generate prompt',
    btnPromptCopy: 'Copy prompt',
    optPromptKr:   'Korea momentum swing',
    optPromptUs:   'US momentum swing',
    optPromptDay:  'US day trading',
    btnCopy:       'Copy',
    btnSelectText: 'Select report text',
    btnCheckAll:   'Check all',
    btnUncheckAll: 'Uncheck all',
    btnCopySingle: 'Copy report',
    directMode:    'Direct mode',
    disclaimer:    "No API keys. Data: Yahoo Finance (public) + SEC + Yahoo RSS. Not financial advice.",
    iosHint:       'iPhone: tap textarea → Select All → Copy.',
    scanning:      'Scanning…',
    detailLoading: 'loading…',
    noCandidate:   'No candidates found. Try relaxing your filters (raise max price or lower min turnover).',
    noRss:         'No news available.',
    noSec:         'None / unavailable',
    noSelected:    'Select tickers first by checking the boxes.',
    reportEmpty:   'Report is empty.',
    reportCleared: 'Cleared.',
    copied:        'Copied ✓',
    reportDone:    'Report generated ✓',
    promptDone:    'Prompt generated ✓',
    // sections
    secQuote:  'Quote',
    secLevels: 'Levels',
    secPlan:   'Rule-based plan (not advice)',
    secExtras: 'Extras (best-effort)',
    secNews:   'News (Yahoo RSS)',
    secSec:    'SEC filings (last 7d)',
    // detail labels
    dlLast:       'Last',
    dlDayPct:     'Day %',
    dlVolume:     'Volume',
    dlRelVol:     'RelVol(20d)',
    dlReturns:    '3d / 5d / 20d',
    dlHorizon:    'Horizon return',
    dlAtr:        'ATR(14)',
    dlBidAsk:     'Bid / Ask',
    dlResist:     'Resistance (20d high)',
    dlSupport:    'Support (20d low)',
    dlDayHL:      'Day high / low',
    dlEntry:      'Entry (breakout above)',
    dlStop:       'Stop loss',
    dlTarget:     'Target price',
    dlHoldMax:    'Max hold',
    dlShortFloat: 'Short % of float',
    dlShortRatio: 'Short ratio',
    dlEarnings:   'Earnings (ET)',
    dlOptVol:     'Options Call / Put vol',
    dlCallPut:    'Call:Put ratio',
    dlExpiry:     'Nearest expiry (ET)',
    disclaimer2:  'Prototype. Data may be delayed/incomplete. Your money, your responsibility.',
    // errors
    errNetwork:   'Check your internet connection.',
    errAuth:      'Data auth expired. Please refresh the page.',
    errRateLimit: 'Too many requests. Please wait a moment.',
    errUpstream:  'No response from data server. Try again shortly.',
    errUnknown:   'Unexpected error',
    // market switch
    krDefaults:   'Switched to KR defaults (₩100,000 / ₩5B)',
    usDefaults:   'Switched to US defaults ($80 / $20M)',
    // dynamic
    asof:         (kst, mkt, h, ctx, n) => `${kst} · ${mkt} · ${h}D · ${ctx} · ${n} candidates`,
    loadingRep:   (n) => `Generating report (${n} symbols)…`,
    reportReady:  (mkt, h, n) => `Ready · ${mkt} · ${h}D · ${n} symbols`,
    horizonLbl:   (h) => h === 20 ? '20d' : '5d',
    entryAbove:   (v) => `above ${v}`,
    holdDays:     (d) => `${d} trading days`,
    directScan:   (n) => `Analyzing ${n} symbols (direct mode)…`,
  },
  ko: {
    tagline:       '로딩 중…',
    lbMarket:      '마켓',
    lbHorizon:     '보유 기간 (거래일)',
    lbMaxPrice:    '최대 가격',
    lbMinTurnover: '최소 평균 거래대금 (20일)',
    lbSymbols:     '종목 직접 분석 (입력 시 스크리너 무시)',
    lbScreeners:   'US 스크리너',
    phSymbols:     '예: TSLA,NVDA 또는 005930.KS,035420.KS',
    phReport:      '먼저 스캔하세요. 리포트가 여기에 생성됩니다.',
    phPrompt:      '프롬프트 유형 선택 후 생성 버튼을 누르세요.',
    opt5d:         '5일 (기본)',
    opt20d:        '20일 (~1개월)',
    btnScan:       '스캔',
    btnScanning:   '스캔 중…',
    btnAdvancedShow:'고급 필터 보기',
    btnAdvancedHide:'고급 필터 숨기기',
    hBatch:        'AI 복사용 패드 (선택)',
    metaBatch:     '보고서 1개 + 복붙 프롬프트 1개를 분리해서 생성합니다.',
    lbReportOutput:'보고서 출력',
    lbPromptOutput:'프롬프트 출력',
    btnReportSel:  '생성: 선택 종목',
    btnPromptGen:  '프롬프트 생성',
    btnPromptCopy: '프롬프트 복사',
    optPromptKr:   '한국 단기스윙 모멘텀',
    optPromptUs:   '미국 단기스윙 모멘텀',
    optPromptDay:  '미국 데이트레이딩',
    btnCopy:       '복사',
    btnSelectText: '텍스트 전체 선택',
    btnCheckAll:   '전체 체크',
    btnUncheckAll: '전체 해제',
    btnCopySingle: '리포트 복사',
    directMode:    '직접입력 모드',
    disclaimer:    'API 키 없음. 데이터: Yahoo Finance (공개) + SEC + Yahoo RSS. 투자 조언 아님.',
    iosHint:       'iPhone: 텍스트 영역 탭 → 전체 선택 → 복사.',
    scanning:      '스캔 중…',
    detailLoading: '로딩 중…',
    noCandidate:   '조건에 맞는 종목 없음. 필터를 완화해보세요 (최대가격 올리기 또는 최소거래대금 낮추기).',
    noRss:         '뉴스 없음.',
    noSec:         '없음 / 확인 불가',
    noSelected:    '종목을 먼저 선택하세요 (체크박스).',
    reportEmpty:   '리포트가 비어있습니다.',
    reportCleared: '초기화됨.',
    copied:        '복사됨 ✓',
    reportDone:    '리포트 생성 완료 ✓',
    promptDone:    '프롬프트 생성 완료 ✓',
    secQuote:  '시세',
    secLevels: '레벨',
    secPlan:   '규칙 기반 플랜 (투자 조언 아님)',
    secExtras: '추가 정보',
    secNews:   '뉴스 (Yahoo RSS)',
    secSec:    'SEC 공시 (최근 7일)',
    dlLast:       '현재가',
    dlDayPct:     '등락',
    dlVolume:     '거래량',
    dlRelVol:     '상대거래량 (20일)',
    dlReturns:    '3일 / 5일 / 20일',
    dlHorizon:    '선택 기간 수익률',
    dlAtr:        'ATR(14)',
    dlBidAsk:     'Bid / Ask',
    dlResist:     '저항 (20일 고점)',
    dlSupport:    '지지 (20일 저점)',
    dlDayHL:      '당일 고가 / 저가',
    dlEntry:      '진입 (돌파 시)',
    dlStop:       '손절가',
    dlTarget:     '목표가',
    dlHoldMax:    '최대 보유',
    dlShortFloat: '공매도 비율',
    dlShortRatio: '숏 레이쇼',
    dlEarnings:   '실적 발표 (ET)',
    dlOptVol:     '옵션 콜/풋 거래량',
    dlCallPut:    '콜:풋 비율',
    dlExpiry:     '가장 가까운 만기 (ET)',
    disclaimer2:  '프로토타입. 데이터 지연/누락 가능. 투자 판단은 본인 책임.',
    errNetwork:   '인터넷 연결을 확인하세요.',
    errAuth:      '데이터 인증 만료. 페이지를 새로고침하세요.',
    errRateLimit: '요청이 너무 많습니다. 잠시 후 다시 시도하세요.',
    errUpstream:  '데이터 서버 응답 없음. 잠시 후 다시 시도하세요.',
    errUnknown:   '알 수 없는 오류',
    krDefaults:   'KR 기본값 전환 (₩100,000 / ₩5B)',
    usDefaults:   'US 기본값 전환 ($80 / $20M)',
    asof:         (kst, mkt, h, ctx, n) => `${kst} · ${mkt} · ${h}일 · ${ctx} · ${n}개 종목`,
    loadingRep:   (n) => `리포트 생성 중 (${n}개 종목)…`,
    reportReady:  (mkt, h, n) => `완료 · ${mkt} · ${h}일 · ${n}개 종목`,
    horizonLbl:   (h) => h === 20 ? '20일' : '5일',
    entryAbove:   (v) => `${v} 이상 돌파 시`,
    holdDays:     (d) => `${d} 거래일`,
    directScan:   (n) => `${n}개 종목 직접 분석 중…`,
  },
};

// ─── i18n helpers ───────────────────────────────────────────────
function getLang() { return document.documentElement.lang || 'en'; }
function setLang(lang) {
  document.documentElement.lang = lang;
  localStorage.setItem('ms_lang', lang);
  applyLang();
}
function t(key, ...args) {
  const lang = getLang();
  const val = (S[lang] || S.en)[key] ?? S.en[key] ?? key;
  return typeof val === 'function' ? val(...args) : val;
}
function applyLang() {
  $('langBtn').textContent = getLang() === 'ko' ? 'EN' : '한국어';
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const v = t(el.dataset.i18n);
    if (typeof v === 'string') el.textContent = v;
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const v = t(el.dataset.i18nPh);
    if (typeof v === 'string') el.placeholder = v;
  });
  updateMarketUI(false);  // refresh labels that depend on market
  updateSelectedCount();
  updateToggleButtons();
}
>>>>>>> theirs

function esc(s) {
  return String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function fmt(n, d = 2) {
  const x = Number(n);
  return Number.isFinite(x) ? x.toFixed(d) : "--";
}

function fmtInt(n) {
  const x = Number(n);
  return Number.isFinite(x) ? Math.trunc(x).toLocaleString() : "--";
}

function fmtPct(n) {
  const x = Number(n);
  return Number.isFinite(x) ? `${x >= 0 ? "+" : ""}${x.toFixed(2)}%` : "--";
}

function pillPct(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return '<span class="pill">--</span>';
  return `<span class="pill ${x >= 0 ? "good" : "bad"}">${x >= 0 ? "+" : ""}${x.toFixed(2)}%</span>`;
}

function showToast(msg, type = "info") {
  const toast = $("toast");
  $("toastMsg").textContent = msg;
  toast.className = `toast ${type}`;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 4500);
}

function getMarket() {
  return ($("market")?.value || "US").toUpperCase();
}

function getHorizon() {
  return Number($("horizon")?.value || 5) === 20 ? 20 : 5;
}

function loadKrSettings() {
  try {
    return { ...KR_DEFAULT_PRESET, ...(JSON.parse(localStorage.getItem("ms_kr_advanced") || "{}") || {}) };
  } catch {
    return { ...KR_DEFAULT_PRESET };
  }
}

function saveKrSettings() {
  const cfg = {
    marketCapMin: Number($("marketCapMin")?.value || KR_DEFAULT_PRESET.marketCapMin),
    minTurnover: Number($("minTurnover")?.value || KR_DEFAULT_PRESET.minTurnover),
    todayTurnoverMin: Number($("todayTurnoverMin")?.value || KR_DEFAULT_PRESET.todayTurnoverMin),
    relVolMin: Number($("relVolMin")?.value || KR_DEFAULT_PRESET.relVolMin),
    ret5dMin: Number($("ret5dMin")?.value || KR_DEFAULT_PRESET.ret5dMin),
    ret5dMax: Number($("ret5dMax")?.value || KR_DEFAULT_PRESET.ret5dMax),
    closePosMin: Number($("closePosMin")?.value || KR_DEFAULT_PRESET.closePosMin),
    freshNewsHours: Number($("freshNewsHours")?.value || KR_DEFAULT_PRESET.freshNewsHours),
    marketTurnoverRankMax: Number($("marketTurnoverRankMax")?.value || KR_DEFAULT_PRESET.marketTurnoverRankMax),
    largecapMin: Number($("largecapMin")?.value || KR_DEFAULT_PRESET.largecapMin),
    largecapQuota: Number($("largecapQuota")?.value || KR_DEFAULT_PRESET.largecapQuota),
    krExcludeFundlike: (($("krExcludeFundlike")?.value || "true") === "true"),
  };
  localStorage.setItem("ms_kr_advanced", JSON.stringify(cfg));
}

function applyKrPresetToInputs() {
  const cfg = loadKrSettings();
  if ($("marketCapMin")) $("marketCapMin").value = String(cfg.marketCapMin);
  if ($("minTurnover")) $("minTurnover").value = String(cfg.minTurnover);
  if ($("todayTurnoverMin")) $("todayTurnoverMin").value = String(cfg.todayTurnoverMin);
  if ($("relVolMin")) $("relVolMin").value = String(cfg.relVolMin);
  if ($("ret5dMin")) $("ret5dMin").value = String(cfg.ret5dMin);
  if ($("ret5dMax")) $("ret5dMax").value = String(cfg.ret5dMax);
  if ($("closePosMin")) $("closePosMin").value = String(cfg.closePosMin);
  if ($("freshNewsHours")) $("freshNewsHours").value = String(cfg.freshNewsHours);
  if ($("marketTurnoverRankMax")) $("marketTurnoverRankMax").value = String(cfg.marketTurnoverRankMax);
  if ($("largecapMin")) $("largecapMin").value = String(cfg.largecapMin);
  if ($("largecapQuota")) $("largecapQuota").value = String(cfg.largecapQuota);
  if ($("krExcludeFundlike")) $("krExcludeFundlike").value = String(cfg.krExcludeFundlike);
  if ($("activePresetBadge")) $("activePresetBadge").textContent = "Preset: KR 대형주 포함 공격형";
}

function applyUsPresetToInputs() {
  if ($("maxPrice")) $("maxPrice").value = String(US_DEFAULT_PRESET.maxPrice);
  syncUsLiquidityPreset(false);
}

function syncUsLiquidityPreset(notify = false) {
  if (getMarket() !== "US") return;
  const liquidity = $("liquidityLevel")?.value || "balanced";
  const preset = US_LIQUIDITY_PRESETS[liquidity] || US_LIQUIDITY_PRESETS.balanced;
  if ($("minTurnover")) $("minTurnover").value = String(preset.minTurnover);
  if ($("minTurnoverHelp")) $("minTurnoverHelp").textContent = `현재 ${preset.label} 기준: ${fmtInt(preset.minTurnover)} 달러. ${preset.desc}`;
  if (notify) showToast(`US ${preset.label} 기준으로 최소 평균 거래대금을 맞췄습니다.`, "info");
}

function currentProfile() {
  return PROFILE_HELP[$("scanProfile")?.value || "surge"] || PROFILE_HELP.surge;
}

function currentLiquidityLabel() {
  if (getMarket() === "KR") return "KR 기본";
  return US_LIQUIDITY_PRESETS[$("liquidityLevel")?.value || "balanced"]?.label || "균형";
}

function setViewMode(mode) {
  const next = mode === "focus" ? "focus" : "guide";
  document.body.dataset.view = next;
  localStorage.setItem("ms_view_mode", next);
  $("guideModeBtn")?.classList.toggle("active", next === "guide");
  $("focusModeBtn")?.classList.toggle("active", next === "focus");
  $("guideModeBtn")?.setAttribute("aria-selected", next === "guide" ? "true" : "false");
  $("focusModeBtn")?.setAttribute("aria-selected", next === "focus" ? "true" : "false");
}

function rebuildHeader() {
  const header = document.querySelector(".header");
  if (!header) return;

  header.innerHTML = `
    <div class="header-main">
      <div class="title">
        <div class="h1">Momentum Scout</div>
        <div class="sub" id="asof">시장 판단, 신규 진입 후보, 관찰 후보, 보유 종목 리뷰를 한 화면에서 확인합니다.</div>
      </div>
      <nav class="top-menu mode-menu" aria-label="Main menu">
        <button class="menu-btn active" id="modeScoutBtn" data-mode="scout">Momentum Scout</button>
        <button class="menu-btn" id="modeIntradayBtn" data-mode="intraday">Intraday Desk</button>
      </nav>
      <nav class="top-menu scout-menu" aria-label="Momentum Scout menu" id="scoutMenu">
        <button class="menu-btn active" id="menuScan" data-panel="panelScan">스캔 설정</button>
        <button class="menu-btn" id="menuList" data-panel="panelList">결과 보기</button>
      </nav>
    </div>
    <div class="hdr-actions">
      <label class="header-search" for="headerSearch">
        <span class="header-search-icon">⌕</span>
        <span class="header-search-shortcut">/</span>
        <input id="headerSearch" type="text" placeholder="종목 또는 티커 검색" />
      </label>
      <div class="header-toggle" id="viewModeToggle" role="tablist" aria-label="View mode">
        <button class="header-toggle-btn active" id="guideModeBtn" type="button" data-view="guide" aria-selected="true">Guide</button>
        <button class="header-toggle-btn" id="focusModeBtn" type="button" data-view="focus" aria-selected="false">Focus</button>
      </div>
      <button class="hdr-btn" id="langBtn" aria-label="Switch language">EN</button>
      <button class="hdr-btn" id="themeBtn" aria-label="Toggle theme">Theme</button>
      <button class="hdr-btn" id="refreshBtn" aria-label="Refresh" title="Refresh">새로고침</button>
    </div>
  `;

  document.querySelectorAll(".legacy-nav").forEach((node) => node.remove());
}

function syncHeaderSearchToSymbols() {
  const search = $("headerSearch");
  const symbols = $("symbols");
  const raw = (search?.value || "").trim();
  if (!search || !symbols || !raw) return;
  symbols.value = raw;
  switchMode("scout");
  switchPanel("panelScan");
  symbols.focus();
  symbols.scrollIntoView({ behavior: "smooth", block: "center" });
  showToast("검색어를 직접 확인 종목 칸에 넣었습니다.", "ok");
}

function renderProfileGuide() {
  const profile = currentProfile();
  $("profileGuide").innerHTML = `
    <div class="guide-title">지금 선택한 프로필: ${esc(profile.title)}</div>
    <div class="guide-text">${esc(profile.desc)}</div>
    <div class="guide-text">${esc(profile.pros)}</div>
    <div class="guide-text">${esc(profile.cons)}</div>
  `;
}

function updatePlanSummary() {
  const market = getMarket();
  if (market === "KR") {
    const cfg = loadKrSettings();
    $("planSummary").innerHTML = `
      <div class="plan-summary-title">추천 기본값: KR 대형주 포함 공격형</div>
      <div class="plan-summary-body">특별한 이유가 없으면 그대로 스캔하세요. ETF/ETN은 기본 제외하고, 거래대금 상위권과 대형주를 우선 챙깁니다.</div>
      <div class="plan-summary-meta">
        <span class="plan-pill">시총 하한 ${fmtInt(cfg.marketCapMin)}</span>
        <span class="plan-pill">20D 평균 ${fmtInt(cfg.minTurnover)}</span>
        <span class="plan-pill">당일 거래대금 ${fmtInt(cfg.todayTurnoverMin)}</span>
        <span class="plan-pill">순위 상한 #${fmtInt(cfg.marketTurnoverRankMax)}</span>
      </div>
    `;
    return;
  }

  const profile = currentProfile();
  const liquidity = $("liquidityLevel")?.value || "balanced";
  const liqPreset = US_LIQUIDITY_PRESETS[liquidity] || US_LIQUIDITY_PRESETS.balanced;
  $("planSummary").innerHTML = `
    <div class="plan-summary-title">추천 시작값: US ${esc(profile.title)}</div>
    <div class="plan-summary-body">${esc(profile.desc)} 기본값은 고가주를 놓치지 않도록 최대 가격 2,000달러로 두고, 평균 거래대금은 유동성 기준에 따라 자동 조정합니다.</div>
    <div class="plan-summary-meta">
      <span class="plan-pill">최대 가격 ${fmt($("maxPrice")?.value || 0, 0)}</span>
      <span class="plan-pill">평균 거래대금 ${fmtInt(liqPreset.minTurnover)}</span>
      <span class="plan-pill">보유 기간 ${getHorizon()}일</span>
      <span class="plan-pill">유동성 ${esc($("liquidityLevel")?.selectedOptions?.[0]?.textContent || "균형")}</span>
    </div>
  `;
}

function updateScreenerUi() {
  const custom = ($("scrPreset")?.value || "momentum") === "custom";
  $("scrCustomRow")?.classList.toggle("hidden", !custom);
}

function updateMarketUI(notify = false) {
  const market = getMarket();
  $("currencyTag").textContent = market === "KR" ? "(KRW)" : "($)";

  $("scanProfileField")?.classList.toggle("market-hidden", market === "KR");
  $("horizonField")?.classList.toggle("market-hidden", market === "KR");
  $("liquidityField")?.classList.toggle("market-hidden", market === "KR");
  $("priceField")?.classList.toggle("market-hidden", market === "KR");
  $("filterFieldsRow")?.classList.toggle("market-hidden", market === "KR");
  $("krFixedMode")?.classList.toggle("hidden", market !== "KR");
  $("usSourceDetails")?.classList.toggle("hidden", market === "KR");
  $("scrRow")?.classList.toggle("market-hidden", market === "KR");
  $("scrCustomRow")?.classList.toggle("market-hidden", market === "KR" || ($("scrPreset")?.value || "") !== "custom");

  if (market === "KR") {
    $("horizon").value = "5";
    applyKrPresetToInputs();
    $("toggleAdvancedBtn")?.classList.remove("market-hidden");
    if ($("minTurnoverHelp")) $("minTurnoverHelp").textContent = "KR 기본값은 20일 평균 거래대금 300억 원입니다. 너무 외딴 종목이 끼지 않게 하는 기준입니다.";
    $("inputResolveHint").innerHTML = `
      <div class="guide-title">입력 팁</div>
      <div class="guide-text">KR은 <code>삼성전자</code>, <code>한화오션</code>처럼 종목명으로 적어도 자동 해석을 시도합니다.</div>
      <div class="guide-text">보유 종목도 종목명/코드 혼합 입력이 가능합니다.</div>
    `;
  } else {
    applyUsPresetToInputs();
    advancedOpen = false;
    $("advancedFiltersRow")?.classList.add("hidden");
    $("toggleAdvancedBtn")?.classList.add("market-hidden");
    $("inputResolveHint").innerHTML = `
      <div class="guide-title">입력 팁</div>
      <div class="guide-text">US는 <code>TSLA</code>, <code>NVDA</code>처럼 티커 입력이 가장 정확합니다.</div>
      <div class="guide-text">직접 입력이 없으면 아래의 US 후보 소스 고급 설정 기본값으로 후보를 자동 수집합니다.</div>
    `;
    syncUsLiquidityPreset(false);
  }

  renderProfileGuide();
  updatePlanSummary();
  updateScreenerUi();

  if (notify) {
    showToast(market === "KR" ? "KR 기본값을 적용했습니다." : "US 기본값을 적용했습니다.", "info");
  }
}

<<<<<<< ours
function switchPanel(id) {
  activePanel = id;
  ["panelScan", "panelList"].forEach((panelId) => $(panelId)?.classList.toggle("active", panelId === id));
  document.querySelectorAll("#scoutMenu .menu-btn").forEach((node) => node.classList.toggle("active", node.dataset.panel === id));
=======
// ─── Selected count ─────────────────────────────────────────────
let lastCandidates = [];
let selected = new Set();
let advancedOpen = false;
<<<<<<< ours
=======

function updateToggleButtons() {
  $('toggleAdvancedBtn').textContent = t(advancedOpen ? 'btnAdvancedHide' : 'btnAdvancedShow');
}

function toggleAdvanced() {
  advancedOpen = !advancedOpen;
  $('advancedFiltersRow').classList.toggle('hidden', !advancedOpen);
  updateToggleButtons();
}

function _promptKR(horizon, maxLoss) {
  return `단기스윙 모멘텀 프롬프트\n한국\n너는 한국 주식 단기 모멘텀(1~[${horizon}]거래일) 스윙 트레이딩 분석가다.\n반드시 아래 순서로 진행해라.\n\n0) 먼저 KST 기준 현재 날짜/시간을 한 줄로 쓰고, 네가 가져온 데이터의 “기준 시각(장중/장마감/장전)”을 각각 명시해라.\n1) 웹검색으로 최신 데이터를 확보해라. 최소한 다음은 종목별로 실제 숫자로 가져와라:\n   - 현재가(또는 장마감가) / 당일 등락률 / 거래대금\n   - 최근 20거래일 평균 거래대금 대비 오늘의 배수(가능하면)\n   - 수급: 외국인/기관/개인 순매수(최근 1일·5일·20일)\n   - 관련 뉴스/공시: 최근 [7]일 내 핵심 3개(제목+날짜+요지). 오래된 뉴스로 “방금 나온 것처럼” 말하지 마라.\n   - 공매도 비중 또는 대차잔고 변화(확인 가능한 범위에서)\n   각 항목은 “출처 + 날짜/시각”을 같이 써라.\n\n2) KOSPI+KOSDAQ 전체에서 “단기 모멘텀 후보”를 [1~3]개만 뽑아라.\n   필터:\n   - 유동성: 일 거래대금이 너무 작은 종목은 제외(최소 [예: 200억] 기준. 숫자 확인 불가면 ‘확인 불가’로 표기)\n   - 오늘 급등만 한 테마가 아니라, 수급/거래대금/뉴스가 같이 붙는 후보 우선\n   - 공격적 관점: 변동성은 허용하되, 손절 기준은 반드시 명확히\n\n3) 각 후보마다 아래 포맷으로만 출력해라(군더더기 말 금지):\n   - 종목: [이름/티커]\n   - 한 줄 결론: “왜 지금 모멘텀인지” (수급/촉매/거래대금/차트 중 최소 2개 근거를 숫자로)\n   - 모멘텀 근거(숫자 중심):\n     * 거래대금/거래량 이상치:\n     * 수급(1일·5일·20일):\n     * 촉매(뉴스/공시/테마):\n     * 차트 레벨(전고점/지지/저항을 가격으로):\n   - 리스크(틀어질 조건 3개):\n     * 예: 촉매 소멸, 수급 반전, 갭 하락, 공매도/대차 압력 등\n   - 트레이드 플랜(필수):\n     * 진입가(범위):\n     * 손절가(‘무효화 가격’으로 1개 숫자):\n     * 목표가(1차/2차):\n     * 보유기한: 최대 [${horizon}]거래일 + “시간손절” 규칙(예: [2]거래일 내 모멘텀 미발생 시 정리)\n     * 시나리오: A(상승 추세 유지) / B(실패 시 손절 트리거)\n\n4) 마지막에 전체 후보 중 “가장 가능성이 높은 1개”를 골라라.\n   단, 근거는 반드시 ‘데이터 기준 시각’이 최신인 것만 써라.\n   확인 못한 데이터는 ‘추정’하지 말고 ‘확인 불가’로 적어라.\n\n내 조건:\n- 스타일: 공격적 단기 스윙\n- 최대 보유기간: [${horizon}] 거래일\n- 손실 허용: 1트레이드 기준 최대 [${maxLoss}%] (X 미입력 시 5% 가정)\n- 관심종목(있으면 우선 평가):`;
}

function _promptUSSwing(horizon, maxLoss) {
  return `미국 모멘텀\n\n너는 미국주식 단기 모멘텀(1~[${horizon}]거래일) 스윙 트레이딩 분석가다.\n반드시 “최신 데이터 기반”으로만 말하고, 확인 못한 건 추정하지 말고 ‘확인 불가’라고 써라.\n\n0) 먼저 시간부터 고정:\n   - 현재 시간: ET와 KST를 각각 한 줄로 적어라.\n   - 네가 쓰는 가격/뉴스/지표가 RTH(정규장)인지 PM(프리마켓)인지 AH(애프터)인지 각각 표시해라.\n\n1) 웹검색으로 최신 데이터를 확보해라. 최소한 아래는 종목별로 “실제 숫자”로 적어라(각 항목에 출처 + 시각 포함):\n   - 현재가(또는 마지막 체결가) / 당일 등락률 / 거래량 / 거래대금(가능하면)\n   - 최근 20거래일 평균 대비 오늘 거래량(배수, 가능하면)\n   - 촉매:\n     * 최근 [7]일 뉴스/공시 핵심 3개(제목+날짜/시각+요지)\n     * 실적(earnings) 일정: 날짜 + 발표 시간(BMO/AMC) + 컨센서스(EPS/매출 가능하면)\n     * SEC: 8-K/10-Q/S-3/Form 4 중 관련 있으면 요약(없으면 ‘없음/확인 불가’)\n   - 옵션/숏(가능한 범위):\n     * 옵션 거래량(콜/풋 비율 또는 분위기)\n     * Short interest(가능하면) / borrow fee(CTB) 또는 대차 관련 지표\n   - 시장 맥락:\n     * SPY/QQQ 중 해당 종목이 속한 쪽의 당일 흐름(상승/하락 + 대략 %)\n     * 섹터 ETF(가능하면) 동행 여부\n\n2) “단기 모멘텀 후보”를 [1~3]개만 뽑아라.\n   필터:\n   - 유동성: Avg Dollar Volume이 너무 낮거나 스프레드가 과하게 넓어 보이면 제외(확인 불가면 그 사실을 적고 보수적으로 제외)\n   - 단발 뉴스만으로 튄 게 아니라, 거래량/촉매/옵션·숏 구조 중 최소 2개가 같이 붙은 후보 우선\n   - 공격적 관점: 변동성 허용. 대신 손절 규칙은 무조건 명확히\n\n3) 각 후보는 아래 포맷으로만 출력해라(잡담 금지):\n   - Ticker / 회사명:\n   - 한 줄 결론: “왜 지금 모멘텀인지” (근거 최소 2개를 숫자/사실로)\n   - 모멘텀 근거(팩트 중심):\n     * 거래량/거래대금 이상치:\n     * 촉매(뉴스/공시/실적):\n     * 옵션/숏 구조(있으면):\n     * 차트 레벨(전고점/지지/저항을 가격으로):\n     * 지수/섹터 동행(있으면):\n   - 리스크(틀어질 조건 3개, 구체적으로):\n     * 예: 실적 리스크, 갭다운, 촉매 부정확/반박 기사, 지수 급락, 숏 리버설 등\n   - 트레이드 플랜(필수):\n     * 진입가(범위):\n     * 손절가(‘무효화 가격’ 1개 숫자):\n     * 목표가:\n     * 보유기한: 최대 [${horizon}]거래일 + 시간손절 규칙([2]거래일 내 모멘텀 미발생 시 정리 등)\n     * 이벤트 규칙: 실적/중요 발표가 보유기간에 걸리면 ‘보유/회피’ 중 하나를 명시하고 이유를 적어라.\n\n4) 마지막에 전체 후보 중 “가장 가능성이 높은 1개”를 골라라.\n   단, 근거는 반드시 ‘가장 최신 시각 데이터’만 써라.\n   확인 못한 데이터는 ‘확인 불가’로 남겨라.\n\n내 조건:\n- 스타일: 공격적 단기 스윙\n- 최대 보유기간: [${horizon}] 거래일\n- 1트레이드 최대 허용손실: [${maxLoss}%] (X 미입력 시 6% 가정)\n- 관심 티커(있으면 우선 평가): [예: TSLA, NVDA … / 없으면 비워둠]\n- 제외 섹터/테마(있으면): [없으면 비워둠]`;
}

function _promptUSDay(maxPrice) {
  return `미국데이트레이딩\n너는 미국주식 단기 모멘텀 ‘데이트레이딩(+최대 2거래일 스윙 가능)’ 트레이딩 분석가다.\n반드시 최신 데이터만 사용하고, 확인 못한 건 추정하지 말고 “확인 불가”라고 써라.\n내 조건: 1주만 매수, 공격적, 너무 비싼 종목 제외, 분할매도 금지(한 번에 전량 매도).\n\n0) 시간 고정 (반드시 맨 위에 표기)\n- 현재 시간: ET 한 줄 / KST 한 줄\n- 데이터 기준이 RTH(정규장) / PM(프리) / AH(애프터) 중 무엇인지 각각 표시\n\n1) 유니버스(후보군) 제약\n- 주가 상한: [$${maxPrice}] 이하 (미입력 시 $80)\n- 1주만 사니까 옵션처럼 미친 변동성은 허용하되, “스프레드가 넓은 종목”은 제외(확인 가능하면 %로, 불가하면 ‘불가’ 표기 후 제외)\n- 유동성 필터: 오늘 거래량 또는 평균 거래량이 너무 낮으면 제외(숫자 확인 불가면 보수적으로 제외)\n\n2) 웹검색으로 ‘당일 트리거’ 후보를 1개만 골라라 (딱 1개)\n각 항목은 반드시 “출처 + 시각(ET)”을 붙여라.\n- 가격/수급:\n  * 현재가(마지막 체결가) / 당일 등락률 / 거래량 / 거래대금(가능하면)\n  * 상대 거래량(Relative Volume): 최근 20거래일 평균 대비 배수(가능하면)\n  * 스프레드(가능하면): bid/ask 또는 %로\n- 촉매(최근 48~72시간만 인정):\n  * 뉴스/공시 핵심 3개(제목+날짜/시각+요지)\n  * 실적(earnings) 일정: 날짜 + 발표 시간(BMO/AMC) (있으면)\n  * SEC: 8-K/10-Q/S-3/Form 4 관련 있으면 요약(없으면 ‘없음/확인 불가’)\n- 옵션/숏(가능한 범위만):\n  * 콜/풋 분위기(수치 있으면 수치, 없으면 ‘확인 불가’)\n  * Short interest 또는 borrow fee(CTB) 등(가능하면)\n\n3) 차트는 “숫자 레벨”로만 말해라(느낌 금지)\n- 오늘의 핵심 레벨 3개를 가격으로 제시:\n  * 저항(돌파 시 가속 구간)\n  * 지지(깨지면 끝나는 구간)\n  * 갭/전고점/프리마켓 고점 등 핵심 1개 추가\n\n4) 트레이드 플랜(반드시 1주 기준, 분할매도 금지, 전량 1회 매도)\n아래 포맷 그대로 채워라:\n- 종목: [Ticker / 회사명]\n- 한 줄 결론(왜 오늘 ‘당일 모멘텀’인지): (거래량 이상치 + 촉매 중 최소 2개 근거)\n- 진입 방식(둘 중 하나만 선택, 숫자 포함):\n  A) 돌파 진입: [진입 트리거 가격] 이상 체결 시 매수\n  B) 눌림 진입: [지지 가격] 부근에서 반등 확인 시 매수 (확인 기준 가격 1개)\n- 손절가(무효화 가격, 하드 스톱 1개 숫자): [손절가]\n- 목표가(전량 1회 매도 가격 1개 숫자): [목표가]\n- 시간손절 규칙(반드시):\n  * 당일 데이 기준: [예: 특정 시간까지 목표/추세 미달성 시 전량 청산]\n  * 1~2일 보유 허용 기준: [예: D+1 시가/전일 저가 이탈 시 전량 청산 등]\n- 실패 시나리오 3개(구체적으로):\n  * 촉매 반박/악재 뉴스\n  * 거래량 급감(상대거래량 기준)\n  * 지수 급락/섹터 동반 약세 등(있으면)\n\n5) 금지사항\n- “아마/대충/추정” 금지. 모르면 ‘확인 불가’\n- 분할매도/피라미딩(추가매수) 전략 제시 금지\n- 1개 종목만 제시`;
}

function generatePromptText() {
  const horizon = getHorizon();
  const maxPrice = Number($('maxPrice').value || 80) || 80;
  const maxLoss = getMarket() === 'KR' ? '-X' : '-X';
  const kind = $('promptType').value;
  if (kind === 'KR_SWING') return _promptKR(horizon, maxLoss);
  if (kind === 'US_DAY') return _promptUSDay(maxPrice);
  return _promptUSSwing(horizon, maxLoss);
}

function generatePrompt() {
  $('promptBox').value = generatePromptText();
  showToast(t('promptDone'), 'ok');
}

async function copyPrompt() {
  const text = $('promptBox').value || '';
  if (!text.trim()) { showToast(t('reportEmpty'), 'warn'); return; }
  try {
    await navigator.clipboard.writeText(text);
    showToast(t('copied'), 'ok');
    const btn = $('copyPromptBtn');
    btn.textContent = t('copied');
    setTimeout(() => (btn.textContent = t('btnPromptCopy')), 1500);
  } catch { window.prompt('Copy:', text); }
}

function setPromptTypeByMarket() {
  const market = getMarket();
  const sel = $('promptType');
  if (market === 'KR' && sel.value !== 'KR_SWING') sel.value = 'KR_SWING';
  if (market === 'US' && sel.value === 'KR_SWING') sel.value = 'US_SWING';
}
>>>>>>> theirs

function updateToggleButtons() {
  $('toggleAdvancedBtn').textContent = t(advancedOpen ? 'btnAdvancedHide' : 'btnAdvancedShow');
}

function toggleAdvanced() {
  advancedOpen = !advancedOpen;
  $('advancedFiltersRow').classList.toggle('hidden', !advancedOpen);
  updateToggleButtons();
}

function _promptKR(horizon, maxLoss) {
  return `단기스윙 모멘텀 프롬프트\n한국\n너는 한국 주식 단기 모멘텀(1~[${horizon}]거래일) 스윙 트레이딩 분석가다.\n반드시 아래 순서로 진행해라.\n\n0) 먼저 KST 기준 현재 날짜/시간을 한 줄로 쓰고, 네가 가져온 데이터의 “기준 시각(장중/장마감/장전)”을 각각 명시해라.\n1) 웹검색으로 최신 데이터를 확보해라. 최소한 다음은 종목별로 실제 숫자로 가져와라:\n   - 현재가(또는 장마감가) / 당일 등락률 / 거래대금\n   - 최근 20거래일 평균 거래대금 대비 오늘의 배수(가능하면)\n   - 수급: 외국인/기관/개인 순매수(최근 1일·5일·20일)\n   - 관련 뉴스/공시: 최근 [7]일 내 핵심 3개(제목+날짜+요지). 오래된 뉴스로 “방금 나온 것처럼” 말하지 마라.\n   - 공매도 비중 또는 대차잔고 변화(확인 가능한 범위에서)\n   각 항목은 “출처 + 날짜/시각”을 같이 써라.\n\n2) KOSPI+KOSDAQ 전체에서 “단기 모멘텀 후보”를 [1~3]개만 뽑아라.\n   필터:\n   - 유동성: 일 거래대금이 너무 작은 종목은 제외(최소 [예: 200억] 기준. 숫자 확인 불가면 ‘확인 불가’로 표기)\n   - 오늘 급등만 한 테마가 아니라, 수급/거래대금/뉴스가 같이 붙는 후보 우선\n   - 공격적 관점: 변동성은 허용하되, 손절 기준은 반드시 명확히\n\n3) 각 후보마다 아래 포맷으로만 출력해라(군더더기 말 금지):\n   - 종목: [이름/티커]\n   - 한 줄 결론: “왜 지금 모멘텀인지” (수급/촉매/거래대금/차트 중 최소 2개 근거를 숫자로)\n   - 모멘텀 근거(숫자 중심):\n     * 거래대금/거래량 이상치:\n     * 수급(1일·5일·20일):\n     * 촉매(뉴스/공시/테마):\n     * 차트 레벨(전고점/지지/저항을 가격으로):\n   - 리스크(틀어질 조건 3개):\n     * 예: 촉매 소멸, 수급 반전, 갭 하락, 공매도/대차 압력 등\n   - 트레이드 플랜(필수):\n     * 진입가(범위):\n     * 손절가(‘무효화 가격’으로 1개 숫자):\n     * 목표가(1차/2차):\n     * 보유기한: 최대 [${horizon}]거래일 + “시간손절” 규칙(예: [2]거래일 내 모멘텀 미발생 시 정리)\n     * 시나리오: A(상승 추세 유지) / B(실패 시 손절 트리거)\n\n4) 마지막에 전체 후보 중 “가장 가능성이 높은 1개”를 골라라.\n   단, 근거는 반드시 ‘데이터 기준 시각’이 최신인 것만 써라.\n   확인 못한 데이터는 ‘추정’하지 말고 ‘확인 불가’로 적어라.\n\n내 조건:\n- 스타일: 공격적 단기 스윙\n- 최대 보유기간: [${horizon}] 거래일\n- 손실 허용: 1트레이드 기준 최대 [${maxLoss}%] (X 미입력 시 5% 가정)\n- 관심종목(있으면 우선 평가):`;
}

function _promptUSSwing(horizon, maxLoss) {
  return `미국 모멘텀\n\n너는 미국주식 단기 모멘텀(1~[${horizon}]거래일) 스윙 트레이딩 분석가다.\n반드시 “최신 데이터 기반”으로만 말하고, 확인 못한 건 추정하지 말고 ‘확인 불가’라고 써라.\n\n0) 먼저 시간부터 고정:\n   - 현재 시간: ET와 KST를 각각 한 줄로 적어라.\n   - 네가 쓰는 가격/뉴스/지표가 RTH(정규장)인지 PM(프리마켓)인지 AH(애프터)인지 각각 표시해라.\n\n1) 웹검색으로 최신 데이터를 확보해라. 최소한 아래는 종목별로 “실제 숫자”로 적어라(각 항목에 출처 + 시각 포함):\n   - 현재가(또는 마지막 체결가) / 당일 등락률 / 거래량 / 거래대금(가능하면)\n   - 최근 20거래일 평균 대비 오늘 거래량(배수, 가능하면)\n   - 촉매:\n     * 최근 [7]일 뉴스/공시 핵심 3개(제목+날짜/시각+요지)\n     * 실적(earnings) 일정: 날짜 + 발표 시간(BMO/AMC) + 컨센서스(EPS/매출 가능하면)\n     * SEC: 8-K/10-Q/S-3/Form 4 중 관련 있으면 요약(없으면 ‘없음/확인 불가’)\n   - 옵션/숏(가능한 범위):\n     * 옵션 거래량(콜/풋 비율 또는 분위기)\n     * Short interest(가능하면) / borrow fee(CTB) 또는 대차 관련 지표\n   - 시장 맥락:\n     * SPY/QQQ 중 해당 종목이 속한 쪽의 당일 흐름(상승/하락 + 대략 %)\n     * 섹터 ETF(가능하면) 동행 여부\n\n2) “단기 모멘텀 후보”를 [1~3]개만 뽑아라.\n   필터:\n   - 유동성: Avg Dollar Volume이 너무 낮거나 스프레드가 과하게 넓어 보이면 제외(확인 불가면 그 사실을 적고 보수적으로 제외)\n   - 단발 뉴스만으로 튄 게 아니라, 거래량/촉매/옵션·숏 구조 중 최소 2개가 같이 붙은 후보 우선\n   - 공격적 관점: 변동성 허용. 대신 손절 규칙은 무조건 명확히\n\n3) 각 후보는 아래 포맷으로만 출력해라(잡담 금지):\n   - Ticker / 회사명:\n   - 한 줄 결론: “왜 지금 모멘텀인지” (근거 최소 2개를 숫자/사실로)\n   - 모멘텀 근거(팩트 중심):\n     * 거래량/거래대금 이상치:\n     * 촉매(뉴스/공시/실적):\n     * 옵션/숏 구조(있으면):\n     * 차트 레벨(전고점/지지/저항을 가격으로):\n     * 지수/섹터 동행(있으면):\n   - 리스크(틀어질 조건 3개, 구체적으로):\n     * 예: 실적 리스크, 갭다운, 촉매 부정확/반박 기사, 지수 급락, 숏 리버설 등\n   - 트레이드 플랜(필수):\n     * 진입가(범위):\n     * 손절가(‘무효화 가격’ 1개 숫자):\n     * 목표가:\n     * 보유기한: 최대 [${horizon}]거래일 + 시간손절 규칙([2]거래일 내 모멘텀 미발생 시 정리 등)\n     * 이벤트 규칙: 실적/중요 발표가 보유기간에 걸리면 ‘보유/회피’ 중 하나를 명시하고 이유를 적어라.\n\n4) 마지막에 전체 후보 중 “가장 가능성이 높은 1개”를 골라라.\n   단, 근거는 반드시 ‘가장 최신 시각 데이터’만 써라.\n   확인 못한 데이터는 ‘확인 불가’로 남겨라.\n\n내 조건:\n- 스타일: 공격적 단기 스윙\n- 최대 보유기간: [${horizon}] 거래일\n- 1트레이드 최대 허용손실: [${maxLoss}%] (X 미입력 시 6% 가정)\n- 관심 티커(있으면 우선 평가): [예: TSLA, NVDA … / 없으면 비워둠]\n- 제외 섹터/테마(있으면): [없으면 비워둠]`;
}

function _promptUSDay(maxPrice) {
  return `미국데이트레이딩\n너는 미국주식 단기 모멘텀 ‘데이트레이딩(+최대 2거래일 스윙 가능)’ 트레이딩 분석가다.\n반드시 최신 데이터만 사용하고, 확인 못한 건 추정하지 말고 “확인 불가”라고 써라.\n내 조건: 1주만 매수, 공격적, 너무 비싼 종목 제외, 분할매도 금지(한 번에 전량 매도).\n\n0) 시간 고정 (반드시 맨 위에 표기)\n- 현재 시간: ET 한 줄 / KST 한 줄\n- 데이터 기준이 RTH(정규장) / PM(프리) / AH(애프터) 중 무엇인지 각각 표시\n\n1) 유니버스(후보군) 제약\n- 주가 상한: [$${maxPrice}] 이하 (미입력 시 $80)\n- 1주만 사니까 옵션처럼 미친 변동성은 허용하되, “스프레드가 넓은 종목”은 제외(확인 가능하면 %로, 불가하면 ‘불가’ 표기 후 제외)\n- 유동성 필터: 오늘 거래량 또는 평균 거래량이 너무 낮으면 제외(숫자 확인 불가면 보수적으로 제외)\n\n2) 웹검색으로 ‘당일 트리거’ 후보를 1개만 골라라 (딱 1개)\n각 항목은 반드시 “출처 + 시각(ET)”을 붙여라.\n- 가격/수급:\n  * 현재가(마지막 체결가) / 당일 등락률 / 거래량 / 거래대금(가능하면)\n  * 상대 거래량(Relative Volume): 최근 20거래일 평균 대비 배수(가능하면)\n  * 스프레드(가능하면): bid/ask 또는 %로\n- 촉매(최근 48~72시간만 인정):\n  * 뉴스/공시 핵심 3개(제목+날짜/시각+요지)\n  * 실적(earnings) 일정: 날짜 + 발표 시간(BMO/AMC) (있으면)\n  * SEC: 8-K/10-Q/S-3/Form 4 관련 있으면 요약(없으면 ‘없음/확인 불가’)\n- 옵션/숏(가능한 범위만):\n  * 콜/풋 분위기(수치 있으면 수치, 없으면 ‘확인 불가’)\n  * Short interest 또는 borrow fee(CTB) 등(가능하면)\n\n3) 차트는 “숫자 레벨”로만 말해라(느낌 금지)\n- 오늘의 핵심 레벨 3개를 가격으로 제시:\n  * 저항(돌파 시 가속 구간)\n  * 지지(깨지면 끝나는 구간)\n  * 갭/전고점/프리마켓 고점 등 핵심 1개 추가\n\n4) 트레이드 플랜(반드시 1주 기준, 분할매도 금지, 전량 1회 매도)\n아래 포맷 그대로 채워라:\n- 종목: [Ticker / 회사명]\n- 한 줄 결론(왜 오늘 ‘당일 모멘텀’인지): (거래량 이상치 + 촉매 중 최소 2개 근거)\n- 진입 방식(둘 중 하나만 선택, 숫자 포함):\n  A) 돌파 진입: [진입 트리거 가격] 이상 체결 시 매수\n  B) 눌림 진입: [지지 가격] 부근에서 반등 확인 시 매수 (확인 기준 가격 1개)\n- 손절가(무효화 가격, 하드 스톱 1개 숫자): [손절가]\n- 목표가(전량 1회 매도 가격 1개 숫자): [목표가]\n- 시간손절 규칙(반드시):\n  * 당일 데이 기준: [예: 특정 시간까지 목표/추세 미달성 시 전량 청산]\n  * 1~2일 보유 허용 기준: [예: D+1 시가/전일 저가 이탈 시 전량 청산 등]\n- 실패 시나리오 3개(구체적으로):\n  * 촉매 반박/악재 뉴스\n  * 거래량 급감(상대거래량 기준)\n  * 지수 급락/섹터 동반 약세 등(있으면)\n\n5) 금지사항\n- “아마/대충/추정” 금지. 모르면 ‘확인 불가’\n- 분할매도/피라미딩(추가매수) 전략 제시 금지\n- 1개 종목만 제시`;
}

function generatePromptText() {
  const horizon = getHorizon();
  const maxPrice = Number($('maxPrice').value || 80) || 80;
  const maxLoss = getMarket() === 'KR' ? '-X' : '-X';
  const kind = $('promptType').value;
  if (kind === 'KR_SWING') return _promptKR(horizon, maxLoss);
  if (kind === 'US_DAY') return _promptUSDay(maxPrice);
  return _promptUSSwing(horizon, maxLoss);
}

function generatePrompt() {
  $('promptBox').value = generatePromptText();
  showToast(t('promptDone'), 'ok');
}

async function copyPrompt() {
  const text = $('promptBox').value || '';
  if (!text.trim()) { showToast(t('reportEmpty'), 'warn'); return; }
  try {
    await navigator.clipboard.writeText(text);
    showToast(t('copied'), 'ok');
    const btn = $('copyPromptBtn');
    btn.textContent = t('copied');
    setTimeout(() => (btn.textContent = t('btnPromptCopy')), 1500);
  } catch { window.prompt('Copy:', text); }
}

function setPromptTypeByMarket() {
  const market = getMarket();
  const sel = $('promptType');
  if (market === 'KR' && sel.value !== 'KR_SWING') sel.value = 'KR_SWING';
  if (market === 'US' && sel.value === 'KR_SWING') sel.value = 'US_SWING';
>>>>>>> theirs
}

function switchMode(mode) {
  activeMode = mode;
  $("modeScoutBtn")?.classList.toggle("active", mode === "scout");
  $("modeIntradayBtn")?.classList.toggle("active", mode === "intraday");
  $("scoutMenu")?.classList.toggle("hidden", mode !== "scout");
  $("panelScan")?.classList.toggle("active", mode === "scout" && activePanel === "panelScan");
  $("panelList")?.classList.toggle("active", mode === "scout" && activePanel === "panelList");
  $("panelIntraday")?.classList.toggle("active", mode === "intraday");
}

function selectedRows() {
  return lastCandidates.filter((row) => selected.has(row.symbol));
}

function updatePromptActionHelp() {
  const md = lastScanPayload?.market_decision;
  const rows = selectedRows();
  const approvedCnt = rows.filter((row) => row.entry_status === "APPROVED_NEW").length;
  const watchCnt = rows.length - approvedCnt;
  const held = ($("heldSymbols")?.value || "").trim();

  if (!md) {
    $("promptActionHelp").textContent = "스캔 후 어떤 프롬프트를 복사할지 안내합니다.";
    return;
  }

  if (!rows.length) {
    if (md.new_entries_allowed === false) {
      $("promptActionHelp").textContent = "오늘은 자동 선택이 꺼져 있습니다. 관찰할 종목을 직접 체크하면 관찰/보유 판단용 프롬프트를 만들 수 있습니다.";
    } else {
      $("promptActionHelp").textContent = "체크된 종목을 기준으로 AI 판단용 프롬프트를 복사합니다.";
    }
    return;
  }

  const bits = [];
  if (approvedCnt) bits.push(`신규 진입 후보 ${approvedCnt}개`);
  if (watchCnt) bits.push(`관찰 후보 ${watchCnt}개`);
  if (held) bits.push("보유 종목 리뷰 포함");
  $("promptActionHelp").textContent = `${bits.join(" + ")} 기준으로 AI에 바로 붙여넣을 프롬프트를 만듭니다.`;
}

function updateSelectionGuide() {
  const md = lastScanPayload?.market_decision;
  const approved = lastCandidates.filter((row) => row.entry_status === "APPROVED_NEW");
  const watch = lastCandidates.filter((row) => row.entry_status !== "APPROVED_NEW");

  if (!md) {
    $("selectionGuideText").textContent = "스캔 후 자동 선택과 다음 행동을 여기서 안내합니다.";
    return;
  }

  if (md.new_entries_allowed === false) {
    $("selectionGuideText").textContent = watch.length
      ? "오늘은 신규 진입 자동 선택이 막혀 있습니다. 관찰할 종목을 직접 체크해서 프롬프트를 복사하세요."
      : "오늘은 신규 진입도 관찰 후보도 많지 않습니다. 현금 대기 또는 보유 종목 리뷰를 우선 보세요.";
    return;
  }

  if (approved.length) {
    $("selectionGuideText").textContent = "신규 진입 승인 후보가 우선 자동 체크됩니다. 필요하면 체크를 바꿔도 됩니다.";
    return;
  }

  $("selectionGuideText").textContent = "승인 후보가 없어서 자동 추천은 비어 있습니다. 관찰 후보를 직접 선택해 보세요.";
}

function updateSelectionUi() {
  document.querySelectorAll(".pick").forEach((cb) => {
    cb.checked = selected.has(cb.dataset.sym);
  });

<<<<<<< ours
  allChecked = !!lastCandidates.length && selected.size === lastCandidates.length;
  $("checkAllBtn").textContent = allChecked ? "전체 해제" : "전체 체크";

  const cnt = selected.size;
  $("selCount").textContent = `(${cnt})`;
  $("selCount").classList.toggle("hidden", cnt === 0);
  $("reportSelectionSummary").textContent = cnt > 0
    ? `현재 선택: ${Array.from(selected).join(", ")}`
    : "현재 선택: 없음";

  $("reportSelBtn").disabled = cnt === 0;
  $("promptSelBtn").disabled = cnt === 0;

  const md = lastScanPayload?.market_decision;
  if (md?.new_entries_allowed === false) {
    $("promptSelBtn").textContent = "관찰/보유 판단 프롬프트 복사";
  } else {
    const approvedCnt = selectedRows().filter((row) => row.entry_status === "APPROVED_NEW").length;
    $("promptSelBtn").textContent = approvedCnt > 0
      ? "신규 진입 판단 프롬프트 복사"
      : "관찰 후보 프롬프트 복사";
=======
  try {
    const r = await fetch(`/api/candidates?${params}`);
    if (!r.ok) {
      const msg = await parseErr(r);
      setStatus(''); $('list').innerHTML = `<div class="err-state">${msg}</div>`;
      showToast(msg);
      return;
    }
    const j = await r.json();
    lastCandidates = j.candidates || [];
    selected = new Set();
    updateSelectedCount();

    const ctx = j.context || {};
    const ctxStr = market === 'US'
      ? `SPY ${fmtPct(ctx.SPY_day_chg_pct)} · QQQ ${fmtPct(ctx.QQQ_day_chg_pct)}`
      : `KOSPI ${fmtPct(ctx.KOSPI_day_chg_pct)} · KOSDAQ ${fmtPct(ctx.KOSDAQ_day_chg_pct)}`;
    setStatus(t('asof', j.asof_kst || j.asof_et, market, j.horizon_days, ctxStr, lastCandidates.length));
    renderList(lastCandidates, j.horizon_days);

  } catch (e) {
    const msg = e.name === 'TypeError' ? t('errNetwork') : `${t('errUnknown')}: ${e.message}`;
    setStatus(''); $('list').innerHTML = `<div class="err-state">${msg}</div>`;
    showToast(msg);
  } finally {
    setScanLoading(false);
>>>>>>> theirs
  }

  updatePromptActionHelp();
  updateSelectionGuide();
}

function autoSelectCandidates() {
  selected = new Set();
  const md = lastScanPayload?.market_decision;
  if (md?.new_entries_allowed === false) {
    updateSelectionUi();
    return;
  }

  const auto = lastScanPayload?.auto_selected_symbols || [];
  if (auto.length) {
    selected = new Set(auto);
  } else {
    const approved = lastCandidates
      .filter((row) => row.entry_status === "APPROVED_NEW")
      .slice(0, getMarket() === "KR" ? 4 : 5)
      .map((row) => row.symbol);
    selected = new Set(approved);
  }

  updateSelectionUi();
}

function decisionHeadline(md) {
  if (!md) return "스캔 후 시장 판단이 표시됩니다.";
  if (md.recommended_action === "CASH") return "오늘은 신규 진입보다 현금 대기가 우선입니다.";
  if (md.recommended_action === "WATCHLIST_ONLY") return "신규 진입은 자제하고, 관심종목들의 지지/저항을 확인하며 타점을 대기하세요.";
  return "오늘은 신규 진입 승인 후보를 검토할 수 있는 날입니다.";
}

function renderDecisionBanner() {
  const box = $("marketDecisionBanner");
  const md = lastScanPayload?.market_decision;

  if (!md) {
    box.innerHTML = '<div class="guide-title">시장 판단</div><div class="guide-text">스캔 후 자동으로 채워집니다.</div>';
    return;
  }

  const reasons = (md.reason || []).map((reason) => `<span class="item-tag bad">${esc(reason)}</span>`).join("");
  const snap = md.macro_snapshot || {};
  const snapHtml = Object.keys(snap).map((key) => `<span class="meta-chip">${esc(key)} ${fmtPct(snap[key])}</span>`).join("");

  box.innerHTML = `
    <div class="guide-title">시장 판단: ${esc(md.regime)} / ${esc(md.recommended_action)}</div>
    <div class="guide-text">${decisionHeadline(md)}</div>
    <div class="guide-text">${md.new_entries_allowed ? "신규 진입 허용" : "신규 진입 자동 선택 중지"}</div>
    <div class="item-tags">${reasons || '<span class="item-tag bad">사유 없음</span>'}</div>
    <div class="item-meta">${snapHtml}</div>
  `;
}

function statusBadge(row) {
  if (row.entry_status === "APPROVED_NEW") return { text: "신규 진입 가능", cls: "good" };
  if (row.entry_status === "AVOID") return { text: "비추천", cls: "bad" };
  return { text: "관심종목", cls: "bad" };
}

function renderCard(row, idx, groupLabel) {
  const badge = statusBadge(row);
  const rank = row.extras?.market_turnover_rank;
  const tags = row.extras?.bucket_tags || [];
  const rankChip = rank != null ? `<span class="meta-chip">거래대금 순위 #${rank}</span>` : "";
  const bucketChip = tags.length ? `<span class="meta-chip">${esc(tags.slice(0, 3).join(" / "))}</span>` : "";

  return `
    <div class="item" data-sym="${row.symbol}">
      <div class="chk"><input type="checkbox" class="pick" data-sym="${row.symbol}" aria-label="${row.symbol}" /></div>
      <div class="left">
        <div class="sym">
          <span class="meta-inline">${esc(groupLabel)} #${idx + 1}</span>
          <span>${esc(getMarket() === "KR" ? (row.name || row.symbol) : row.symbol)}</span>
          ${pillPct(row.day_chg_pct)}
          <span class="item-tag ${badge.cls}">${badge.text}</span>
        </div>
        <div class="name">${esc(getMarket() === "KR" ? `${row.symbol} · ${row.currency || ""}` : (row.name || row.symbol))}</div>
        <div class="item-meta">
          <span class="meta-chip">거래대금 ${fmtInt(row.day_turnover)}</span>
          <span class="meta-chip">시총 ${fmtInt(row.market_cap)}</span>
          ${rankChip}
          ${bucketChip}
        </div>
        <div class="item-tags">
          ${(row.entry_reason || []).slice(0, 4).map((reason) => `<span class="item-tag ${badge.cls}">${esc(reason)}</span>`).join("")}
        </div>
      </div>
      <div class="cols">
        <div class="kv"><div class="k">현재가</div><div class="v">${fmt(row.last, 2)}</div></div>
        <div class="kv"><div class="k">상대거래량</div><div class="v">${row.rel_vol_20d ? `${fmt(row.rel_vol_20d, 2)}x` : "--"}</div></div>
        <div class="kv"><div class="k">${getHorizon()}D 수익률</div><div class="v">${fmt(row.ret_horizon_pct, 2)}%</div></div>
        <div class="kv"><div class="k">점수</div><div class="v">${fmt(row.score, 1)}</div></div>
      </div>
    </div>
  `;
}

function attachListHandlers() {
  document.querySelectorAll(".item").forEach((node) => {
    node.addEventListener("click", (event) => {
      if (event.target.closest("input, button, a, .chk")) return;
      openDetail(node.dataset.sym);
    });
  });

  document.querySelectorAll(".pick").forEach((cb) => {
    cb.addEventListener("click", (event) => event.stopPropagation());
    cb.addEventListener("change", (event) => {
      const sym = event.target.dataset.sym;
      if (event.target.checked) selected.add(sym);
      else selected.delete(sym);
      updateSelectionUi();
    });
  });
}

function renderList() {
  const items = lastCandidates || [];
  if (!items.length) {
    $("listHeader").style.display = "none";
    $("list").innerHTML = '<div class="empty-state">후보가 없습니다. 조건을 조금 완화하거나 직접 확인할 종목을 넣어보세요.</div>';
    updateSelectionGuide();
    return;
  }

  $("listHeader").style.display = "flex";
  const approved = items.filter((row) => row.entry_status === "APPROVED_NEW");
  const watch = items.filter((row) => row.entry_status !== "APPROVED_NEW");

  $("list").innerHTML = `
    <div class="sec-hdr">신규 진입 승인 후보</div>
    ${approved.length ? approved.map((row, idx) => renderCard(row, idx, "APPROVED")).join("") : '<div class="empty-state">오늘은 신규 진입 없음</div>'}
    <div class="sec-hdr">관심종목 (타점 대기) / 비추천</div>
    ${watch.length ? watch.map((row, idx) => renderCard(row, idx, "WATCH")).join("") : '<div class="empty-state">관찰 대상 없음</div>'}
  `;

  attachListHandlers();
  updateSelectionGuide();
}

function parseErrText(resp) {
  return resp.text().then((text) => text || `HTTP ${resp.status}`).catch(() => `HTTP ${resp.status}`);
}

async function scan() {
  $("scanBtn").disabled = true;
  $("list").innerHTML = '<div class="spinner"></div>';
  $("status").textContent = "시장/후보를 읽는 중입니다...";

  const market = getMarket();
  const horizon = getHorizon();
  const symbols = ($("symbols")?.value || "").trim();
  const heldSymbols = ($("heldSymbols")?.value || "").trim();

  const params = new URLSearchParams({
    market,
    horizon_days: String(horizon),
    top_n: "10",
    size_per_screener: "25",
    max_price: String(market === "KR" ? 0 : Number($("maxPrice")?.value || 0)),
    min_avg_turnover: String(Number($("minTurnover")?.value || 0)),
  });

  if (market === "KR") {
    saveKrSettings();
    params.set("market_cap_min", String(Number($("marketCapMin")?.value || KR_DEFAULT_PRESET.marketCapMin)));
    params.set("today_turnover_min", String(Number($("todayTurnoverMin")?.value || KR_DEFAULT_PRESET.todayTurnoverMin)));
    params.set("rel_volume_min", String(Number($("relVolMin")?.value || KR_DEFAULT_PRESET.relVolMin)));
    params.set("ret_5d_min", String(Number($("ret5dMin")?.value || KR_DEFAULT_PRESET.ret5dMin)));
    params.set("ret_5d_max", String(Number($("ret5dMax")?.value || KR_DEFAULT_PRESET.ret5dMax)));
    params.set("close_position_min", String(Number($("closePosMin")?.value || KR_DEFAULT_PRESET.closePosMin)));
    params.set("fresh_news_hours", String(Number($("freshNewsHours")?.value || KR_DEFAULT_PRESET.freshNewsHours)));
    params.set("market_turnover_rank_max", String(Number($("marketTurnoverRankMax")?.value || KR_DEFAULT_PRESET.marketTurnoverRankMax)));
    params.set("largecap_min", String(Number($("largecapMin")?.value || KR_DEFAULT_PRESET.largecapMin)));
    params.set("largecap_quota", String(Number($("largecapQuota")?.value || KR_DEFAULT_PRESET.largecapQuota)));
    params.set("kr_exclude_fundlike", (($("krExcludeFundlike")?.value || "true") === "true") ? "true" : "false");
  }

  if (symbols) {
    params.set("symbols", symbols);
    params.set("direct_mode", "true");
  }
  if (heldSymbols) params.set("held_symbols", heldSymbols);

  try {
    const resp = await fetch(`/api/candidates?${params}`);
    if (!resp.ok) throw new Error(await parseErrText(resp));

    const data = await resp.json();
    if (!data.market_decision) throw new Error("market_decision missing");

    lastScanPayload = data;
    lastCandidates = data.candidates || [];

    renderDecisionBanner();
    renderList();
    autoSelectCandidates();

    const ctx = data.context || {};
    const ctxText = market === "KR"
      ? `KOSPI ${fmtPct(ctx.KOSPI_day_chg_pct)} · KOSDAQ ${fmtPct(ctx.KOSDAQ_day_chg_pct)} · USD/KRW ${fmtPct(ctx.USDKRW_day_chg_pct)}`
      : `SPY ${fmtPct(ctx.SPY_day_chg_pct)} · QQQ ${fmtPct(ctx.QQQ_day_chg_pct)} · VIX ${fmtPct(ctx.VIX_day_chg_pct)}`;

    $("status").textContent = `${data.asof_kst || data.asof_et} · ${market} · ${ctxText} · 후보 ${lastCandidates.length}개`;
    switchPanel("panelList");
  } catch (err) {
    $("list").innerHTML = `<div class="err-state">${esc(err.message || String(err))}</div>`;
    $("status").textContent = "스캔에 실패했습니다.";
    showToast(String(err.message || err), "error");
  } finally {
    $("scanBtn").disabled = false;
  }
}

async function openDetail(sym) {
  $("modal").classList.remove("hidden");
  $("mSymbol").textContent = sym;
  $("mName").textContent = "";
  $("detail").innerHTML = '<div class="spinner"></div>';
  lastDetailPayload = null;

  try {
    const market = getMarket();
    const horizon = getHorizon();
    const resp = await fetch(`/api/ticker/${encodeURIComponent(sym)}?market=${market}&horizon_days=${horizon}`);
    if (!resp.ok) throw new Error(await parseErrText(resp));

    const data = await resp.json();
    lastDetailPayload = data;
    $("mName").textContent = data.name || "";

    const quote = data.quote || {};
    const stats = data.stats || {};
    const levels = data.levels || {};
    const plan = data.trade_plan_like || {};
    const extras = data.extras || {};
    const times = extras.timestamps || {};
    const picked = (lastCandidates || []).find((row) => row.symbol === sym) || {};
    const md = lastScanPayload?.market_decision || {};
    const badge = statusBadge(picked);

    const reasons = (picked.scan_reason || []).map((reason) => `<span class="item-tag good">${esc(reason)}</span>`).join("") || '<span class="item-tag">없음</span>';
    const rejects = (picked.rejection_flags || []).map((reason) => `<span class="item-tag bad">${esc(reason)}</span>`).join("") || '<span class="item-tag">없음</span>';

    $("detail").innerHTML = `
      <div class="sec-hdr">1) 현재 판정</div>
      <div class="item-tags"><span class="item-tag ${badge.cls}">${badge.text}</span></div>

      <div class="sec-hdr">2) 시장 판단</div>
      <div class="item-meta">
        <span class="meta-chip">Regime ${esc(md.regime || "--")}</span>
        <span class="meta-chip">Action ${esc(md.recommended_action || "--")}</span>
        <span class="meta-chip">${md.new_entries_allowed ? "신규 진입 가능" : "신규 진입 금지"}</span>
      </div>

      <div class="sec-hdr">3) 선정 근거</div>
      <div class="item-tags">${reasons}</div>

      <div class="sec-hdr">4) 탈락 / 경고</div>
      <div class="item-tags">${rejects}</div>

      <div class="sec-hdr">5) 거래대금 순위</div>
      <div class="item-meta"><span class="meta-chip">거래대금 순위 #${picked.extras?.market_turnover_rank ?? "--"}</span></div>

      <div class="sec-hdr">6) 데이터 시각</div>
      <div class="item-meta">
        <span class="meta-chip">뉴스 ${esc(times.news_asof_kst || picked.extras?.news_asof || "--")}</span>
        <span class="meta-chip">수급 ${esc(times.flow_asof_kst || picked.extras?.flow_asof || "--")}</span>
        <span class="meta-chip">공매도 ${esc(times.short_asof_kst || "--")}</span>
      </div>

      <div class="sec-hdr">7) 규칙 기반 플랜(보조)</div>
      <div class="plan-box">
        <div class="plan-row"><span class="pk">현재가</span><span class="pv">${fmt(quote.last, 2)}</span></div>
        <div class="plan-row"><span class="pk">진입 트리거</span><span class="pv">${fmt(plan.entry_trigger, 2)}</span></div>
        <div class="plan-row"><span class="pk">손절 기준</span><span class="pv">${fmt(plan.stop, 2)}</span></div>
        <div class="plan-row"><span class="pk">목표가</span><span class="pv">${fmt(plan.target, 2)}</span></div>
        <div class="plan-row"><span class="pk">5D 수익률</span><span class="pv">${fmt(stats.ret_5d_pct, 2)}%</span></div>
        <div class="plan-row"><span class="pk">20D 고점</span><span class="pv">${fmt(levels.resistance_20d, 2)}</span></div>
      </div>
    `;
  } catch (err) {
    $("detail").innerHTML = `<div class="err-state">${esc(String(err.message || err))}</div>`;
    showToast(String(err.message || err), "error");
  }
}

function closeModal() {
  $("modal").classList.add("hidden");
}

async function copySingleData() {
  if (!lastDetailPayload) return;
  const text = JSON.stringify(lastDetailPayload, null, 2);
  try {
    await navigator.clipboard.writeText(text);
    showToast("종목 데이터 복사를 완료했습니다.", "ok");
  } catch {
    window.prompt("Copy", text);
  }
}

async function copySinglePrompt() {
  const sym = $("mSymbol").textContent.trim();
  if (!sym) return;
  const params = new URLSearchParams({
    market: getMarket(),
    horizon_days: String(getHorizon()),
  });
  try {
<<<<<<< ours
    const resp = await fetch(`/prompt/${encodeURIComponent(sym)}?${params}`);
    if (!resp.ok) throw new Error(await parseErrText(resp));
    const text = await resp.text();
    $("reportBox").value = text;
    $("reportMeta").textContent = `${getMarket()} · 단일 종목 프롬프트`;
    await navigator.clipboard.writeText(text);
    showToast("단일 종목 프롬프트를 복사했습니다.", "ok");
  } catch (err) {
    showToast(String(err.message || err), "error");
  }
}

function getSelectedSymbols() {
  return selectedRows().map((row) => row.symbol);
}

function getScanContextParams() {
  return {
    scan_profile: getMarket() === "KR" ? "kr_largecap_aggressive" : ($("scanProfile")?.value || "surge"),
    scan_label: getMarket() === "KR" ? "KR 대형주 포함 공격형" : ($("scanProfile")?.selectedOptions?.[0]?.textContent || "US Default"),
    scan_note: getMarket() === "KR"
      ? "fundlike exclude + turnover rank + largecap priority"
      : (PROFILE_HELP[$("scanProfile")?.value || "surge"]?.desc || "default"),
    scan_thresholds: JSON.stringify(loadKrSettings()),
  };
}

async function generateReport(symbols) {
  if (!symbols.length) return;
  const heldSymbols = ($("heldSymbols")?.value || "").trim();
  const params = new URLSearchParams({
    symbols: symbols.join(","),
    market: getMarket(),
    horizon_days: String(getHorizon()),
    max_items: String(symbols.length),
    selected_meta: JSON.stringify(symbols.map((sym, idx) => ({ symbol: sym, selected_order: idx + 1 }))),
    held_symbols: heldSymbols,
    ...getScanContextParams(),
  });

  const resp = await fetch(`/report_multi_data?${params}`);
  if (!resp.ok) throw new Error(await parseErrText(resp));

  const data = await resp.json();
  $("reportBox").value = JSON.stringify(data, null, 2);
  $("reportMeta").textContent = `${getMarket()} · 원본 데이터 ${symbols.length}개`;
  $("reportHint").textContent = "이 JSON은 개발/검증/원문 확인용입니다.";
}

async function copyPromptSelected() {
  const symbols = getSelectedSymbols();
  if (!symbols.length) return;
=======
    const r = await fetch(`/report/${encodeURIComponent(sym)}?market=${market}&horizon_days=${horizon}`);
    if (!r.ok) { showToast(await parseErr(r)); return; }
    await navigator.clipboard.writeText(await r.text());
    showToast(t('copied'), 'ok');
    const btn = $('copyBtn');
    btn.textContent = t('copied');
    setTimeout(() => (btn.textContent = t('btnCopySingle')), 1500);
  } catch (e) {
    showToast(e.name === 'TypeError' ? t('errNetwork') : e.message);
  }
}

// ─── Batch report ────────────────────────────────────────────────
async function generateReport(symbolList) {
  if (!symbolList?.length) return;
  const market = getMarket(), horizon = getHorizon();
  $('reportMeta').textContent = t('loadingRep', symbolList.length);
  setReportLoading('reportSelBtn', true);
>>>>>>> theirs

  const heldSymbols = ($("heldSymbols")?.value || "").trim();
  const params = new URLSearchParams({
    symbols: symbols.join(","),
    market: getMarket(),
    horizon_days: String(getHorizon()),
    max_items: String(symbols.length),
    selected_meta: JSON.stringify(symbols.map((sym, idx) => ({ symbol: sym, selected_order: idx + 1 }))),
    held_symbols: heldSymbols,
    ...getScanContextParams(),
  });

  const resp = await fetch(`/prompt_multi?${params}`);
  if (!resp.ok) throw new Error(await parseErrText(resp));

  const text = await resp.text();
  $("reportBox").value = text;
  $("reportMeta").textContent = `${getMarket()} · AI 프롬프트 준비 완료`;
  $("reportHint").textContent = "이 텍스트는 ChatGPT 같은 모델에 바로 붙여넣기 좋게 만든 프롬프트입니다.";
  await navigator.clipboard.writeText(text);
  showToast("AI 판단용 프롬프트를 복사했습니다.", "ok");
}

function clearReport() {
  $("reportBox").value = "";
  $("reportMeta").textContent = "비워졌습니다.";
  $("reportHint").textContent = "원하는 종목을 먼저 체크한 뒤 버튼을 누르세요.";
}

async function reportSelected() {
  const symbols = getSelectedSymbols();
  if (!symbols.length) return;
  try {
    await generateReport(symbols);
    showToast("원본 데이터(JSON)를 만들었습니다.", "ok");
  } catch (err) {
    showToast(String(err.message || err), "error");
  }
}

function statePill(state) {
  const key = String(state || "").toLowerCase();
  return `<span class="state-pill ${key}">${esc(state || "--")}</span>`;
}

function resultPill(result) {
  const key = String(result || "PENDING").toLowerCase();
  return `<span class="state-pill result ${key}">${esc(result || "PENDING")}</span>`;
}

function intradayFriendlyError(err) {
  const raw = String(err?.message || err || "알 수 없는 오류");
  if (/404|Not Found/i.test(raw)) {
    return "현재 실행 중인 서버에 Intraday Desk API가 없습니다. 개발서버를 재시작해 최신 브랜치 코드를 다시 로드하세요.";
  }
  return raw;
}

function intradayStateGuide(state) {
  if (state === "TRIGGERED") return "지금 유효한 진입 타이밍";
  if (state === "CONFIRM") return "거의 준비됐지만 마지막 확인 필요";
  if (state === "EXPIRED") return "이미 너무 움직여 추격 금지";
  if (state === "BLOCKED") return "시장 리스크로 신규 진입 금지";
  return "감시 단계";
}

function deskTable(columns, rows, rowRenderer) {
  if (!rows.length) return '<div class="empty-state">표시할 데이터가 없습니다.</div>';
  return `
    <div class="table-wrap">
      <table class="desk-table">
        <thead>
          <tr>${columns.map((x) => `<th>${esc(x)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows.map(rowRenderer).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderIntradayBanner() {
  const box = $("intradayBanner");
  const data = lastIntradayPayload;
  if (!data) {
    box.innerHTML = '<div class="guide-title">라이브 레이더</div><div class="guide-text">불러오기 전입니다.</div>';
    return;
  }
  const md = data.market_decision || {};
  const rr = data.risk_rules || {};
  const rules = data.session_rules || {};
  box.innerHTML = `
    <div class="guide-title">${esc(data.session?.label || "Intraday Desk")} / ${esc(data.market_state || "--")}</div>
    <div class="guide-text">${md.new_entries_allowed ? "오늘 신규 진입을 검토할 수 있습니다." : "오늘은 신규 진입이 차단되거나 주의 구간입니다."}</div>
    <div class="item-meta">
      <span class="meta-chip">세션 ${esc(data.session?.code || "--")}</span>
      <span class="meta-chip">Regime ${esc(md.regime || "--")}</span>
      <span class="meta-chip">추천 행동 ${esc(md.recommended_action || "--")}</span>
      <span class="meta-chip">포지션 상한 ${fmt(rr.capital_cap_pct || 20, 0)}%</span>
      <span class="meta-chip">리스크 예산 ${fmt((Number(rr.risk_budget_pct || 0) * 100), 2)}%</span>
      <span class="meta-chip">허용 추격 ${fmt((Number(rules.max_chase_over_trigger_pct || 0) * 100), 1)}%</span>
    </div>
    <div class="guide-text">${esc(data.note || "")}</div>
  `;
}

function renderIntradayApiStatus(data) {
  const api = data?.api_connection || {};
  const missing = (api.missing_fields || []).length ? (api.missing_fields || []).join(", ") : "없음";
  $("deskSessionBadge").textContent = data?.session?.label || "세션 대기";
  $("deskMarketBadge").textContent = data?.market_state || data?.market || "시장 대기";
  $("deskApiBadge").textContent = api.mode || "API 상태 확인 중";
  $("intradayApiStatus").innerHTML = `
    <div class="guide-title">데이터 소스 상태</div>
    <div class="guide-text">브로커: ${esc(api.broker || "--")}</div>
    <div class="guide-text">모드: ${esc(api.mode || "--")} / 실시간 연결: ${api.realtime_connected ? "연결됨" : "아직 아님"}</div>
    <div class="guide-text">인증 소스: ${esc(api.credential_source || "--")} / 누락값: ${esc(missing)}</div>
    <div class="guide-text">${esc(api.message || "상태 정보 없음")}</div>
    <div class="item-meta">
      <span class="meta-chip">자격증명 모드 ${esc(api.credential_mode || "--")}</span>
      <span class="meta-chip">${api.use_mock ? "공개 프록시 유지" : "브로커 연결만 사용"}</span>
      <span class="meta-chip">${api.account_bound ? "계좌번호 감지됨" : "계좌번호 없음"}</span>
    </div>
  `;
}

function renderIntradaySessionRules(source) {
  const rules = source?.session_rules || source?.session_rules_preview || {};
  const plan = source?.api_connection?.feed_plan || {};
  if ($("intradaySessionRuleBox")) {
    $("intradaySessionRuleBox").innerHTML = `
      <div class="guide-title">세션 규칙 요약</div>
      <div class="guide-text">${esc(plan.summary || "현재 세션 규칙을 불러오는 중입니다.")}</div>
      <div class="item-meta">
        <span class="meta-chip">CONFIRM ${fmt(rules.confirm_entry_readiness, 0)}</span>
        <span class="meta-chip">TRIGGER ${fmt(rules.trigger_entry_readiness, 0)}</span>
        <span class="meta-chip">최대 추격 ${fmt((Number(rules.max_chase_over_trigger_pct || 0) * 100), 1)}%</span>
        <span class="meta-chip">스프레드 품질 ${fmt(rules.min_spread_quality, 0)}+</span>
      </div>
      <div class="guide-text">트리거 방식: ${esc(plan.trigger || "세션별 규칙을 따릅니다.")}</div>
    `;
  }

  if ($("intradayFeedPlan")) {
    const feeds = (plan.feeds || []).map((feed) => `
      <div class="feed-row">
        <div class="feed-name">${esc(feed.name || "--")}</div>
        <div class="feed-purpose">${esc(feed.purpose || "")}</div>
      </div>
    `).join("");
    $("intradayFeedPlan").innerHTML = `
      <div class="guide-title">세션 피드 플랜</div>
      <div class="guide-text">${esc(plan.headline || "현재 세션용 피드 계획")}</div>
      <div class="feed-list">${feeds || '<div class="guide-text">아직 정의된 피드가 없습니다.</div>'}</div>
    `;
  }
}

function updateIntradayCredentialUi() {
  const isRuntime = ($("intradayCredentialMode")?.value || "env") === "runtime";
  $("intradayCredentialFields")?.classList.toggle("hidden", !isRuntime);
  if ($("intradayCredentialHint")) {
    $("intradayCredentialHint").textContent = isRuntime
      ? "런타임 파일에만 저장합니다. 개인 로컬 환경에서만 쓰는 경우에만 권장합니다."
      : "권장 방식입니다. KIS_APP_KEY / KIS_APP_SECRET / KIS_ACCOUNT_NO 환경변수를 읽습니다.";
  }
}

function renderIntradayAdapterSettings(data) {
  const adapter = data?.adapter_settings || {};
  const masked = adapter.masked_runtime_credentials || {};
  if ($("intradayCredentialMode")) $("intradayCredentialMode").value = adapter.credential_mode || "env";
  if ($("intradayUseMock")) $("intradayUseMock").value = String(adapter.use_mock !== false);
  if ($("intradayAdapterNotes")) $("intradayAdapterNotes").value = adapter.notes || "";
  if ($("kisAppKey")) $("kisAppKey").placeholder = masked.app_key || "runtime 모드에서만 입력";
  if ($("kisAppSecret")) $("kisAppSecret").placeholder = masked.app_secret || "runtime 모드에서만 입력";
  if ($("kisAccountNo")) $("kisAccountNo").placeholder = masked.account_no || "예: 12345678-01";
  if ($("intradayAdapterSummary")) {
    const saved = adapter.runtime_credentials_saved || {};
    $("intradayAdapterSummary").innerHTML = `
      <div class="guide-title">브로커 연결 설정</div>
      <div class="guide-text">권장 모드는 <strong>환경변수</strong>입니다. 아직 웹소켓 어댑터는 자리만 있으며, 현재는 피드 계획과 설정 흐름까지 연결돼 있습니다.</div>
      <div class="item-meta">
        <span class="meta-chip">Provider ${esc(adapter.provider || "KIS Open API")}</span>
        <span class="meta-chip">모드 ${esc(adapter.credential_mode || "env")}</span>
        <span class="meta-chip">로컬 저장된 App Key ${saved.app_key ? "있음" : "없음"}</span>
        <span class="meta-chip">설정 파일 ${esc(adapter.local_config_path || "--")}</span>
      </div>
    `;
  }
  updateIntradayCredentialUi();
}

async function loadIntradayMeta() {
  try {
    const params = new URLSearchParams({ market: $("intradayMarket")?.value || "KR" });
    const resp = await fetch(`/api/intraday/meta?${params}`);
    if (!resp.ok) throw new Error(await parseErrText(resp));
    const meta = await resp.json();
    lastIntradayMeta = meta;
    renderIntradayApiStatus(meta);
    renderIntradaySessionRules(meta);
    renderIntradayAdapterSettings(meta);
    return meta;
  } catch (err) {
    const friendly = intradayFriendlyError(err);
    $("deskApiBadge").textContent = "API 상태 로드 실패";
    $("intradayApiStatus").innerHTML = `
      <div class="guide-title">데이터 소스 상태</div>
      <div class="guide-text">${esc(friendly)}</div>
    `;
    if ($("intradayBanner")) {
      $("intradayBanner").innerHTML = `<div class="err-state">${esc(friendly)}</div>`;
    }
    return null;
  }
}

async function hydrateIntradayHistory() {
  try {
    const [journalResp, statsResp] = await Promise.all([
      fetch("/api/intraday/journal"),
      fetch("/api/intraday/stats"),
    ]);
    if (journalResp.ok) {
      const journalPayload = await journalResp.json();
      lastIntradayPayload.journal_rows = journalPayload.journal || [];
      if (!lastIntradayPayload.stats_preview && journalPayload.stats_preview) {
        lastIntradayPayload.stats_preview = journalPayload.stats_preview;
      }
    }
    if (statsResp.ok) {
      const statsPayload = await statsResp.json();
      lastIntradayPayload.stats_preview = statsPayload.stats || lastIntradayPayload.stats_preview || {};
    }
  } catch {
    // Best-effort only.
  }
}

function renderIntradayRadar() {
  const rows = lastIntradayPayload?.radar || [];
  $("intradayRadar").innerHTML = deskTable(
    ["종목", "상태", "트리거 플랜", "후보/트리거 점수", "진입금액", "업데이트"],
    rows,
    (row) => `
      <tr>
        <td>
          <strong>${esc(row.symbol)}</strong><br />
          <span class="muted small">${esc(row.name || "")}</span>
          <div class="muted small">${esc(row.setup_type || "")}</div>
        </td>
        <td>
          ${statePill(row.state)}
          <div class="muted small">${esc(intradayStateGuide(row.state))}</div>
          <div class="muted small">${esc((row.state_reason || []).join(" / "))}</div>
        </td>
        <td>
          <div>트리거 ${fmt(row.trigger_price, 2)}</div>
          <div class="muted small">손절 ${fmt(row.stop_price, 2)} / 1차 ${fmt(row.target_price_1, 2)}</div>
          <div class="muted small">허용 추격 ${fmt(row.allowed_chase_pct, 1)}%</div>
        </td>
        <td>
          <div>ready ${fmt((row.flow_scores || {}).entry_readiness_score, 1)} / chase ${fmt((row.flow_scores || {}).chase_risk_score, 1)}</div>
          <div class="muted small">auction ${fmt((row.flow_scores || {}).auction_pressure_score, 1)} / accel ${fmt((row.flow_scores || {}).trade_acceleration_score, 1)}</div>
          <div class="muted small">spread ${fmt((row.flow_scores || {}).spread_quality_score, 1)} / catalyst ${fmt((row.flow_scores || {}).catalyst_score, 1)}</div>
        </td>
        <td>
          <div>${fmtInt(row.position_notional)}</div>
          <div class="muted small">20% cap / 리스크 예산 반영</div>
        </td>
        <td>${esc(row.last_updated_at || "--")}</td>
      </tr>
    `,
  );
}

function renderIntradaySnapshots() {
  const rows = lastIntradayPayload?.snapshot_preview || [];
  $("intradaySnapshots").innerHTML = deskTable(
    ["추천 ID", "종목", "상태", "트리거 플랜", "권장 진입금액", "스냅샷 시각"],
    rows,
    (row) => `
      <tr>
        <td>${esc(row.recommendation_id || "--")}</td>
        <td>
          <strong>${esc(row.symbol || "--")}</strong><br />
          <span class="muted small">${esc(row.name || row.setup_type || "")}</span>
        </td>
        <td>
          ${statePill(row.state)}
          <div class="muted small">${esc((row.state_reason || []).join(" / "))}</div>
        </td>
        <td>
          <div>트리거 ${fmt(row.trigger_price, 2)}</div>
          <div class="muted small">손절 ${fmt(row.stop_price, 2)} / 1차 ${fmt(row.target_price_1, 2)}</div>
        </td>
        <td>${fmtInt(row.position_notional)}</td>
        <td>${esc(row.last_updated_at || "--")}</td>
      </tr>
    `,
  );
}

function renderIntradayTrades() {
  const rows = lastIntradayPayload?.active_trades || [];
  $("intradayTrades").innerHTML = deskTable(
    ["종목", "상태", "현재가/보유", "남은 계획", "데이터 품질"],
    rows,
    (row) => `
      <tr>
        <td><strong>${esc(row.symbol || row.recommendation_id || "--")}</strong><br /><span class="muted small">${esc(row.setup_type || row.session || "")}</span></td>
        <td>${statePill(row.state || row.status)} ${resultPill(row.result_status || (row.entered ? "OPEN" : "PENDING"))}</td>
        <td>
          <div>현재가 ${fmt(row.last || row.current_price, 2)}</div>
          <div class="muted small">예상 보유 ${fmt(row.estimated_hold_minutes, 0)}분</div>
        </td>
        <td>
          <div>손절 ${fmt(row.stop_price, 2)} / 1차 ${fmt(row.target_price_1, 2)}</div>
          <div class="muted small">실현 ${fmt(row.realized_pnl_pct, 2)}% / MFE ${fmt(row.mfe_pct, 2)}%</div>
        </td>
        <td>${esc(row.data_quality || row.market_state || "--")}</td>
      </tr>
    `,
  );
}

function populateIntradayJournalControls() {
  const rows = lastIntradayPayload?.journal_rows || lastIntradayPayload?.journal_preview || [];
  if ($("intradayJournalRec")) {
    const current = $("intradayJournalRec").value;
    $("intradayJournalRec").innerHTML = rows.length
      ? rows.map((row) => `<option value="${esc(row.recommendation_id)}">${esc(row.symbol || row.recommendation_id)} · ${esc(row.result_status || row.status || "PENDING")}</option>`).join("")
      : '<option value="">저널이 비어 있습니다.</option>';
    if (current && rows.some((row) => row.recommendation_id === current)) $("intradayJournalRec").value = current;
  }
  if ($("intradayJournalSummary")) {
    const stats = lastIntradayPayload?.stats_preview || {};
    $("intradayJournalSummary").innerHTML = `
      <div class="guide-title">추천 스냅샷 → 결과 축적</div>
      <div class="guide-text">추천 순간 스냅샷을 먼저 저장하고, 아래에서 실제 진입/청산 결과를 덧붙입니다.</div>
      <div class="item-meta">
        <span class="meta-chip">누적 ${fmt(stats.journal_count || 0, 0)}건</span>
        <span class="meta-chip">OPEN ${fmt(stats.open_count || 0, 0)}</span>
        <span class="meta-chip">Resolved ${fmt(stats.resolved_count || 0, 0)}</span>
        <span class="meta-chip">Win rate ${stats.win_rate_pct == null ? "--" : `${fmt(stats.win_rate_pct, 1)}%`}</span>
      </div>
    `;
  }
}

function renderIntradayJournal() {
  const rows = lastIntradayPayload?.journal_rows || lastIntradayPayload?.journal_preview || [];
  populateIntradayJournalControls();
  $("intradayJournal").innerHTML = deskTable(
    ["추천 ID", "종목", "상태", "결과", "진입/청산", "실현/Excursion", "스냅샷"],
    rows,
    (row) => `
      <tr>
        <td>${esc(row.recommendation_id || "--")}</td>
        <td>${esc(row.symbol || "--")}</td>
        <td>${statePill(row.status || "--")}<div class="muted small">${esc(row.setup_type || "--")}</div></td>
        <td>${resultPill(row.result_status || "PENDING")}<div class="muted small">${esc(row.exit_reason || row.resolution_notes || "--")}</div></td>
        <td>
          <div>fill ${fmt(row.fill_price, 2)} / exit ${fmt(row.exit_price, 2)}</div>
          <div class="muted small">${esc(row.fill_at || "--")} → ${esc(row.exit_at || "--")}</div>
        </td>
        <td>
          <div>실현 ${fmt(row.realized_pnl_pct, 2)}%</div>
          <div class="muted small">MFE ${fmt(row.mfe_pct, 2)}% / MAE ${fmt(row.mae_pct, 2)}%</div>
        </td>
        <td>
          <div>${esc(row.snapshot_at || "--")}</div>
          <div class="muted small">${esc(row.session || "--")} / ${esc(row.market_state || "--")}</div>
        </td>
      </tr>
    `,
  );
}

function renderIntradayStats() {
  const stats = lastIntradayPayload?.stats_preview || {};
  const sessions = Object.entries(stats.by_session || {}).map(([k, v]) => `${k}: ${v}`).join(" / ") || "없음";
  const setups = Object.entries(stats.by_setup || {}).map(([k, v]) => `${k}: ${v}`).join(" / ") || "없음";
  const states = Object.entries(stats.by_status || {}).map(([k, v]) => `${k}: ${v}`).join(" / ") || "없음";
  const results = Object.entries(stats.by_result_status || {}).map(([k, v]) => `${k}: ${v}`).join(" / ") || "없음";
  $("intradayStats").innerHTML = `
    <div class="stats-grid">
      <div class="guide-box compact">
        <div class="guide-title">누적 추천 수 ${fmt(stats.journal_count || 0, 0)}</div>
        <div class="guide-text">OPEN ${fmt(stats.open_count || 0, 0)} / Resolved ${fmt(stats.resolved_count || 0, 0)}</div>
        <div class="guide-text">평균 실현손익 ${stats.avg_realized_pnl_pct == null ? "--" : `${fmt(stats.avg_realized_pnl_pct, 2)}%`}</div>
      </div>
      <div class="guide-box compact">
        <div class="guide-title">승률</div>
        <div class="guide-text">${stats.win_rate_pct == null ? "아직 체결/청산 기록 없음" : `${fmt(stats.win_rate_pct, 1)}%`}</div>
        <div class="guide-text">결과별: ${esc(results)}</div>
      </div>
    </div>
    <div class="guide-box compact">
      <div class="guide-text">세션별: ${esc(sessions)}</div>
      <div class="guide-text">셋업별: ${esc(setups)}</div>
      <div class="guide-text">상태별: ${esc(states)}</div>
    </div>
  `;
}

async function saveIntradayAdapterSettings() {
  $("intradayAdapterSaveBtn").disabled = true;
  $("intradayAdapterSaveStatus").textContent = "브로커 설정 저장 중...";
  try {
    const payload = {
      market: $("intradayMarket")?.value || "KR",
      credential_mode: $("intradayCredentialMode")?.value || "env",
      use_mock: ($("intradayUseMock")?.value || "true") === "true",
      app_key: $("kisAppKey")?.value?.trim() || "",
      app_secret: $("kisAppSecret")?.value?.trim() || "",
      account_no: $("kisAccountNo")?.value?.trim() || "",
      notes: $("intradayAdapterNotes")?.value?.trim() || "",
    };
    const resp = await fetch("/api/intraday/adapter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) throw new Error(await parseErrText(resp));
    const data = await resp.json();
    lastIntradayMeta = data.meta || lastIntradayMeta;
    renderIntradayApiStatus(lastIntradayMeta);
    renderIntradaySessionRules(lastIntradayMeta);
    renderIntradayAdapterSettings(lastIntradayMeta);
    $("intradayAdapterSaveStatus").textContent = data.message || "저장했습니다.";
    $("kisAppKey").value = "";
    $("kisAppSecret").value = "";
    $("kisAccountNo").value = "";
    showToast("브로커 설정을 저장했습니다.", "ok");
  } catch (err) {
    const friendly = intradayFriendlyError(err);
    $("intradayAdapterSaveStatus").textContent = friendly;
    showToast(friendly, "error");
  } finally {
    $("intradayAdapterSaveBtn").disabled = false;
  }
}

async function saveIntradayJournalAction() {
  const recommendationId = $("intradayJournalRec")?.value || "";
  if (!recommendationId) {
    showToast("업데이트할 추천 ID를 먼저 고르세요.", "warn");
    return;
  }
  $("intradayJournalSaveBtn").disabled = true;
  $("intradayJournalSaveStatus").textContent = "저널 저장 중...";
  try {
    const payload = {
      recommendation_id: recommendationId,
      action: $("intradayJournalAction")?.value || "mark_entered",
      fill_price: $("intradayJournalFill")?.value ? Number($("intradayJournalFill").value) : null,
      exit_price: $("intradayJournalExit")?.value ? Number($("intradayJournalExit").value) : null,
      result_status: $("intradayJournalResult")?.value || "",
      note: $("intradayJournalNote")?.value?.trim() || "",
    };
    const resp = await fetch("/api/intraday/journal/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) throw new Error(await parseErrText(resp));
    const data = await resp.json();
    $("intradayJournalSaveStatus").textContent = data.message || "저장했습니다.";
    $("intradayJournalFill").value = "";
    $("intradayJournalExit").value = "";
    $("intradayJournalNote").value = "";
    await loadIntradayDesk();
    showToast("저널을 업데이트했습니다.", "ok");
  } catch (err) {
    const friendly = intradayFriendlyError(err);
    $("intradayJournalSaveStatus").textContent = friendly;
    showToast(friendly, "error");
  } finally {
    $("intradayJournalSaveBtn").disabled = false;
  }
}

async function loadIntradayDesk() {
  $("intradayRefreshBtn").disabled = true;
  $("intradayStatus").textContent = "Intraday Desk 불러오는 중...";
  await loadIntradayMeta();
  try {
    const params = new URLSearchParams({
      market: $("intradayMarket")?.value || "KR",
      account_cash: String(Number($("intradayCash")?.value || 0)),
      account_equity: String(Number($("intradayEquity")?.value || 0)),
      risk_budget_pct: String(Number($("intradayRiskBudget")?.value || 0.8) / 100),
      max_items: "10",
    });
    const resp = await fetch(`/api/intraday/radar?${params}`);
    if (!resp.ok) throw new Error(await parseErrText(resp));
    lastIntradayPayload = await resp.json();
    await hydrateIntradayHistory();
    renderIntradayApiStatus(lastIntradayPayload);
    renderIntradaySessionRules(lastIntradayPayload);
    renderIntradayAdapterSettings(lastIntradayMeta || lastIntradayPayload);
    renderIntradayBanner();
    renderIntradayRadar();
    renderIntradaySnapshots();
    renderIntradayTrades();
    renderIntradayJournal();
    renderIntradayStats();
    $("intradayStatus").textContent = `${lastIntradayPayload.asof_kst || lastIntradayPayload.asof_et} · ${lastIntradayPayload.market} · ${lastIntradayPayload.session?.label || ""}`;
  } catch (err) {
    const friendly = intradayFriendlyError(err);
    $("intradayStatus").textContent = "Intraday Desk 로딩 실패";
    $("intradayBanner").innerHTML = `<div class="err-state">${esc(friendly)}</div>`;
    $("intradayRadar").innerHTML = `<div class="err-state">${esc(friendly)}</div>`;
    showToast(friendly, "error");
  } finally {
<<<<<<< ours
<<<<<<< ours
    $("intradayRefreshBtn").disabled = false;
  }
}

function toggleAdvanced() {
  if (getMarket() !== "KR") return;
  advancedOpen = !advancedOpen;
  $("advancedFiltersRow")?.classList.toggle("hidden", !advancedOpen);
  $("toggleAdvancedBtn").textContent = advancedOpen ? "고급 설정 닫기" : "고급 설정 열기";
}

function toggleCheckAll() {
  allChecked = !allChecked;
  document.querySelectorAll(".pick").forEach((cb) => {
    cb.checked = allChecked;
    if (allChecked) selected.add(cb.dataset.sym);
    else selected.delete(cb.dataset.sym);
  });
  updateSelectionUi();
}
=======
    setReportLoading('reportSelBtn', false);
  }
}
=======
    setReportLoading('reportSelBtn', false);
  }
}
>>>>>>> theirs
async function reportSelected() {
  const syms = Array.from(selected);
  if (!syms.length) { showToast(t('noSelected'), 'warn'); return; }
  await generateReport(syms);
}
async function copyAll() {
  const text = $('reportBox').value || '';
  if (!text.trim()) { showToast(t('reportEmpty'), 'warn'); return; }
  try {
    await navigator.clipboard.writeText(text);
    showToast(t('copied'), 'ok');
    const btn = $('copyAllBtn');
    btn.textContent = t('copied');
    setTimeout(() => (btn.textContent = t('btnCopy')), 1500);
  } catch { window.prompt('Copy:', text); }
}
function selectText() { const b = $('reportBox'); b.focus(); b.select(); }
function clearReport() {
  $('reportBox').value = '';
  $('promptBox').value = '';
  $('reportMeta').textContent = t('reportCleared');
}

// ═══════════════════════════════════════════════════════════════════════════════
// Init
// ═══════════════════════════════════════════════════════════════════════════════
window.addEventListener('load', async () => {
  // Theme
  $('themeBtn').textContent = getTheme() === 'dark' ? '☀' : '☾';
  $('themeBtn').addEventListener('click', () => setTheme(getTheme() === 'dark' ? 'light' : 'dark'));

  // Lang
  applyLang();
  $('langBtn').addEventListener('click', () => setLang(getLang() === 'ko' ? 'en' : 'ko'));

  // Toast
  $('toastClose').addEventListener('click', hideToast);

  // Market switch → UI adaptation
  $('market').addEventListener('change', () => updateMarketUI(true));
  updateMarketUI(false);
  setPromptTypeByMarket();
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs

function copyAll() {
  const text = $("reportBox").value || "";
  if (!text.trim()) return;
  navigator.clipboard.writeText(text)
    .then(() => showToast("현재 내용을 복사했습니다.", "ok"))
    .catch(() => window.prompt("Copy", text));
}

window.addEventListener("load", () => {
  rebuildHeader();
  setViewMode(localStorage.getItem("ms_view_mode") || "guide");
  const introTitle = document.querySelector("#panelScan .section-head .h2");
  const introBody = document.querySelector("#panelScan .section-head .muted.small");
  const scanTab = document.querySelector("#scoutMenu .menu-btn[data-panel='panelScan']");
  const listTab = document.querySelector("#scoutMenu .menu-btn[data-panel='panelList']");
  if (introTitle) introTitle.textContent = "스캔 전에 시장과 기준을 먼저 정하세요.";
  if (introBody) introBody.textContent = "기본 설정으로 시작한 뒤 필요한 항목만 조정해도 충분합니다. 직접 보고 싶은 종목이 있으면 아래 입력칸에 함께 넣어보세요.";
  if (scanTab) scanTab.textContent = "스캔 설정";
  if (listTab) listTab.textContent = "결과 보기";
  if ($("headerSearch")) $("headerSearch").placeholder = "종목 또는 티커 검색";
  document.querySelector(".header-search-icon")?.replaceChildren(document.createTextNode("⌕"));
  $("themeBtn").textContent = document.documentElement.dataset.theme === "dark" ? "Light" : "Dark";
  $("themeBtn").addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("ms_theme", next);
    $("themeBtn").textContent = next === "dark" ? "Light" : "Dark";
  });

  $("langBtn").addEventListener("click", () => {
    document.documentElement.lang = document.documentElement.lang === "ko" ? "en" : "ko";
    localStorage.setItem("ms_lang", document.documentElement.lang);
    showToast("언어 토글은 아직 간단 모드입니다.", "info");
  });
  $("headerSearch")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      syncHeaderSearchToSymbols();
    }
  });
  window.addEventListener("keydown", (event) => {
    const tag = event.target?.tagName;
    if (event.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA" && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      $("headerSearch")?.focus();
    }
  });
  $("guideModeBtn")?.addEventListener("click", () => setViewMode("guide"));
  $("focusModeBtn")?.addEventListener("click", () => setViewMode("focus"));

  $("market").addEventListener("change", () => updateMarketUI(true));
  $("intradayMarket")?.addEventListener("change", async () => {
    await loadIntradayMeta();
    if (activeMode === "intraday" && lastIntradayPayload) await loadIntradayDesk();
  });
  $("scanProfile")?.addEventListener("change", () => {
    renderProfileGuide();
    updatePlanSummary();
  });
  $("horizon")?.addEventListener("change", updatePlanSummary);
  $("liquidityLevel")?.addEventListener("change", () => {
    syncUsLiquidityPreset(true);
    updatePlanSummary();
  });
  $("scrPreset")?.addEventListener("change", updateScreenerUi);

<<<<<<< ours
  $("scanBtn").addEventListener("click", scan);
  $("refreshBtn").addEventListener("click", async () => { await scan(); });
  $("toggleAdvancedBtn").addEventListener("click", toggleAdvanced);
  $("checkAllBtn").addEventListener("click", toggleCheckAll);
  $("reportSelBtn").addEventListener("click", reportSelected);
  $("promptSelBtn").addEventListener("click", async () => {
    try {
      await copyPromptSelected();
    } catch (err) {
      showToast(String(err.message || err), "error");
    }
  });
  $("copyAllBtn").addEventListener("click", copyAll);
  $("clearBtn").addEventListener("click", clearReport);
  $("closeBtn").addEventListener("click", closeModal);
  $("modal").addEventListener("click", (event) => {
    if (event.target === $("modal")) closeModal();
  });
  $("dataCopyBtn").addEventListener("click", copySingleData);
  $("copyBtn").addEventListener("click", copySinglePrompt);
  $("toastClose").addEventListener("click", () => $("toast").classList.add("hidden"));
  document.querySelectorAll("#scoutMenu .menu-btn[data-panel]").forEach((node) => {
    node.addEventListener("click", () => switchPanel(node.dataset.panel));
  });
  $("modeScoutBtn")?.addEventListener("click", () => switchMode("scout"));
  $("modeIntradayBtn")?.addEventListener("click", async () => {
    switchMode("intraday");
    if (!lastIntradayPayload) await loadIntradayDesk();
  });
  $("intradayRefreshBtn")?.addEventListener("click", loadIntradayDesk);
  $("intradayCredentialMode")?.addEventListener("change", updateIntradayCredentialUi);
  $("intradayAdapterSaveBtn")?.addEventListener("click", saveIntradayAdapterSettings);
  $("intradayJournalSaveBtn")?.addEventListener("click", saveIntradayJournalAction);
  $("resetKrPresetBtn")?.addEventListener("click", () => {
    localStorage.setItem("ms_kr_advanced", JSON.stringify(KR_DEFAULT_PRESET));
    applyKrPresetToInputs();
    updatePlanSummary();
    showToast("KR 기본값으로 되돌렸습니다.", "ok");
  });

  [
    "marketCapMin", "minTurnover", "todayTurnoverMin", "relVolMin", "ret5dMin", "ret5dMax",
    "closePosMin", "freshNewsHours", "marketTurnoverRankMax", "largecapMin", "largecapQuota", "krExcludeFundlike",
  ].forEach((id) => {
    $(id)?.addEventListener("change", () => {
      saveKrSettings();
      updatePlanSummary();
    });
  });
=======
  // Batch report
  $('toggleAdvancedBtn').addEventListener('click', toggleAdvanced);
  $('reportSelBtn').addEventListener('click', reportSelected);
  $('copyAllBtn').addEventListener('click', copyAll);
  $('selectTextBtn').addEventListener('click', selectText);
  $('genPromptBtn').addEventListener('click', generatePrompt);
  $('copyPromptBtn').addEventListener('click', copyPrompt);
  $('market').addEventListener('change', setPromptTypeByMarket);
  $('clearBtn').addEventListener('click', clearReport);

  updateToggleButtons();

  // Modal
  $('closeBtn').addEventListener('click', closeModal);
  $('modal').addEventListener('click', e => { if (e.target === $('modal')) closeModal(); });
  $('copyBtn').addEventListener('click', copySingleReport);
>>>>>>> theirs

  applyKrPresetToInputs();
  renderProfileGuide();
  updateMarketUI(false);
  loadIntradayMeta();
  renderDecisionBanner();
  updateSelectionUi();
  switchMode(activeMode);
  switchPanel(activePanel);
});

