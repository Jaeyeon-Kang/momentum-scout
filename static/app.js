// ═══════════════════════════════════════════════════════════════════════════════
// i18n
// ═══════════════════════════════════════════════════════════════════════════════
const S = {
  en: {
    appTitle:      'Momentum Scout',
    tagline:       'Loading market status…',
    menuScan:      '1. Setup',
    menuList:      '2. Candidates',
    menuReport:    '3. Report',
    scanTitle:     'Set your scan target',
    scanDesc:      'Choose the setup first, then narrow with liquidity and direct symbols.',
    scanBlockProfile: 'Pattern to find',
    scanBlockProfileDesc: 'Start from the situation you want, not from raw numbers.',
    scanBlockRange: 'Base range',
    scanBlockRangeDesc: 'Set market and hold period first.',
    scanBlockFilter: 'Filter out noise',
    scanBlockFilterDesc: 'Decide how strict you want to be about turnover and tradability.',
    scanBlockVerify: 'Direct verification',
    scanBlockVerifyDesc: 'Choose whether to trust auto candidates or inspect exact symbols.',
    listTitle:     'Candidate list',
    listDesc:      'Tap a card for detail. Check items to build a report.',
    lbScanProfile: 'Scan profile',
    lbLiquidityLevel: 'Turnover filter',
    lbMarket:      'Market',
    lbHorizon:     'Hold period',
    lbMaxPrice:    'Max price',
    lbMinTurnover: 'Min avg turnover (20D)',
    lbSymbols:     'Symbols to analyze directly (optional)',
    lbScreeners:   'US auto screeners',
    lbScreenerCustom: 'Custom screener IDs',
    scrPresetMomentum: 'Recommended: Momentum core',
    scrPresetGainers: 'Up movers focus',
    scrPresetLiquidity: 'Liquidity focus',
    scrPresetCustom: 'Manual input',
    profileSurge:  'Chase sharp movers',
    profileContinuation: 'Volume-backed continuation',
    profileEarly:  'Early setup',
    profileManual: 'Manual setup',
    liqTight:      'Only very active',
    liqBalanced:   'Balanced',
    liqAggressive: 'Include early moves',
    advancedHint:  'Only edit these when you want to override the suggested values.',
    scrHint:       'Recommended preset is applied automatically. Most users do not need manual IDs.',
    phSymbols:     'e.g. TSLA,NVDA or 005930.KS,035420.KS',
    phReport:      'Build a data package or copy a prompt. Output will appear here.',
    opt5d:         '5D (quick)',
    opt20d:        '20D (smoother trend)',
    btnScan:       'Find candidates',
    btnScanning:   'Scanning…',
    hBatch:        'Data package / prompt',
    metaBatch:     'Build structured data for the checked candidates, or copy a prompt for an external AI.',
    btnReportSel:  'Build data package',
    btnPromptSel:  'Extract prompt',
    btnCopy:       'Copy current content',
    btnAdvancedShow: 'Open advanced settings',
    btnAdvancedHide: 'Close advanced settings',
    btnCheckAll:   'Check all',
    btnUncheckAll: 'Clear all checks',
    btnCopySingle: 'Extract this ticker prompt',
    btnCopySingleData: 'Copy this ticker data',
    directMode:    'Direct mode',
    btnClear:      'Clear',
    btnRefresh:    'Refresh',
    btnClose:      'Close',
    colLast:       'Last',
    colRelVol:     'RelVol',
    colScore:      'Score',
    reportGuideTitle: 'How to use this panel',
    reportGuideBody:  '1) Scan in Setup -> 2) Check candidates -> 3) Build structured data here',
    reportGuideAction:'Use the data package for inspection, and the prompt button for copy-paste into another AI.',
    disclaimer:    "No API keys. Data: US uses Yahoo/SEC, KR uses Naver Finance. Not financial advice.",
    iosHint:       'iPhone: tap textarea → Select All → Copy.',
    scanning:      'Scanning…',
    detailLoading: 'loading…',
    noCandidate:   'No candidates found. Try relaxing your filters (raise max price or lower min turnover).',
    noRss:         'No news available.',
    noSec:         'None / unavailable',
    noSelected:    'Select tickers first by checking the boxes.',
    reportEmpty:   'There is no content yet.',
    reportCleared: 'Cleared.',
    copied:        'Copied',
    reportDone:    'Data package generated ✓',
    promptDone:    'Prompt extracted ✓',
    // sections
    secQuote:  'Quote',
    secLevels: 'Levels',
    secPlan:   'Rule-based plan (not advice)',
    secExtras: 'Extras (best-effort)',
    secKrFlow: 'KR flow / short',
    secNews:   'News',
    secSec:    'SEC filings (last 7d)',
    secStructured: 'Structured data',
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
    dlKrFlow:     'Investor flow',
    dlKrShort:    'Short selling',
    dlKrPersonal: 'Individual',
    dlKrForeign:  'Foreign',
    dlKrInstitution: 'Institution',
    dlKrRatio:    'Ratio',
    dlKrBalance:  'Balance',
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
    loadingRep:   (n) => `Building data package (${n} symbols)…`,
    reportReady:  (mkt, h, n) => `Data ready · ${mkt} · ${h}D · ${n} symbols`,
    loadingPrompt:(n) => `Building prompt (${n} symbols)…`,
    promptReady:  (mkt, h, n) => `Prompt ready · ${mkt} · ${h}D · ${n} symbols`,
    horizonLbl:   (h) => h === 20 ? '20d' : '5d',
    entryAbove:   (v) => `above ${v}`,
    holdDays:     (d) => `${d} trading days`,
    directScan:   (n) => `Analyzing ${n} symbols (direct mode)…`,
    planProfileTitle: (label) => `Scan plan · ${label}`,
    planProfileMeta:  (h, l, p) => `${h} hold · ${l} liquidity · ${p}`,
  },
  ko: {
    appTitle:      'Momentum Scout',
    tagline:       '시장 상태 불러오는 중…',
    menuScan:      '1. 탐색 설정',
    menuList:      '2. 후보 보기',
    menuReport:    '3. 리포트',
    scanTitle:     '무엇을 찾을지 정해요',
    scanDesc:      '찾고 싶은 상황부터 고르고, 유동성과 직접 확인 범위를 정하세요.',
    scanBlockProfile: '찾을 상황',
    scanBlockProfileDesc: '숫자부터 만지지 말고 어떤 패턴을 찾는지 먼저 정합니다.',
    scanBlockRange: '기본 범위',
    scanBlockRangeDesc: '시장과 보유 기간으로 후보 성격을 정합니다.',
    scanBlockFilter: '거를 기준',
    scanBlockFilterDesc: '거래대금이 확실한 종목만 볼지, 초기 신호까지 넓게 볼지 정합니다.',
    scanBlockVerify: '직접 확인 범위',
    scanBlockVerifyDesc: '자동 후보를 볼지, 특정 종목을 바로 검증할지 정합니다.',
    listTitle:     '후보 목록',
    listDesc:      '카드를 눌러 상세를 보고, 체크해서 리포트에 담으세요.',
    lbScanProfile: '탐색 프로필',
    lbLiquidityLevel: '거래대금 기준',
    lbMarket:      '거래 시장',
    lbHorizon:     '보유 기간',
    lbMaxPrice:    '최대 가격',
    lbMinTurnover: '최소 평균 거래대금 (20일)',
    lbSymbols:     '직접 볼 종목 코드 (선택)',
    lbScreeners:   'US 자동 스크리너',
    lbScreenerCustom: '직접 스크리너 ID 입력',
    scrPresetMomentum: '추천: 모멘텀 기본',
    scrPresetGainers: '상승 강도 중심',
    scrPresetLiquidity: '거래량 중심',
    scrPresetCustom: '직접 입력',
    profileSurge:  '단기 급등 추적',
    profileContinuation: '거래량 동반 추세 지속',
    profileEarly:  '초기 포착',
    profileManual: '직접 조정',
    liqTight:      '거래 확실한 종목만',
    liqBalanced:   '적당히',
    liqAggressive: '초기 신호도 포함',
    advancedHint:  '추천값을 바꾸고 싶을 때만 직접 수정하세요.',
    scrHint:       '추천값은 자동 적용됩니다. 대부분은 건드릴 필요 없습니다.',
    phSymbols:     '예: TSLA,NVDA 또는 005930.KS,035420.KS',
    phReport:      '선택 종목 데이터 또는 프롬프트가 여기에 표시됩니다.',
    opt5d:         '5일 (빠른 탐색)',
    opt20d:        '20일 (완만한 흐름)',
    btnScan:       '후보 찾기',
    btnScanning:   '스캔 중…',
    hBatch:        '데이터 패키지 / 프롬프트',
    metaBatch:     '체크한 후보를 구조화 데이터로 묶거나, 외부 AI에 넣을 프롬프트를 복사합니다.',
    btnReportSel:  '선택 종목 데이터 만들기',
    btnPromptSel:  '프롬프트 추출',
    btnCopy:       '현재 내용 복사',
    btnAdvancedShow: '고급 설정 열기',
    btnAdvancedHide: '고급 설정 닫기',
    btnCheckAll:   '전체 체크',
    btnUncheckAll: '전체 해제',
    btnCopySingle: '이 종목 프롬프트 추출',
    btnCopySingleData: '이 종목 데이터 복사',
    directMode:    '직접입력 모드',
    btnClear:      '지우기',
    btnRefresh:    '새로고침',
    btnClose:      '닫기',
    colLast:       '현재가',
    colRelVol:     '거래강도',
    colScore:      '점수',
    reportGuideTitle: '이 영역 사용 순서',
    reportGuideBody:  '1) 탐색 설정에서 후보 찾기 -> 2) 후보 보기에서 체크 -> 3) 여기서 데이터 만들기',
    reportGuideAction:'데이터 패키지는 사실 확인용, 프롬프트 버튼은 외부 AI 복붙용입니다.',
    disclaimer:    'API 키 없음. 데이터: 미국은 Yahoo/SEC, 한국은 Naver Finance 기준. 투자 조언 아님.',
    iosHint:       'iPhone: 텍스트 영역 탭 → 전체 선택 → 복사.',
    scanning:      '스캔 중…',
    detailLoading: '로딩 중…',
    noCandidate:   '조건에 맞는 종목 없음. 필터를 완화해보세요 (최대가격 올리기 또는 최소거래대금 낮추기).',
    noRss:         '뉴스 없음.',
    noSec:         '없음 / 확인 불가',
    noSelected:    '먼저 후보 보기 탭에서 종목을 체크하세요.',
    reportEmpty:   '아직 생성된 내용이 없습니다.',
    reportCleared: '초기화됨.',
    copied:        '복사됨',
    reportDone:    '데이터 생성 완료 ✓',
    promptDone:    '프롬프트 추출 완료 ✓',
    secQuote:  '시세',
    secLevels: '레벨',
    secPlan:   '규칙 기반 플랜 (투자 조언 아님)',
    secExtras: '추가 정보',
    secKrFlow: 'KR 수급 / 공매도',
    secNews:   '뉴스',
    secSec:    'SEC 공시 (최근 7일)',
    secStructured: '구조화 데이터',
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
    dlKrFlow:     '투자자 수급',
    dlKrShort:    '공매도',
    dlKrPersonal: '개인',
    dlKrForeign:  '외국인',
    dlKrInstitution: '기관',
    dlKrRatio:    '비중',
    dlKrBalance:  '잔고',
    disclaimer2:  '프로토타입. 데이터 지연/누락 가능. 투자 판단은 본인 책임.',
    errNetwork:   '인터넷 연결을 확인하세요.',
    errAuth:      '데이터 인증 만료. 페이지를 새로고침하세요.',
    errRateLimit: '요청이 너무 많습니다. 잠시 후 다시 시도하세요.',
    errUpstream:  '데이터 서버 응답 없음. 잠시 후 다시 시도하세요.',
    errUnknown:   '알 수 없는 오류',
    krDefaults:   'KR 기본값 전환 (₩100,000 / ₩5B)',
    usDefaults:   'US 기본값 전환 ($80 / $20M)',
    asof:         (kst, mkt, h, ctx, n) => `${kst} · ${mkt} · ${h}일 · ${ctx} · ${n}개 종목`,
    loadingRep:   (n) => `데이터 패키지 생성 중 (${n}개 종목)…`,
    reportReady:  (mkt, h, n) => `데이터 준비 완료 · ${mkt} · ${h}일 · ${n}개 종목`,
    loadingPrompt:(n) => `프롬프트 생성 중 (${n}개 종목)…`,
    promptReady:  (mkt, h, n) => `프롬프트 준비 완료 · ${mkt} · ${h}일 · ${n}개 종목`,
    horizonLbl:   (h) => h === 20 ? '20일' : '5일',
    entryAbove:   (v) => `${v} 이상 돌파 시`,
    holdDays:     (d) => `${d} 거래일`,
    directScan:   (n) => `${n}개 종목 직접 분석 중…`,
    planProfileTitle: (label) => `탐색 계획 · ${label}`,
    planProfileMeta:  (h, l, p) => `${h} 보유 · ${l} 유동성 · ${p}`,
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
  $('refreshBtn').textContent = t('btnRefresh');
  $('clearBtn').textContent = t('btnClear');
  $('closeBtn').textContent = t('btnClose');
  $('toastClose').textContent = t('btnClose');
  $('copyAllBtn').setAttribute('title', t('btnCopy'));
  $('copyAllBtn').setAttribute('aria-label', t('btnCopy'));
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const v = t(el.dataset.i18n);
    if (typeof v === 'string') el.textContent = v;
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const v = t(el.dataset.i18nPh);
    if (typeof v === 'string') el.placeholder = v;
  });
  updateMarketUI(false);  // refresh labels that depend on market
  refreshPlanSummary();
  updateSelectedCount();
  updateToggleButtons();
  updateMenuLabels();
}

