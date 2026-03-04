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
    opt5d:         '5D (default)',
    opt20d:        '20D (~1 month)',
    btnScan:       'Scan',
    btnScanning:   'Scanning…',
    hBatch:        'AI copy pad (optional)',
    metaBatch:     'Screener-first: select symbols only when you want a pasted report.',
    btnReportSel:  'Generate: Selected',
    btnCopy:       'Copy',
    btnSelectText: 'Select report text',
    btnAdvancedShow: 'Show advanced filters',
    btnAdvancedHide: 'Hide advanced filters',
    btnAIPadShow:    'Open AI copy pad',
    btnAIPadHide:    'Close AI copy pad',
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
    opt5d:         '5일 (기본)',
    opt20d:        '20일 (~1개월)',
    btnScan:       '스캔',
    btnScanning:   '스캔 중…',
    hBatch:        'AI 복사용 패드 (선택)',
    metaBatch:     '스크리너 중심: 필요할 때만 선택 종목 리포트를 생성하세요.',
    btnReportSel:  '생성: 선택 종목',
    btnCopy:       '복사',
    btnSelectText: '텍스트 전체 선택',
    btnAdvancedShow: '고급 필터 열기',
    btnAdvancedHide: '고급 필터 닫기',
    btnAIPadShow:    'AI 패드 열기',
    btnAIPadHide:    'AI 패드 닫기',
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

// ─── Theme ──────────────────────────────────────────────────────
function getTheme() { return document.documentElement.dataset.theme; }
function setTheme(th) {
  document.documentElement.dataset.theme = th;
  localStorage.setItem('ms_theme', th);
  $('themeBtn').textContent = th === 'dark' ? '☀' : '☾';
}

// ─── Helpers ────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
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

function updateMarketUI(notify = true) {
  const m = getMarket();
  // Currency tag
  $('currencyTag').textContent = m === 'KR' ? '(₩)' : '($)';
  // Hide screener row for KR
  const scrRow = $('scrRow');
  if (m === 'KR') scrRow.classList.add('market-hidden');
  else            scrRow.classList.remove('market-hidden');
  // Defaults
  const mp = $('maxPrice'), mt = $('minTurnover');
  if (m === 'KR') {
    if (mp.value.trim() === '80')       { mp.value = '100000'; }
    if (mt.value.trim() === '20000000') { mt.value = '5000000000'; }
    if (notify) showToast(t('krDefaults'), 'info');
  } else {
    if (mp.value.trim() === '100000')     { mp.value = '80'; }
    if (mt.value.trim() === '5000000000') { mt.value = '20000000'; }
    if (notify) showToast(t('usDefaults'), 'info');
  }
}

function updateSymbolsUI() {
  const hasSymbols = ($('symbols').value || '').trim().length > 0;
  const scrRow = $('scrRow');
  const badge  = $('directBadge');
  if (hasSymbols && getMarket() !== 'KR') {
    scrRow.classList.add('dimmed');
    badge.classList.remove('hidden');
  } else {
    scrRow.classList.remove('dimmed');
    badge.classList.add('hidden');
  }
}

// ─── Selected count ─────────────────────────────────────────────
let lastCandidates = [];
let selected = new Set();
let advancedOpen = false;
let aiPadOpen = false;

function updateToggleButtons() {
  $('toggleAdvancedBtn').textContent = t(advancedOpen ? 'btnAdvancedHide' : 'btnAdvancedShow');
  $('toggleAIPadBtn').textContent = t(aiPadOpen ? 'btnAIPadHide' : 'btnAIPadShow');
}

function toggleAdvanced() {
  advancedOpen = !advancedOpen;
  $('advancedFiltersRow').classList.toggle('hidden', !advancedOpen);
  updateToggleButtons();
}

function toggleAIPad() {
  aiPadOpen = !aiPadOpen;
  $('aiPadBody').classList.toggle('hidden', !aiPadOpen);
  updateToggleButtons();
}

