const $ = (id) => document.getElementById(id);

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

function renderProfileGuide() {
  const profile = PROFILE_HELP[$("scanProfile")?.value || "surge"] || PROFILE_HELP.surge;
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

  const profile = PROFILE_HELP[$("scanProfile")?.value || "surge"] || PROFILE_HELP.surge;
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

function switchPanel(id) {
  activePanel = id;
  ["panelScan", "panelList"].forEach((panelId) => $(panelId)?.classList.toggle("active", panelId === id));
  document.querySelectorAll("#scoutMenu .menu-btn").forEach((node) => node.classList.toggle("active", node.dataset.panel === id));
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

function copyAll() {
  const text = $("reportBox").value || "";
  if (!text.trim()) return;
  navigator.clipboard.writeText(text)
    .then(() => showToast("현재 내용을 복사했습니다.", "ok"))
    .catch(() => window.prompt("Copy", text));
}

window.addEventListener("load", () => {
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

  $("market").addEventListener("change", () => updateMarketUI(true));
  $("intradayMarket")?.addEventListener("change", async () => {
    await loadIntradayMeta();
    if (activeMode === "intraday" && lastIntradayPayload) await loadIntradayDesk();
  });
  $("scanProfile")?.addEventListener("change", () => {
    renderProfileGuide();
    updatePlanSummary();
  });
  $("liquidityLevel")?.addEventListener("change", () => {
    syncUsLiquidityPreset(true);
    updatePlanSummary();
  });
  $("scrPreset")?.addEventListener("change", updateScreenerUi);

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
  $("menuScan").addEventListener("click", () => switchPanel("panelScan"));
  $("menuList").addEventListener("click", () => switchPanel("panelList"));
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

  applyKrPresetToInputs();
  renderProfileGuide();
  updateMarketUI(false);
  loadIntradayMeta();
  renderDecisionBanner();
  updateSelectionUi();
  switchMode(activeMode);
  switchPanel(activePanel);
});