// ─── Theme ──────────────────────────────────────────────────────
function getTheme() { return document.documentElement.dataset.theme; }
function setTheme(th) {
  document.documentElement.dataset.theme = th;
  localStorage.setItem('ms_theme', th);
  $('themeBtn').textContent = th === 'dark' ? '☀' : '☾';
}

// ─── Helpers ────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
function fmt(n, d = 2) {
  if (n == null || Number.isNaN(n)) return '—';
  const x = Number(n); return Number.isFinite(x) ? x.toFixed(d) : '—';
}
function fmtInt(n) {
  if (n == null) return '—';
  const x = Number(n); return Number.isFinite(x) ? Math.trunc(x).toLocaleString() : '—';
}
function fmtPct(p) {
  if (p == null || Number.isNaN(p)) return '—';
  const v = Number(p); if (!Number.isFinite(v)) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
}
function pillPct(p) {
  if (p == null) return `<span class="pill">— %</span>`;
  const v = Number(p);
  return `<span class="pill ${v >= 0 ? 'good' : 'bad'}">${v >= 0 ? '+' : ''}${fmt(v, 2)}%</span>`;
}
function kvRow(k, v) {
  return `<div class="kv-row"><span class="dk">${k}</span><span class="dv">${v}</span></div>`;
}

// ─── Toast ──────────────────────────────────────────────────────
let _toastTimer = null;
function showToast(msg, type = 'error') {
  const el = $('toast');
  $('toastMsg').textContent = msg;
  el.className = `toast ${type}`;
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.add('hidden'), 8000);
}
function hideToast() {
  $('toast').classList.add('hidden');
  if (_toastTimer) clearTimeout(_toastTimer);
}