function updateSelectedCount() {
  const cnt = selected.size;
  const el = $('selCount');
  if (cnt > 0) { el.textContent = `(${cnt})`; el.classList.remove('hidden'); }
  else         { el.classList.add('hidden'); }
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
  const scrIds    = ($('scrIds').value || 'day_gainers,most_actives').trim();
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
  $('list').innerHTML = items.map((x, i) => `
    <div class="item" data-sym="${x.symbol}">
      <div class="chk"><input type="checkbox" class="pick" data-sym="${x.symbol}" aria-label="${x.symbol}"/></div>
      <div class="left">
        <div class="sym">
          <span style="font-size:11px;color:var(--muted)">#${i + 1}</span>
          ${x.symbol} ${pillPct(x.day_chg_pct)}
        </div>
        <div class="name">${(x.name || '').slice(0, 42)}${x.currency ? ` · ${x.currency}` : ''}</div>
      </div>
      <div class="cols">
        <div class="kv"><div class="k">Last</div><div class="v">${fmt(x.last, 2)}</div></div>
        <div class="kv"><div class="k">RelVol</div><div class="v">${x.rel_vol_20d ? `${fmt(x.rel_vol_20d, 2)}×` : '—'}</div></div>
        <div class="kv"><div class="k">${hl}</div><div class="v">${fmt(x.ret_horizon_pct, 2)}%</div></div>
        <div class="kv"><div class="k">Score</div><div class="v">${fmt(x.score, 1)}</div></div>
      </div>
    </div>`).join('');

  document.querySelectorAll('.item').forEach(el => {
    el.addEventListener('click', () => openDetail(el.dataset.sym));
  });
  document.querySelectorAll('.pick').forEach(cb => {
    cb.addEventListener('click', e => e.stopPropagation());
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
      <div class="sec-hdr">${t('secNews')}</div>
      ${newsHtml}
      <div class="sec-hdr">${t('secSec')}</div>
      ${secHtml}
      <div class="disclaimer2">${t('disclaimer2')}</div>
    `;
  } catch (e) {
    const msg = e.name === 'TypeError' ? t('errNetwork') : `${t('errUnknown')}: ${e.message}`;
    $('detail').innerHTML = `<div class="err-state">${msg}</div>`;
    showToast(msg);
  }
}

function closeModal() { $('modal').classList.add('hidden'); }

// ─── Copy single report ─────────────────────────────────────────
async function copySingleReport() {
  const sym = $('mSymbol').textContent.trim();
  if (!sym) return;
  const market = getMarket(), horizon = getHorizon();
  try {
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

  try {
    const params = new URLSearchParams({
      symbols: symbolList.join(','), market,
      horizon_days: String(horizon),
      max_items: String(Math.min(10, symbolList.length)),
    });
    const r = await fetch(`/report_multi?${params}`);
    if (!r.ok) {
      const msg = await parseErr(r);
      $('reportMeta').textContent = msg;
      showToast(msg);
      return;
    }
    $('reportBox').value = await r.text();
    $('reportMeta').textContent = t('reportReady', market, horizon, symbolList.length);
    showToast(t('reportDone'), 'ok');
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
function clearReport() { $('reportBox').value = ''; $('reportMeta').textContent = t('reportCleared'); }

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

  // Symbols override → dim screener
  $('symbols').addEventListener('input', updateSymbolsUI);

  // Toggle buttons
  $('toggleAdvancedBtn').addEventListener('click', toggleAdvanced);
  $('toggleAIPadBtn').addEventListener('click', toggleAIPad);

  // Scan
  $('scanBtn').addEventListener('click', scan);
  $('refreshBtn').addEventListener('click', async () => { await health(); await scan(); });

  // Check all
  $('checkAllBtn').addEventListener('click', toggleCheckAll);

  // Batch report
  $('reportSelBtn').addEventListener('click', reportSelected);
  $('copyAllBtn').addEventListener('click', copyAll);
  $('selectTextBtn').addEventListener('click', selectText);
  $('clearBtn').addEventListener('click', clearReport);

  updateToggleButtons();

  // Modal
  $('closeBtn').addEventListener('click', closeModal);
  $('modal').addEventListener('click', e => { if (e.target === $('modal')) closeModal(); });
  $('copyBtn').addEventListener('click', copySingleReport);

  // Go
  try { await health(); } catch {}
  await scan();
});