// ─── Error parsing ──────────────────────────────────────────────
async function parseErr(r) {
  if (r.status === 401) return t('errAuth');
  if (r.status === 429) return t('errRateLimit');
  if (r.status >= 500) {
    let d = '';
    try { d = (await r.json()).detail || ''; } catch { try { d = await r.text(); } catch {} }
    return t('errUpstream') + (d ? ` (${d.slice(0, 120)})` : '');
  }
  try { return (await r.json()).detail || `HTTP ${r.status}`; } catch { return `HTTP ${r.status}`; }
}

// ─── Loading helpers ────────────────────────────────────────────
function setScanLoading(on) {
  const btn = $('scanBtn');
  if (on) { btn.textContent = t('btnScanning'); btn.disabled = true; }
  else    { btn.textContent = t('btnScan');     btn.disabled = false; }
}
function setReportLoading(btnId, on) {
  const btn = $(btnId);
  if (on) { btn.classList.add('loading'); }
  else    { btn.classList.remove('loading'); }
}
function setStatus(text) { $('status').textContent = text; }

// ─── Market/mode UI ─────────────────────────────────────────────
function getMarket()  { return ($('market').value || 'US').toUpperCase(); }
function getHorizon() { return Number($('horizon').value || 5) === 20 ? 20 : 5; }
const SCREENER_PRESETS = {
  momentum: 'day_gainers,most_actives',
  gainers: 'day_gainers',
  liquidity: 'most_actives',
};
const PROFILE_PRESETS = {
  surge: {
    us: { horizon: 5, maxPrice: 80, minTurnover: 30000000, scrPreset: 'gainers' },
    kr: { horizon: 5, maxPrice: 120000, minTurnover: 8000000000 },
    desc: {
      ko: '오늘 강하게 붙은 종목을 먼저 봅니다. 거래대금과 당일 탄력이 같이 붙는 후보를 우선합니다.',
      en: 'Start from names already moving hard today. Prioritize names with both price expansion and real turnover.'
    }
  },
  continuation: {
    us: { horizon: 5, maxPrice: 120, minTurnover: 20000000, scrPreset: 'momentum' },
    kr: { horizon: 5, maxPrice: 180000, minTurnover: 5000000000 },
    desc: {
      ko: '이미 거래가 붙은 흐름이 하루 더 이어질 수 있는 후보를 봅니다. 급등만 하고 식은 종목은 덜 선호합니다.',
      en: 'Look for moves that can continue for another leg. Avoid one-candle spikes with weak follow-through.'
    }
  },
  early: {
    us: { horizon: 20, maxPrice: 80, minTurnover: 12000000, scrPreset: 'liquidity' },
    kr: { horizon: 20, maxPrice: 100000, minTurnover: 3000000000 },
    desc: {
      ko: '아직 과열 전이지만 거래가 조금씩 붙는 종목을 찾습니다. 대신 잡음이 많아서 직접 검증이 더 중요합니다.',
      en: 'Search for early setups before the crowd fully arrives. Expect more noise and verify manually.'
    }
  },
  manual: {
    us: { horizon: null, maxPrice: null, minTurnover: null, scrPreset: null },
    kr: { horizon: null, maxPrice: null, minTurnover: null, scrPreset: null },
    desc: {
      ko: '추천값을 강제로 바꾸지 않습니다. 지금 보이는 숫자 그대로 탐색합니다.',
      en: 'Do not force preset values. Use the current numbers exactly as shown.'
    }
  }
};
const LIQUIDITY_ADJUST = {
  tight:      { us: 1.5, kr: 1.5, label: { ko: '빡세게', en: 'Tight' } },
  balanced:   { us: 1.0, kr: 1.0, label: { ko: '균형', en: 'Balanced' } },
  aggressive: { us: 0.65, kr: 0.7, label: { ko: '공격적으로', en: 'Aggressive' } },
};

function getScanProfile() { return $('scanProfile')?.value || 'surge'; }
function getLiquidityLevel() { return $('liquidityLevel')?.value || 'balanced'; }

function getScanPlan() {
  const market = getMarket() === 'KR' ? 'kr' : 'us';
  const profileKey = getScanProfile();
  const liquidityKey = getLiquidityLevel();
  const profile = PROFILE_PRESETS[profileKey] || PROFILE_PRESETS.surge;
  const liq = LIQUIDITY_ADJUST[liquidityKey] || LIQUIDITY_ADJUST.balanced;
  const base = profile[market] || {};
  const lang = getLang();
  const label = t(
    profileKey === 'surge' ? 'profileSurge'
      : profileKey === 'continuation' ? 'profileContinuation'
      : profileKey === 'early' ? 'profileEarly'
      : 'profileManual'
  );
  return {
    key: profileKey,
    label,
    desc: profile.desc[lang] || profile.desc.ko,
    liquidityKey,
    liquidityLabel: liq.label[lang] || liq.label.ko,
    horizon: base.horizon,
    maxPrice: base.maxPrice,
    minTurnover: base.minTurnover != null ? Math.round(base.minTurnover * (liq[market] || 1)) : null,
    scrPreset: base.scrPreset,
  };
}

function applyScanProfilePreset() {
  const plan = getScanPlan();
  if (plan.horizon != null) $('horizon').value = String(plan.horizon);
  if (plan.maxPrice != null) $('maxPrice').value = String(plan.maxPrice);
  if (plan.minTurnover != null) $('minTurnover').value = String(plan.minTurnover);
  if (getMarket() === 'US' && plan.scrPreset) {
    $('scrPreset').value = plan.scrPreset;
    updateScreenerPresetUI();
  }
  refreshPlanSummary();
}

function refreshPlanSummary() {
  const plan = getScanPlan();
  $('planSummary').innerHTML = `
    <div class="plan-summary-title">${t('planProfileTitle', plan.label)}</div>
    <div class="plan-summary-body">${plan.desc}</div>
    <div class="plan-summary-meta">
      <span class="plan-pill">${t('planProfileMeta', t('horizonLbl', getHorizon()), plan.liquidityLabel, getMarket())}</span>
      <span class="plan-pill">${t('lbMaxPrice')}: ${getMarket() === 'KR' ? '₩' : '$'}${fmtInt(Number($('maxPrice').value || 0))}</span>
      <span class="plan-pill">${t('lbMinTurnover')}: ${fmtInt(Number($('minTurnover').value || 0))}</span>
    </div>
  `;
}

function getScreenerIds() {
  if (getMarket() !== 'US') return '';
  const preset = $('scrPreset')?.value || 'momentum';
  if (preset === 'custom') return ($('scrIds').value || '').trim();
  return SCREENER_PRESETS[preset] || SCREENER_PRESETS.momentum;
}

function updateScreenerPresetUI() {
  const isCustom = ($('scrPreset')?.value || 'momentum') === 'custom';
  $('scrCustomRow')?.classList.toggle('hidden', !isCustom);
}

function updateMarketUI(notify = true) {
  const m = getMarket();
  // Currency tag
  $('currencyTag').textContent = m === 'KR' ? '(₩)' : '($)';
  // Hide screener row for KR
  const scrRow = $('scrRow');
  const scrCustomRow = $('scrCustomRow');
  if (m === 'KR') {
    scrRow.classList.add('market-hidden');
    scrCustomRow?.classList.add('market-hidden');
  } else {
    scrRow.classList.remove('market-hidden');
    scrCustomRow?.classList.remove('market-hidden');
    updateScreenerPresetUI();
  }
  applyScanProfilePreset();
  if (notify) showToast(m === 'KR' ? t('krDefaults') : t('usDefaults'), 'info');
}

function updateSymbolsUI() {
  const hasSymbols = ($('symbols').value || '').trim().length > 0;
  const scrRow = $('scrRow');
  const scrCustomRow = $('scrCustomRow');
  const badge  = $('directBadge');
  if (hasSymbols && getMarket() !== 'KR') {
    scrRow.classList.add('dimmed');
    scrCustomRow?.classList.add('dimmed');
    badge.classList.remove('hidden');
  } else {
    scrRow.classList.remove('dimmed');
    scrCustomRow?.classList.remove('dimmed');
    badge.classList.add('hidden');
  }
}

// ─── Selected count ─────────────────────────────────────────────
let lastCandidates = [];
let selected = new Set();
let advancedOpen = false;
let activePanel = 'panelScan';
let lastDetailPayload = null;

function updateMenuLabels() {
  ['menuScan', 'menuList'].forEach(id => {
    const el = $(id);
    if (!el) return;
    const key = el.dataset.i18n;
    if (key) el.textContent = t(key);
  });
}

function switchPanel(panelId) {
  const target = document.getElementById(panelId) ? panelId : 'panelScan';
  activePanel = target;
  document.querySelectorAll('.panel').forEach(el => el.classList.toggle('active', el.id === target));
  document.querySelectorAll('.menu-btn').forEach(el => el.classList.toggle('active', el.dataset.panel === target));
}

function updateToggleButtons() {
  $('toggleAdvancedBtn').textContent = t(advancedOpen ? 'btnAdvancedHide' : 'btnAdvancedShow');
}

function toggleAdvanced() {
  advancedOpen = !advancedOpen;
  $('advancedFiltersRow').classList.toggle('hidden', !advancedOpen);
  updateToggleButtons();
}

function updateSelectedCount() {
  const cnt = selected.size;
  const el = $('selCount');
  if (cnt > 0) { el.textContent = `(${cnt})`; el.classList.remove('hidden'); }
  else         { el.classList.add('hidden'); }
  updateReportActionState();
}

function updateReportActionState() {
  const hasSelection = selected.size > 0;
  const hasReport = (($('reportBox')?.value || '').trim().length > 0);
  $('reportSelBtn').disabled = !hasSelection;
  $('promptSelBtn').disabled = !hasSelection;
  $('copyAllBtn').disabled = !hasReport;
}

function getScanContext() {
  const plan = getScanPlan();
  return {
    scan_profile: plan.key,
    scan_label: plan.label,
    scan_note: plan.desc,
  };
}

// ─── Health ─────────────────────────────────────────────────────
async function health() {
  try {
    const r = await fetch('/api/health');
    if (!r.ok) return;
    const j = await r.json();
    $('asof').textContent = `${j.now_kst} · ${j.session_us}`;
  } catch {}
}

// ─── Scan ───────────────────────────────────────────────────────
async function scan() {
  setScanLoading(true);
  $('list').innerHTML = '<div class="spinner"></div>';
  $('listHeader').style.display = 'none';
  setStatus('');

  const market    = getMarket();
  const horizon   = getHorizon();
  const maxPrice  = Number($('maxPrice').value || 0);
  const minTurn   = Number($('minTurnover').value || 0);
  const scrIds    = getScreenerIds();
  const symbols   = ($('symbols').value || '').trim();

  // Direct mode feedback
  if (symbols) {
    const n = symbols.split(',').filter(s => s.trim()).length;
    setStatus(t('directScan', n));
  }

  const params = new URLSearchParams({
    market,
    horizon_days:      String(horizon),
    max_price:         String(maxPrice),
    min_avg_turnover:  String(minTurn),
    size_per_screener: '25',
    top_n:             '10',
  });
  if (scrIds)  params.set('scr_ids', scrIds);
  if (symbols) params.set('symbols', symbols);

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
    allChecked = false;
    $('checkAllBtn').textContent = t('btnCheckAll');
    updateSelectedCount();

    const ctx = j.context || {};
    const ctxStr = market === 'US'
      ? `SPY ${fmtPct(ctx.SPY_day_chg_pct)} · QQQ ${fmtPct(ctx.QQQ_day_chg_pct)}`
      : `KOSPI ${fmtPct(ctx.KOSPI_day_chg_pct)} · KOSDAQ ${fmtPct(ctx.KOSDAQ_day_chg_pct)}`;
    setStatus(t('asof', j.asof_kst || j.asof_et, market, j.horizon_days, ctxStr, lastCandidates.length));
    renderList(lastCandidates, j.horizon_days);
    switchPanel('panelList');

  } catch (e) {
    const msg = e.name === 'TypeError' ? t('errNetwork') : `${t('errUnknown')}: ${e.message}`;
    setStatus(''); $('list').innerHTML = `<div class="err-state">${msg}</div>`;
    showToast(msg);
  } finally {
    setScanLoading(false);
  }
}

// ─── Render candidates ──────────────────────────────────────────
function renderList(items, horizonDays) {
  if (!items.length) {
    $('list').innerHTML = `<div class="card"><div class="empty-state">${t('noCandidate')}</div></div>`;
    $('listHeader').style.display = 'none';
    return;
  }
  $('listHeader').style.display = 'flex';
  const hl = t('horizonLbl', horizonDays);
  const market = getMarket();
  $('list').innerHTML = items.map((x, i) => `
    <div class="item" data-sym="${x.symbol}">
      <div class="chk"><input type="checkbox" class="pick" data-sym="${x.symbol}" aria-label="${x.symbol}"/></div>
      <div class="left">
        <div class="sym">
          <span style="font-size:11px;color:var(--muted)">#${i + 1}</span>
          ${market === 'KR' ? (x.name || x.symbol) : x.symbol} ${pillPct(x.day_chg_pct)}
        </div>
        <div class="name">
          ${market === 'KR'
            ? `${x.symbol}${x.currency ? ` · ${x.currency}` : ''}`
            : `${(x.name || '').slice(0, 42)}${x.currency ? ` · ${x.currency}` : ''}`
          }
        </div>
      </div>
      <div class="cols">
        <div class="kv"><div class="k">${t('colLast')}</div><div class="v">${fmt(x.last, 2)}</div></div>
        <div class="kv"><div class="k">${t('colRelVol')}</div><div class="v">${x.rel_vol_20d ? `${fmt(x.rel_vol_20d, 2)}×` : '—'}</div></div>
        <div class="kv"><div class="k">${hl}</div><div class="v">${fmt(x.ret_horizon_pct, 2)}%</div></div>
        <div class="kv"><div class="k">${t('colScore')}</div><div class="v">${fmt(x.score, 1)}</div></div>
      </div>
    </div>`).join('');

  document.querySelectorAll('.item').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('input, button, a, .chk')) return;
      openDetail(el.dataset.sym);
    });
  });
  document.querySelectorAll('.chk').forEach(box => {
    box.addEventListener('click', e => e.stopPropagation());
    box.addEventListener('mousedown', e => e.stopPropagation());
  });
  document.querySelectorAll('.pick').forEach(cb => {
    cb.addEventListener('click', e => e.stopPropagation());
    cb.addEventListener('mousedown', e => e.stopPropagation());
    cb.addEventListener('change', e => {
      e.target.checked ? selected.add(e.target.dataset.sym) : selected.delete(e.target.dataset.sym);
      updateSelectedCount();
    });
  });
}

// ─── Check all / uncheck all ────────────────────────────────────
let allChecked = false;
function toggleCheckAll() {
  allChecked = !allChecked;
  document.querySelectorAll('.pick').forEach(cb => {
    cb.checked = allChecked;
    allChecked ? selected.add(cb.dataset.sym) : selected.delete(cb.dataset.sym);
  });
  $('checkAllBtn').textContent = allChecked ? t('btnUncheckAll') : t('btnCheckAll');
  updateSelectedCount();
}

// ─── Detail modal ───────────────────────────────────────────────
async function openDetail(sym) {
  const market = getMarket(), horizon = getHorizon();
  $('modal').classList.remove('hidden');
  $('mSymbol').textContent = sym;
  $('mName').textContent = '';
  $('detail').innerHTML = '<div class="spinner"></div>';
  lastDetailPayload = null;

  try {
    const r = await fetch(`/api/ticker/${encodeURIComponent(sym)}?market=${market}&horizon_days=${horizon}`);
    if (!r.ok) {
      const msg = await parseErr(r);
      $('detail').innerHTML = `<div class="err-state">${msg}</div>`;
      showToast(msg);
      return;
    }
    const j    = await r.json();
    const q    = j.quote   || {};
    const s    = j.stats   || {};
    const lv   = j.levels  || {};
    const plan = j.trade_plan_like || {};
    const news = j.news    || [];
    const sec  = j.sec_filings_last_7d || [];
    const ex   = j.extras  || {};
    const qs   = ex.quote_summary || {};
    const opt  = ex.options       || {};
    const krFlow = ex.kr_flow || {};
    const krShort = ex.kr_short || {};
    lastDetailPayload = j;

    $('mName').textContent = j.name || '';

    let spread = '—';
    if (q.bid && q.ask && q.bid > 0) {
      const pct = (q.ask / q.bid - 1) * 100;
      spread = `${fmt(q.bid, 2)} / ${fmt(q.ask, 2)} <span style="color:var(--muted)">(${fmt(pct, 3)}%)</span>`;
    }

    const newsHtml = news.length
      ? news.map(n => `
        <div class="news-item">
          <div class="news-title">${n.title || '—'}</div>
          <div class="news-meta">${n.published || '—'} · <a href="${n.link || '#'}" target="_blank" rel="noreferrer">→</a></div>
        </div>`).join('')
      : `<div style="color:var(--muted);font-size:13px">${t('noRss')}</div>`;

    const secHtml = sec.length
      ? sec.slice(0, 6).map(x => `
        <div class="sec-row"><code>${x.form || '—'}</code><span style="color:var(--muted)">${x.filingDate || '—'}</span></div>`).join('')
      : `<div style="color:var(--muted);font-size:13px">${t('noSec')}</div>`;

    // Extras
    const hasShort = qs.short_percent_of_float != null || qs.short_ratio != null;
    const hasOpt   = opt.call_volume || opt.put_volume;
    const hasE     = qs.earnings_dates?.length;
    let extrasHtml = '';
    if (hasShort || hasOpt || hasE) {
      extrasHtml = `<div class="sec-hdr">${t('secExtras')}</div>`;
      if (hasShort) {
        extrasHtml += kvRow(t('dlShortFloat'), fmt(qs.short_percent_of_float, 4));
        extrasHtml += kvRow(t('dlShortRatio'), fmt(qs.short_ratio, 2));
      }
      if (hasE) extrasHtml += `<div style="font-size:12px;color:var(--muted);margin:6px 0">${t('dlEarnings')}: ${qs.earnings_dates.slice(0, 2).join(', ')}</div>`;
      if (hasOpt) {
        extrasHtml += kvRow(t('dlOptVol'), `${fmtInt(opt.call_volume)} / ${fmtInt(opt.put_volume)}`);
        extrasHtml += kvRow(t('dlCallPut'), opt.call_put_vol_ratio ? fmt(opt.call_put_vol_ratio, 2) : '—');
        if (opt.expiration) extrasHtml += `<div style="font-size:12px;color:var(--muted);margin:6px 0">${t('dlExpiry')}: ${opt.expiration}</div>`;
      }
    }

    let krFlowHtml = '';
    const flow1d = krFlow.lookbacks?.['1d'] || {};
    const flow5d = krFlow.lookbacks?.['5d'] || {};
    const flow20d = krFlow.lookbacks?.['20d'] || {};
    const short1d = krShort.lookbacks?.['1d'] || {};
    const short5d = krShort.lookbacks?.['5d'] || {};
    const short20d = krShort.lookbacks?.['20d'] || {};
    const shortLatest = krShort.latest || {};
    const shortBalance = krShort.latest_balance || {};
    if (j.market === 'KR' && (Object.keys(krFlow).length || Object.keys(krShort).length)) {
      krFlowHtml = `<div class="sec-hdr">${t('secKrFlow')}</div>`;
      if (Object.keys(krFlow).length) {
        krFlowHtml += kvRow(
          `${t('dlKrFlow')} · ${t('dlKrForeign')}`,
          `1D ${fmtInt(flow1d.foreign_net_volume)} / 5D ${fmtInt(flow5d.foreign_net_volume)} / 20D ${fmtInt(flow20d.foreign_net_volume)}`
        );
        krFlowHtml += kvRow(
          `${t('dlKrFlow')} · ${t('dlKrInstitution')}`,
          `1D ${fmtInt(flow1d.institution_net_volume)} / 5D ${fmtInt(flow5d.institution_net_volume)} / 20D ${fmtInt(flow20d.institution_net_volume)}`
        );
        krFlowHtml += kvRow(`${t('dlKrFlow')} · ${t('dlKrPersonal')}`, '확인 불가');
      }
      if (Object.keys(krShort).length) {
        krFlowHtml += kvRow(
          t('dlKrShort'),
          `1D ${fmtInt(short1d.short_volume)} / 5D ${fmtInt(short5d.short_volume)} / 20D ${fmtInt(short20d.short_volume)}`
        );
        krFlowHtml += kvRow(
          `${t('dlKrShort')} ${t('dlKrRatio')}`,
          `${fmt(shortLatest.short_volume_ratio_pct, 4)}% / ${fmt(shortLatest.short_value_ratio_pct, 4)}%`
        );
        krFlowHtml += kvRow(
          `${t('dlKrShort')} ${t('dlKrBalance')}`,
          `${fmtInt(shortBalance.net_short_balance_qty)} / ${fmtInt(shortBalance.net_short_balance_value)}${shortBalance.date ? ` (${shortBalance.date})` : ''}`
        );
      }
    }

    const structuredData = {
      meta: {
        asof_et: j.asof_et,
        asof_kst: j.asof_kst,
        market: j.market,
        session: j.session,
        horizon_days: j.horizon_days,
        symbol: j.symbol,
        name: j.name,
        currency: j.currency,
      },
      quote: q,
      stats: s,
      levels: lv,
      trade_plan_ref: plan,
      news,
      sec_filings_last_7d: sec,
      extras: {
        quote_summary: qs,
        options: opt,
        kr_flow: krFlow,
        kr_short: krShort,
      },
    };
    const structuredHtml = escapeHtml(JSON.stringify(structuredData, null, 2));

    $('detail').innerHTML = `
      <div style="font-size:11px;color:var(--muted);margin-bottom:10px">
        ${j.asof_kst || j.asof_et} · ${j.market} · ${j.horizon_days}D · ${j.session} · ${q.market_state || '—'}
      </div>
      <div class="sec-hdr">${t('secQuote')}</div>
      ${kvRow(t('dlLast'),    fmt(q.last, 2))}
      ${kvRow(t('dlDayPct'),  fmtPct(q.day_chg_pct))}
      ${kvRow(t('dlVolume'),  fmtInt(q.day_volume))}
      ${kvRow(t('dlRelVol'),  s.rel_vol_20d ? `${fmt(s.rel_vol_20d, 2)}×` : '—')}
      ${kvRow(t('dlReturns'), `${fmt(s.ret_3d_pct, 2)}% / ${fmt(s.ret_5d_pct, 2)}% / ${fmt(s.ret_20d_pct, 2)}%`)}
      ${kvRow(t('dlHorizon'), s.ret_horizon_pct != null ? `${fmt(s.ret_horizon_pct, 2)}%` : '—')}
      ${kvRow(t('dlAtr'),     fmt(s.atr14, 2))}
      ${kvRow(t('dlBidAsk'),  spread)}

      <div class="sec-hdr">${t('secLevels')}</div>
      ${kvRow(t('dlResist'),  fmt(lv.resistance_20d, 2))}
      ${kvRow(t('dlSupport'), fmt(lv.support_20d, 2))}
      ${kvRow(t('dlDayHL'),   `${fmt(lv.day_high, 2)} / ${fmt(lv.day_low, 2)}`)}

      <div class="sec-hdr">${t('secPlan')}</div>
      <div class="plan-box">
        <div class="plan-row">
          <span class="pk">${t('dlEntry')}</span>
          <span class="pv">${plan.entry_trigger ? t('entryAbove', fmt(plan.entry_trigger, 2)) : '—'}</span>
        </div>
        <div class="plan-row">
          <span class="pk">${t('dlStop')}</span>
          <span class="pv" style="color:var(--danger)">${fmt(plan.stop, 2)}</span>
        </div>
        <div class="plan-row">
          <span class="pk">${t('dlTarget')}</span>
          <span class="pv" style="color:var(--good)">${fmt(plan.target, 2)}</span>
        </div>
        <div class="plan-note">${t('dlHoldMax')}: ${t('holdDays', plan.hold_days_max || j.horizon_days)}</div>
      </div>
      ${extrasHtml}
      ${krFlowHtml}
      <div class="sec-hdr">${t('secNews')}</div>
      ${newsHtml}
      <div class="sec-hdr">${t('secSec')}</div>
      ${secHtml}
      <div class="sec-hdr">${t('secStructured')}</div>
      <pre class="json-box">${structuredHtml}</pre>
      <div class="disclaimer2">${t('disclaimer2')}</div>
    `;
  } catch (e) {
    const msg = e.name === 'TypeError' ? t('errNetwork') : `${t('errUnknown')}: ${e.message}`;
    $('detail').innerHTML = `<div class="err-state">${msg}</div>`;
    showToast(msg);
  }
}

function closeModal() { $('modal').classList.add('hidden'); }

// ─── Copy single ticker outputs ─────────────────────────────────
async function copySingleData() {
  if (!lastDetailPayload) return;
  const text = JSON.stringify(lastDetailPayload, null, 2);
  try {
    await navigator.clipboard.writeText(text);
    showToast(t('copied'), 'ok');
  } catch {
    window.prompt('Copy:', text);
  }
}

async function copySinglePrompt() {
  const sym = $('mSymbol').textContent.trim();
  if (!sym) return;
  const market = getMarket(), horizon = getHorizon();
  try {
    const params = new URLSearchParams({
      market,
      horizon_days: String(horizon),
      ...getScanContext(),
    });
    const r = await fetch(`/prompt/${encodeURIComponent(sym)}?${params}`);
    if (!r.ok) { showToast(await parseErr(r)); return; }
    const text = await r.text();
    await navigator.clipboard.writeText(text);
    showToast(t('promptDone'), 'ok');
  } catch (e) {
    showToast(e.name === 'TypeError' ? t('errNetwork') : e.message);
  }
}

// ─── Batch report ────────────────────────────────────────────────
async function generateReport(symbolList) {
  if (!symbolList?.length) return;
  const market = getMarket(), horizon = getHorizon();
  switchPanel('panelList');
  $('reportMeta').textContent = t('loadingRep', symbolList.length);
  setReportLoading('reportSelBtn', true);

  try {
    const scanCtx = getScanContext();
    const params = new URLSearchParams({
      symbols: symbolList.join(','), market,
      horizon_days: String(horizon),
      max_items: String(Math.min(10, symbolList.length)),
      ...scanCtx,
    });
    const r = await fetch(`/report_multi_data?${params}`);
    if (!r.ok) {
      const msg = await parseErr(r);
      $('reportMeta').textContent = msg;
      showToast(msg);
      return;
    }
    const j = await r.json();
    $('reportBox').value = JSON.stringify(j, null, 2);
    $('reportMeta').textContent = t('reportReady', market, horizon, symbolList.length);
    showToast(t('reportDone'), 'ok');
    updateReportActionState();
    $('aiReportAnchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (e) {
    const msg = e.name === 'TypeError' ? t('errNetwork') : e.message;
    $('reportMeta').textContent = msg;
    showToast(msg);
  } finally {
    setReportLoading('reportSelBtn', false);
  }
}
async function reportSelected() {
  const syms = Array.from(selected);
  if (!syms.length) { showToast(t('noSelected'), 'warn'); return; }
  await generateReport(syms);
}
async function copyPromptSelected() {
  const syms = Array.from(selected);
  if (!syms.length) { showToast(t('noSelected'), 'warn'); return; }
  const market = getMarket(), horizon = getHorizon();
  $('reportMeta').textContent = t('loadingPrompt', syms.length);
  setReportLoading('promptSelBtn', true);
  try {
    const scanCtx = getScanContext();
    const params = new URLSearchParams({
      symbols: syms.join(','), market,
      horizon_days: String(horizon),
      max_items: String(Math.min(10, syms.length)),
      ...scanCtx,
    });
    const r = await fetch(`/prompt_multi?${params}`);
    if (!r.ok) {
      const msg = await parseErr(r);
      $('reportMeta').textContent = msg;
      showToast(msg);
      return;
    }
    const text = await r.text();
    $('reportBox').value = text;
    $('reportMeta').textContent = t('promptReady', market, horizon, syms.length);
    try {
      await navigator.clipboard.writeText(text);
      showToast(t('promptDone'), 'ok');
    } catch {
      window.prompt('Copy:', text);
    }
    updateReportActionState();
    $('aiReportAnchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (e) {
    const msg = e.name === 'TypeError' ? t('errNetwork') : e.message;
    $('reportMeta').textContent = msg;
    showToast(msg);
  } finally {
    setReportLoading('promptSelBtn', false);
  }
}
async function copyAll() {
  const text = $('reportBox').value || '';
  if (!text.trim()) { showToast(t('reportEmpty'), 'warn'); return; }
  try {
    await navigator.clipboard.writeText(text);
    showToast(t('copied'), 'ok');
  } catch { window.prompt('Copy:', text); }
}
function clearReport() {
  $('reportBox').value = '';
  $('reportMeta').textContent = t('reportCleared');
  selected = new Set();
  allChecked = false;
  document.querySelectorAll('.pick').forEach(cb => { cb.checked = false; });
  $('checkAllBtn').textContent = t('btnCheckAll');
  updateSelectedCount();
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
  $('scanProfile').addEventListener('change', applyScanProfilePreset);
  $('liquidityLevel').addEventListener('change', applyScanProfilePreset);
  updateMarketUI(false);

  // Symbols override → dim screener
  $('symbols').addEventListener('input', () => { updateSymbolsUI(); refreshPlanSummary(); });
  $('scrPreset').addEventListener('change', updateScreenerPresetUI);
  $('maxPrice').addEventListener('input', refreshPlanSummary);
  $('minTurnover').addEventListener('input', refreshPlanSummary);
  $('horizon').addEventListener('change', refreshPlanSummary);
  updateScreenerPresetUI();
  refreshPlanSummary();

  // Toggle buttons
  $('toggleAdvancedBtn').addEventListener('click', toggleAdvanced);

  // Top menu
  document.querySelectorAll('.menu-btn').forEach(btn => {
    btn.addEventListener('click', () => switchPanel(btn.dataset.panel));
  });

  // Scan
  $('scanBtn').addEventListener('click', scan);
  $('refreshBtn').addEventListener('click', async () => { await health(); await scan(); });

  // Check all
  $('checkAllBtn').addEventListener('click', toggleCheckAll);

  // Batch report
  $('reportSelBtn').addEventListener('click', reportSelected);
  $('promptSelBtn').addEventListener('click', copyPromptSelected);
  $('copyAllBtn').addEventListener('click', copyAll);
  $('clearBtn').addEventListener('click', clearReport);

  updateToggleButtons();
  updateReportActionState();

  // Modal
  $('closeBtn').addEventListener('click', closeModal);
  $('modal').addEventListener('click', e => { if (e.target === $('modal')) closeModal(); });
  $('dataCopyBtn').addEventListener('click', copySingleData);
  $('copyBtn').addEventListener('click', copySinglePrompt);

  // Go
  switchPanel(activePanel);
  try { await health(); } catch {}
  setStatus('');
});
