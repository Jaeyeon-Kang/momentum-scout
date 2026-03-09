from __future__ import annotations

import asyncio
import json
import math
import re
import statistics
from dataclasses import dataclass, field, replace
from datetime import datetime, timedelta, time
from html import unescape
from typing import Any, Dict, List, Optional, Tuple
from zoneinfo import ZoneInfo

import time as _time
import xml.etree.ElementTree as XET

import httpx
from cachetools import TTLCache
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import PlainTextResponse
from fastapi.staticfiles import StaticFiles

APP_NAME = "Momentum Scout (no-key prototype)"
UA = "MomentumScout/0.2 (contact: local-user)"
YF_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

ET = ZoneInfo("America/New_York")
KST = ZoneInfo("Asia/Seoul")

# ---- Yahoo Finance (unofficial, public endpoints) ----
YH_SCREENER_URL = "https://query2.finance.yahoo.com/v1/finance/screener/predefined/saved"
YH_TRENDING_URL = "https://query1.finance.yahoo.com/v1/finance/trending/{region}"
YH_QUOTE_URL = "https://query2.finance.yahoo.com/v7/finance/quote"
YH_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
YH_RSS_URL = "https://feeds.finance.yahoo.com/rss/2.0/headline"
YH_OPTIONS_URL = "https://query2.finance.yahoo.com/v7/finance/options/{symbol}"
YH_QUOTE_SUMMARY_URL = "https://query2.finance.yahoo.com/v10/finance/quoteSummary/{symbol}"
NAVER_STOCK_MAIN_URL = "https://finance.naver.com/item/main.naver"
NAVER_MARKET_SUM_URL = "https://finance.naver.com/sise/sise_market_sum.naver"
NAVER_FCHART_URL = "https://fchart.stock.naver.com/sise.nhn"
NAVER_FRGN_URL = "https://finance.naver.com/item/frgn.naver"
KRX_JSON_URL = "https://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd"
KRX_SRT_LOADER_URL = "https://data.krx.co.kr/comm/srt/srtLoader/index.cmd"
KRX_FINDER_AUTOCOMPLETE_BLD = "/dbms/comm/finder/finder_srtisu_autocomplete"
KRX_SHORT_OUT_BLD = "dbms/MDC_OUT/STAT/srt/MDCSTAT30001_OUT"

# ---- KR fallback universe (KOSPI/KOSDAQ blue-chips + popular mid-caps) ----
_KR_FALLBACK_SYMBOLS = [
    # KOSPI large-cap
    "005930.KS", "000660.KS", "373220.KS", "005380.KS", "006400.KS",
    "051910.KS", "035420.KS", "000270.KS", "068270.KS", "028260.KS",
    "105560.KS", "055550.KS", "035720.KS", "003670.KS", "032830.KS",
    "012330.KS", "066570.KS", "096770.KS", "003550.KS", "034730.KS",
    "010130.KS", "011200.KS", "086790.KS", "009150.KS", "017670.KS",
    "033780.KS", "018260.KS", "034020.KS", "030200.KS", "009540.KS",
    # KOSPI mid-cap / popular
    "010950.KS", "000810.KS", "015760.KS", "024110.KS", "316140.KS",
    "003490.KS", "036570.KS", "011170.KS", "090430.KS", "267250.KS",
    # KOSDAQ popular
    "247540.KQ", "196170.KQ", "068760.KQ", "091990.KQ", "035900.KQ",
    "328130.KQ", "145020.KQ", "041510.KQ", "112040.KQ", "005290.KQ",
]

# ---- SEC (official, no-key) ----
SEC_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json"
SEC_SUBMISSIONS_URL = "https://data.sec.gov/submissions/CIK{cik10}.json"

# ---- caching (avoid spamming free endpoints) ----
_cache_screeners: TTLCache = TTLCache(maxsize=32, ttl=15)               # seconds
_cache_trending: TTLCache = TTLCache(maxsize=16, ttl=20)                # seconds
_cache_quote: TTLCache = TTLCache(maxsize=96, ttl=5)                    # seconds
_cache_daily_chart: TTLCache = TTLCache(maxsize=512, ttl=60 * 5)        # 5 minutes
_cache_intraday_chart: TTLCache = TTLCache(maxsize=512, ttl=20)         # 20 seconds
_cache_rss: TTLCache = TTLCache(maxsize=1024, ttl=60)                   # 1 minute
_cache_options: TTLCache = TTLCache(maxsize=512, ttl=60)                # 1 minute
_cache_quote_summary: TTLCache = TTLCache(maxsize=512, ttl=60 * 5)      # 5 minutes
_cache_sec_tickers: TTLCache = TTLCache(maxsize=1, ttl=60 * 60 * 24)    # 1 day
_cache_sec_submissions: TTLCache = TTLCache(maxsize=512, ttl=60 * 10)   # 10 minutes
_cache_kr_names: TTLCache = TTLCache(maxsize=2048, ttl=60 * 60 * 24)    # 1 day
_cache_kr_news: TTLCache = TTLCache(maxsize=1024, ttl=60 * 10)          # 10 minutes
_cache_kr_market_page: TTLCache = TTLCache(maxsize=32, ttl=60 * 5)      # 5 minutes
_cache_kr_snapshot: TTLCache = TTLCache(maxsize=1024, ttl=30)           # 30 seconds
_cache_kr_chart: TTLCache = TTLCache(maxsize=1024, ttl=60 * 5)          # 5 minutes
_cache_kr_flow: TTLCache = TTLCache(maxsize=1024, ttl=60 * 10)          # 10 minutes
_cache_kr_short: TTLCache = TTLCache(maxsize=1024, ttl=60 * 10)         # 10 minutes
_cache_krx_full_code: TTLCache = TTLCache(maxsize=2048, ttl=60 * 60 * 24)  # 1 day

# ---- http client ----
_client: Optional[httpx.AsyncClient] = None

# ---- Yahoo Finance crumb auth ----
_yf_crumb: Optional[str] = None
_yf_crumb_ts: float = 0.0
_YF_CRUMB_TTL = 3600.0


def _now_et() -> datetime:
    return datetime.now(tz=ET)


def _now_kst() -> datetime:
    return datetime.now(tz=KST)


def _fmt_dt(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%d %H:%M:%S %Z")


def _market_session_label_us(now_et: datetime) -> str:
    """Rough US session label using standard equity times (ET)."""
    t = now_et.timetz().replace(tzinfo=None)
    pm_start = time(4, 0)
    rth_start = time(9, 30)
    rth_end = time(16, 0)
    ah_end = time(20, 0)

    if pm_start <= t < rth_start:
        return "PM"
    if rth_start <= t < rth_end:
        return "RTH"
    if rth_end <= t < ah_end:
        return "AH"
    return "Closed"


def _session_from_market_state(market_state: Optional[str], fallback_now_et: datetime) -> str:
    ms = (market_state or "").upper().strip()
    if ms in ("PRE", "PREPRE"):
        return "PM"
    if ms in ("REGULAR", "OPEN"):
        return "RTH"
    if ms in ("POST", "POSTPOST"):
        return "AH"
    if ms in ("CLOSED",):
        return "Closed"
    return _market_session_label_us(fallback_now_et)


def _market_session_label_kr(now_kst: datetime) -> str:
    if now_kst.weekday() >= 5:
        return "Closed"
    t = now_kst.timetz().replace(tzinfo=None)
    if time(8, 30) <= t < time(9, 0):
        return "PreOpen"
    if time(9, 0) <= t < time(15, 30):
        return "RTH"
    return "Closed"


def _is_korea_symbol(sym: str) -> bool:
    s = sym.upper().strip()
    return s.endswith(".KS") or s.endswith(".KQ")


def _kr_code_from_symbol(sym: str) -> Optional[str]:
    s = (sym or "").upper().strip()
    if s.endswith(".KS") or s.endswith(".KQ"):
        s = s[:-3]
    if len(s) == 6 and s.isdigit():
        return s
    return None


def _safe_pct(last: float, base: float) -> Optional[float]:
    if base == 0:
        return None
    return (last / base - 1.0) * 100.0


def _drop_none_float(values: List[Any]) -> List[float]:
    out: List[float] = []
    for x in values:
        if x is None:
            continue
        try:
            fx = float(x)
        except Exception:
            continue
        if math.isnan(fx):
            continue
        out.append(fx)
    return out


def _drop_none_int(values: List[Any]) -> List[int]:
    out: List[int] = []
    for x in values:
        if x is None:
            continue
        try:
            ix = int(x)
        except Exception:
            continue
        out.append(ix)
    return out


def _extract_ohlcv(chart_json: Dict[str, Any]) -> Tuple[List[int], List[Any], List[Any], List[Any], List[Any], List[Any]]:
    """Returns (timestamps, open, high, low, close, volume) from Yahoo chart response."""
    try:
        res0 = chart_json["chart"]["result"][0]
        ts = res0.get("timestamp") or []
        ind = (res0.get("indicators") or {}).get("quote", [{}])[0] or {}
        o = ind.get("open") or []
        h = ind.get("high") or []
        l = ind.get("low") or []
        c = ind.get("close") or []
        v = ind.get("volume") or []
        return ts, o, h, l, c, v
    except Exception:
        return [], [], [], [], [], []


def _atr14(highs: List[float], lows: List[float], closes: List[float]) -> Optional[float]:
    """Simple ATR(14) from daily series. Needs >= 15 bars."""
    if len(highs) < 15 or len(lows) < 15 or len(closes) < 15:
        return None
    trs: List[float] = []
    for i in range(1, len(closes)):
        h = highs[i]
        l = lows[i]
        pc = closes[i - 1]
        tr = max(h - l, abs(h - pc), abs(l - pc))
        trs.append(tr)
    if len(trs) < 14:
        return None
    return statistics.fmean(trs[-14:])


def _swing_levels(highs: List[float], lows: List[float]) -> Tuple[Optional[float], Optional[float]]:
    if not highs or not lows:
        return None, None
    return max(highs), min(lows)


def _compute_return_pct(closes: List[float], trading_days: int) -> Optional[float]:
    # return over N trading days: close[-1] vs close[-(N+1)]
    if trading_days <= 0:
        return None
    if len(closes) < trading_days + 1:
        return None
    try:
        return _safe_pct(closes[-1], closes[-(trading_days + 1)])
    except Exception:
        return None


@dataclass(frozen=True)
class Candidate:
    symbol: str
    name: str
    currency: Optional[str]
    last: Optional[float]
    day_chg_pct: Optional[float]
    day_volume: Optional[int]
    avg20_volume: Optional[float]
    rel_vol_20d: Optional[float]
    ret_3d_pct: Optional[float]
    ret_5d_pct: Optional[float]
    ret_20d_pct: Optional[float]
    avg_turnover_20d: Optional[float]
    score: float
    day_turnover: Optional[float] = None
    market_cap: Optional[float] = None
    extras: Dict[str, Any] = field(default_factory=dict)
    scan_reason: List[str] = field(default_factory=list)
    rejection_flags: List[str] = field(default_factory=list)
    entry_status: str = "WATCHLIST_ONLY"
    entry_reason: List[str] = field(default_factory=list)


def _score_candidate(
    day_chg_pct: Optional[float],
    rel_vol_20d: Optional[float],
    ret_3d_pct: Optional[float],
    ret_5d_pct: Optional[float],
    ret_20d_pct: Optional[float],
    avg_turnover_20d: Optional[float],
    *,
    horizon_days: int,
) -> float:
    """Aggressive momentum score for short swing. Higher = more "interesting"."""
    score = 0.0

    # Today impulse.
    if day_chg_pct is not None:
        score += max(-6.0, min(18.0, day_chg_pct)) * 1.2

    # Follow-through.
    if ret_3d_pct is not None:
        score += max(-12.0, min(30.0, ret_3d_pct)) * 1.1

    if horizon_days <= 7:
        if ret_5d_pct is not None:
            score += max(-12.0, min(35.0, ret_5d_pct)) * 1.0
    else:
        if ret_20d_pct is not None:
            score += max(-20.0, min(60.0, ret_20d_pct)) * 0.9
        if ret_5d_pct is not None:
            score += max(-12.0, min(35.0, ret_5d_pct)) * 0.4

    # Volume expansion.
    if rel_vol_20d is not None:
        score += max(0.0, min(6.0, rel_vol_20d)) * 5.5

    # Liquidity penalty.
    if avg_turnover_20d is None:
        score -= 25.0
    else:
        if avg_turnover_20d < 10_000_000:
            score -= 30.0
        elif avg_turnover_20d < 20_000_000:
            score -= 15.0
        elif avg_turnover_20d < 50_000_000:
            score += 0.0
        elif avg_turnover_20d < 150_000_000:
            score += 10.0
        else:
            score += 15.0

    return float(score)


KR_SWING_DEFAULTS: Dict[str, Any] = {
    "market_cap_min": 1_000_000_000_000.0,
    "avg20_turnover_min": 30_000_000_000.0,
    "today_turnover_min": 70_000_000_000.0,
    "rel_volume_min": 1.3,
    "ret_5d_min": 4.0,
    "ret_5d_max": 25.0,
    "close_position_min": 0.60,
    "fresh_news_hours": 72.0,
    "market_turnover_rank_max": 60,
    "largecap_min": 2_000_000_000_000.0,
    "largecap_quota": 2,
    "kr_exclude_fundlike": True,
}


def _is_kr_fundlike_name(name: str) -> bool:
    text = (name or "").strip()
    if not text:
        return False
    upper = text.upper()
    keywords = (
        "ETF",
        "ETN",
        "\ub808\ubc84\ub9ac\uc9c0",  # 레버리지
        "\uc778\ubc84\uc2a4",        # 인버스
        "\uc120\ubb3c",              # 선물
        "2X",
    )
    if any(k in upper for k in keywords):
        return True
    brands = (
        "KODEX",
        "TIGER",
        "KOSEF",
        "KBSTAR",
        "ARIRANG",
        "HANARO",
        "ACE",
        "RISE",
        "PLUS",
        "SOL",
        "TIMEFOLIO",
        "TREX",
    )
    return any(upper.startswith(prefix) for prefix in brands)


def _input_search_key(text: str) -> str:
    return re.sub(r"[^0-9A-Z\uAC00-\uD7A3]+", "", (text or "").upper())


def _split_input_tokens(raw: str) -> List[str]:
    return [x.strip() for x in re.split(r"[,;\n/]+", raw or "") if x.strip()]


async def _resolve_kr_input_text(raw: str) -> str:
    tokens = _split_input_tokens(raw)
    if not tokens:
        return ""

    universe = await fetch_kr_market_universe(pages_per_market=20)
    rows = [dict(r) for r in (universe or []) if r.get("symbol")]
    code_map: Dict[str, Dict[str, Any]] = {}
    exact_name_map: Dict[str, Dict[str, Any]] = {}
    keyed_rows: List[Tuple[str, Dict[str, Any]]] = []

    for row in rows:
        sym = str(row.get("symbol") or "").upper().strip()
        name = str(row.get("name") or "").strip()
        code = _kr_code_from_symbol(sym)
        if code:
            code_map[code] = row
        if name:
            exact_name_map[_input_search_key(name)] = row
            keyed_rows.append((_input_search_key(name), row))

    resolved: List[str] = []
    seen: set[str] = set()

    for token in tokens:
        t = token.strip()
        if not t:
            continue

        upper = t.upper()
        resolved_symbol: Optional[str] = None

        if _is_korea_symbol(upper):
            resolved_symbol = upper
        else:
            code = _kr_code_from_symbol(upper)
            if code:
                resolved_symbol = str((code_map.get(code) or {}).get("symbol") or f"{code}.KS")
            else:
                key = _input_search_key(t)
                row = exact_name_map.get(key)
                if row is None and key:
                    contains = [r for name_key, r in keyed_rows if key in name_key]
                    contains.sort(
                        key=lambda r: (
                            float(r.get("day_turnover") or 0.0),
                            float(r.get("market_cap") or 0.0),
                        ),
                        reverse=True,
                    )
                    row = contains[0] if contains else None
                if row is not None:
                    resolved_symbol = str(row.get("symbol") or "").upper().strip()

        final_symbol = resolved_symbol or upper
        if final_symbol and final_symbol not in seen:
            seen.add(final_symbol)
            resolved.append(final_symbol)

    return ",".join(resolved)


def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, float(v)))


def _avg_recent_turnover(closes: List[float], vols: List[int], n: int = 20) -> Optional[float]:
    if not closes or not vols:
        return None
    pairs = list(zip(closes, vols))
    if len(pairs) >= n:
        pairs = pairs[-n:]
    if not pairs:
        return None
    vals = [float(c) * float(v) for c, v in pairs if c is not None and v is not None]
    return statistics.fmean(vals) if vals else None


def _close_position(last: Optional[float], high: Optional[float], low: Optional[float]) -> Optional[float]:
    try:
        if last is None or high is None or low is None:
            return None
        h = float(high)
        l = float(low)
        c = float(last)
        if h <= l:
            return None
        return (c - l) / (h - l)
    except Exception:
        return None


def _parse_kr_news_timestamp(label: Optional[str]) -> Optional[datetime]:
    text = (label or "").strip()
    if not text:
        return None
    now = _now_kst()
    for fmt in ("%Y.%m.%d %H:%M", "%Y-%m-%d %H:%M", "%Y.%m.%d", "%Y-%m-%d"):
        try:
            dt = datetime.strptime(text, fmt)
            return dt.replace(tzinfo=KST)
        except Exception:
            pass
    if re.fullmatch(r"\d{2}:\d{2}", text):
        try:
            hh, mm = text.split(":")
            return now.replace(hour=int(hh), minute=int(mm), second=0, microsecond=0)
        except Exception:
            return None
    if re.fullmatch(r"\d{2}/\d{2}", text):
        try:
            mm, dd = text.split("/")
            return datetime(now.year, int(mm), int(dd), tzinfo=KST)
        except Exception:
            return None
    return None


def _signed_flow_score(
    flow_1d: Optional[Dict[str, Any]],
    flow_5d: Optional[Dict[str, Any]],
) -> float:
    flow_1d = flow_1d or {}
    flow_5d = flow_5d or {}
    foreign_1d = _to_float(flow_1d.get("foreign_net_volume"), 0.0)
    inst_1d = _to_float(flow_1d.get("institution_net_volume"), 0.0)
    foreign_5d = _to_float(flow_5d.get("foreign_net_volume"), 0.0)
    inst_5d = _to_float(flow_5d.get("institution_net_volume"), 0.0)

    flow_score = 0.0
    flow_score += _clamp(foreign_1d / 400_000.0, -10.0, 10.0)
    flow_score += _clamp(inst_1d / 250_000.0, -8.0, 8.0)
    flow_score += _clamp(foreign_5d / 1_500_000.0, -6.0, 6.0)
    flow_score += _clamp(inst_5d / 1_000_000.0, -5.0, 5.0)

    if foreign_1d < 0 and inst_1d < 0:
        flow_score -= 4.0
    if foreign_5d < 0 and inst_5d < 0:
        flow_score -= 3.0
    return flow_score


async def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            timeout=httpx.Timeout(18.0, connect=12.0),
            headers={"User-Agent": UA},
            follow_redirects=True,
        )
    return _client


_YF_HEADERS = {"User-Agent": YF_UA}


async def _refresh_crumb() -> Optional[str]:
    global _yf_crumb, _yf_crumb_ts
    client = await _get_client()
    try:
        await client.get("https://fc.yahoo.com", headers=_YF_HEADERS)
        r = await client.get("https://query1.finance.yahoo.com/v1/test/getcrumb", headers=_YF_HEADERS)
        if r.status_code == 200 and r.text.strip():
            _yf_crumb = r.text.strip()
            _yf_crumb_ts = _time.monotonic()
            return _yf_crumb
    except Exception:
        pass
    return None


async def _get_crumb() -> Optional[str]:
    if _yf_crumb and (_time.monotonic() - _yf_crumb_ts) < _YF_CRUMB_TTL:
        return _yf_crumb
    return await _refresh_crumb()


async def _fetch_json(url: str, params: Optional[Dict[str, Any]] = None) -> Any:
    client = await _get_client()
    p = dict(params or {})
    is_yf = "yahoo.com" in url
    req_headers = _YF_HEADERS if is_yf else {}
    if is_yf:
        crumb = await _get_crumb()
        if crumb:
            p["crumb"] = crumb
    r = await client.get(url, params=p, headers=req_headers)
    if r.status_code in (400, 401) and is_yf:
        crumb = await _refresh_crumb()
        if crumb:
            p["crumb"] = crumb
        r = await client.get(url, params=p, headers=req_headers)
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Upstream error {r.status_code} from {url}")
    return r.json()


async def _fetch_text(url: str, params: Optional[Dict[str, Any]] = None) -> str:
    client = await _get_client()
    req_headers = _YF_HEADERS if "yahoo.com" in url else {}
    r = await client.get(url, params=params, headers=req_headers)
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Upstream error {r.status_code} from {url}")
    return r.text


async def _fetch_naver_text(url: str, params: Optional[Dict[str, Any]] = None) -> str:
    client = await _get_client()
    r = await client.get(
        url,
        params=params,
        headers={
            "User-Agent": YF_UA,
            "Referer": "https://finance.naver.com/",
            "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8",
        },
    )
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Upstream error {r.status_code} from {url}")
    if not r.encoding:
        r.encoding = "euc-kr"
    return r.text


async def _post_json(url: str, data: Dict[str, Any], headers: Optional[Dict[str, str]] = None) -> Any:
    client = await _get_client()
    req_headers = {
        "User-Agent": YF_UA,
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
    }
    if headers:
        req_headers.update(headers)
    r = await client.post(url, data=data, headers=req_headers)
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Upstream error {r.status_code} from {url}")
    return r.json()


async def _fetch_krx_json(data: Dict[str, Any], *, referer: str) -> Any:
    return await _post_json(
        KRX_JSON_URL,
        data=data,
        headers={
            "Origin": "https://data.krx.co.kr",
            "Referer": referer,
            "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8",
        },
    )


# ---- upstream fetchers ----

async def fetch_yahoo_screener(scr_id: str, *, region: str, size: int = 25) -> List[Dict[str, Any]]:
    key = (scr_id, region, size)
    if key in _cache_screeners:
        return _cache_screeners[key]

    data = await _fetch_json(
        YH_SCREENER_URL,
        params={
            "corsDomain": "finance.yahoo.com",
            "formatted": "false",
            "lang": "en-US",
            "region": region,
            "scrIds": scr_id,
            "size": size,
        },
    )
    try:
        quotes = data["finance"]["result"][0]["quotes"]
    except Exception:
        quotes = []

    _cache_screeners[key] = quotes
    return quotes


async def fetch_yahoo_trending(*, region: str) -> List[str]:
    key = (region,)
    if key in _cache_trending:
        return _cache_trending[key]

    data = await _fetch_json(YH_TRENDING_URL.format(region=region), params={"formatted": "false"})
    syms: List[str] = []
    try:
        quotes = (data.get("finance", {}) or {}).get("result", [])
        # result[0].quotes: [{symbol: ...}, ...]
        if quotes:
            for q in quotes[0].get("quotes", []) or []:
                s = (q.get("symbol") or "").strip()
                if s:
                    syms.append(s)
    except Exception:
        syms = []

    # small cap
    syms = syms[:40]
    _cache_trending[key] = syms
    return syms


async def fetch_yahoo_quote(symbols: List[str], *, region: str) -> Dict[str, Dict[str, Any]]:
    if not symbols:
        return {}

    key = (region, tuple(sorted(symbols)))
    if key in _cache_quote:
        return _cache_quote[key]

    data = await _fetch_json(
        YH_QUOTE_URL,
        params={
            "formatted": "false",
            "lang": "en-US",
            "region": region,
            "symbols": ",".join(symbols),
        },
    )
    out: Dict[str, Dict[str, Any]] = {}
    for row in data.get("quoteResponse", {}).get("result", []) or []:
        sym = row.get("symbol")
        if sym:
            out[sym] = row

    _cache_quote[key] = out
    return out


async def fetch_yahoo_chart(symbol: str, *, range_: str, interval: str, include_prepost: bool) -> Dict[str, Any]:
    cache = _cache_intraday_chart if interval in ("1m", "2m", "5m") and range_ in ("1d", "5d") else _cache_daily_chart
    key = (symbol, range_, interval, include_prepost)
    if key in cache:
        return cache[key]

    url = YH_CHART_URL.format(symbol=symbol)
    data = await _fetch_json(
        url,
        params={
            "range": range_,
            "interval": interval,
            "includePrePost": "true" if include_prepost else "false",
            "events": "div,splits",
        },
    )
    cache[key] = data
    return data


async def fetch_yahoo_rss(symbol: str, *, region: str, limit: int = 6) -> List[Dict[str, Any]]:
    key = (symbol, region, limit)
    if key in _cache_rss:
        return _cache_rss[key]

    text = await _fetch_text(
        YH_RSS_URL,
        params={"s": symbol, "region": region, "lang": "en-US"},
    )

    items: List[Dict[str, Any]] = []
    try:
        root = XET.fromstring(text)
        channel = root.find("./channel")
        if channel is not None:
            for it in channel.findall("./item")[:limit]:
                items.append(
                    {
                        "title": (it.findtext("title") or "").strip() or None,
                        "link": (it.findtext("link") or "").strip() or None,
                        "published": (it.findtext("pubDate") or "").strip() or None,
                        "summary": (it.findtext("description") or "").strip() or None,
                    }
                )
    except Exception:
        items = []

    _cache_rss[key] = items
    return items


async def fetch_yahoo_options_summary(symbol: str) -> Dict[str, Any]:
    key = (symbol,)
    if key in _cache_options:
        return _cache_options[key]

    try:
        data = await _fetch_json(YH_OPTIONS_URL.format(symbol=symbol), params={"formatted": "false"})
    except HTTPException:
        _cache_options[key] = {}
        return {}

    out: Dict[str, Any] = {}
    try:
        res = (data.get("optionChain", {}) or {}).get("result", [])
        if not res:
            _cache_options[key] = {}
            return {}
        r0 = res[0] or {}
        options = (r0.get("options") or [])
        if not options:
            _cache_options[key] = {}
            return {}
        o0 = options[0] or {}
        calls = o0.get("calls") or []
        puts = o0.get("puts") or []

        call_vol = 0
        put_vol = 0
        for c in calls:
            v = c.get("volume")
            if v is None:
                continue
            try:
                call_vol += int(v)
            except Exception:
                pass
        for p in puts:
            v = p.get("volume")
            if v is None:
                continue
            try:
                put_vol += int(v)
            except Exception:
                pass

        out["call_volume"] = call_vol
        out["put_volume"] = put_vol
        out["put_call_vol_ratio"] = (put_vol / call_vol) if call_vol > 0 else None
        out["call_put_vol_ratio"] = (call_vol / put_vol) if put_vol > 0 else None

        exp = o0.get("expirationDate")
        if exp:
            try:
                out["expiration"] = _fmt_dt(datetime.fromtimestamp(int(exp), tz=ET))
            except Exception:
                out["expiration"] = None
    except Exception:
        out = {}

    _cache_options[key] = out
    return out


async def fetch_yahoo_quote_summary(symbol: str, *, region: str) -> Dict[str, Any]:
    modules = "price,summaryDetail,defaultKeyStatistics,calendarEvents"
    key = (symbol, region)
    if key in _cache_quote_summary:
        return _cache_quote_summary[key]

    try:
        data = await _fetch_json(
            YH_QUOTE_SUMMARY_URL.format(symbol=symbol),
            params={
                "modules": modules,
                "formatted": "false",
                "lang": "en-US",
                "region": region,
            },
        )
    except HTTPException:
        _cache_quote_summary[key] = {}
        return {}

    try:
        res = (data.get("quoteSummary", {}) or {}).get("result", [])
        if not res:
            _cache_quote_summary[key] = {}
            return {}
        r0 = res[0] or {}
    except Exception:
        _cache_quote_summary[key] = {}
        return {}

    out: Dict[str, Any] = {}

    # price
    p = r0.get("price") or {}
    out["exchange"] = p.get("exchangeName") or p.get("exchange")
    out["currency"] = p.get("currency")
    out["market_cap"] = p.get("marketCap", {}).get("raw") if isinstance(p.get("marketCap"), dict) else p.get("marketCap")

    # summaryDetail
    sd = r0.get("summaryDetail") or {}
    out["avg_vol_10d"] = (sd.get("averageVolume10days") or {}).get("raw") if isinstance(sd.get("averageVolume10days"), dict) else sd.get("averageVolume10days")
    out["avg_vol_3m"] = (sd.get("averageVolume") or {}).get("raw") if isinstance(sd.get("averageVolume"), dict) else sd.get("averageVolume")

    # defaultKeyStatistics
    ks = r0.get("defaultKeyStatistics") or {}
    def raw(v: Any) -> Any:
        return v.get("raw") if isinstance(v, dict) else v

    out["float_shares"] = raw(ks.get("floatShares"))
    out["shares_short"] = raw(ks.get("sharesShort"))
    out["short_percent_of_float"] = raw(ks.get("shortPercentOfFloat"))
    out["short_ratio"] = raw(ks.get("shortRatio"))

    # calendarEvents
    ce = r0.get("calendarEvents") or {}
    earn = (ce.get("earnings") or {})
    ed = earn.get("earningsDate")
    # earningsDate can be list of objects with raw timestamps
    earnings_dates: List[str] = []
    try:
        if isinstance(ed, list):
            for x in ed:
                ts = raw(x)
                if ts is None:
                    continue
                try:
                    earnings_dates.append(_fmt_dt(datetime.fromtimestamp(int(ts), tz=ET)))
                except Exception:
                    pass
        elif ed is not None:
            ts = raw(ed)
            if ts is not None:
                earnings_dates.append(_fmt_dt(datetime.fromtimestamp(int(ts), tz=ET)))
    except Exception:
        earnings_dates = []

    out["earnings_dates"] = earnings_dates

    _cache_quote_summary[key] = out
    return out


def _parse_naver_company_name(html: str) -> Optional[str]:
    if not html:
        return None

    title_m = re.search(r"<title>\s*(.*?)\s*</title>", html, re.IGNORECASE | re.DOTALL)
    if title_m:
        title = unescape(re.sub(r"\s+", " ", title_m.group(1))).strip()
        for suffix in (" : 네이버페이증권", " : 네이버증권"):
            if title.endswith(suffix):
                name = title[: -len(suffix)].strip()
                if name:
                    return name

    h2_m = re.search(r'<div class="wrap_company">.*?<h2>\s*<a [^>]*>(.*?)</a>', html, re.IGNORECASE | re.DOTALL)
    if h2_m:
        name = unescape(re.sub(r"\s+", " ", h2_m.group(1))).strip()
        if name:
            return name

    return None


async def fetch_kr_company_name(symbol: str) -> Optional[str]:
    sym = (symbol or "").upper().strip()
    if sym in _cache_kr_names:
        return _cache_kr_names[sym]

    code = _kr_code_from_symbol(sym)
    if not code:
        _cache_kr_names[sym] = None
        return None

    try:
        html = await _fetch_naver_text(NAVER_STOCK_MAIN_URL, params={"code": code})
        name = _parse_naver_company_name(html)
    except Exception:
        name = None

    _cache_kr_names[sym] = name
    return name


async def fetch_kr_company_names(symbols: List[str]) -> Dict[str, str]:
    out: Dict[str, str] = {}
    if not symbols:
        return out

    async def get_one(sym: str) -> Tuple[str, Optional[str]]:
        return sym, await fetch_kr_company_name(sym)

    results = await asyncio.gather(*[get_one(s) for s in symbols], return_exceptions=True)
    for item in results:
        if isinstance(item, Exception):
            continue
        sym, name = item
        if name:
            out[sym] = name
    return out


def _clean_html_text(s: str) -> str:
    text = re.sub(r"<[^>]+>", "", s or "")
    text = unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def _parse_num_str(s: Any) -> Optional[float]:
    if s is None:
        return None
    text = str(s).strip().replace(",", "")
    text = text.replace("%", "").replace("\u20a9", "").replace("\uc6d0", "")
    if text in ("", "N/A", "nan", "None", "-"):
        return None
    try:
        return float(text)
    except Exception:
        return None


def _parse_int_str(s: Any) -> Optional[int]:
    v = _parse_num_str(s)
    if v is None:
        return None
    try:
        return int(round(v))
    except Exception:
        return None


def _normalize_naver_href(href: str) -> str:
    h = (href or "").strip()
    if not h:
        return ""
    if h.startswith("//"):
        return f"https:{h}"
    if h.startswith("/"):
        return f"https://finance.naver.com{h}"
    return h


def _parse_naver_news_items(html: str, limit: int = 6) -> List[Dict[str, Any]]:
    if not html:
        return []

    block_m = re.search(
        r'<div class="section new_bbs">.*?<div class="sub_section news_section">(.*?)</div>\s*</div>',
        html,
        re.IGNORECASE | re.DOTALL,
    )
    if not block_m:
        return []

    block = block_m.group(1)
    item_matches = re.findall(
        r"<li>\s*<span class=\"txt\">(.*?)</span>\s*<em>\s*([^<]+)\s*</em>\s*</li>",
        block,
        re.IGNORECASE | re.DOTALL,
    )

    out: List[Dict[str, Any]] = []
    seen: set[str] = set()
    for inner, date_text in item_matches:
        link_m = re.search(r'<a href="([^"]+)"[^>]*>(.*?)</a>', inner, re.IGNORECASE | re.DOTALL)
        if not link_m:
            continue
        href, title_html = link_m.groups()
        title = _clean_html_text(title_html)
        link = _normalize_naver_href(href)
        date_label = _clean_html_text(date_text)
        dt = _parse_kr_news_timestamp(date_label)
        if not title or title in seen:
            continue
        seen.add(title)
        out.append(
            {
                "title": title,
                "link": link or None,
                "published": date_label or None,
                "published_kst": dt.isoformat(timespec="seconds") if dt is not None else None,
                "summary": None,
                "source": "Naver Finance",
            }
        )
        if len(out) >= limit:
            break
    return out


async def fetch_kr_naver_news(symbol: str, limit: int = 6) -> List[Dict[str, Any]]:
    sym = (symbol or "").upper().strip()
    code = _kr_code_from_symbol(sym)
    cache_key = (sym, limit)
    if cache_key in _cache_kr_news:
        return _cache_kr_news[cache_key]
    if not code:
        _cache_kr_news[cache_key] = []
        return []

    try:
        html = await _fetch_naver_text(NAVER_STOCK_MAIN_URL, params={"code": code})
        items = _parse_naver_news_items(html, limit=limit)
    except Exception:
        items = []

    _cache_kr_news[cache_key] = items
    return items


async def fetch_kr_market_sum_page(sosok: int, page: int) -> str:
    key = (sosok, page)
    if key in _cache_kr_market_page:
        return _cache_kr_market_page[key]
    html = await _fetch_naver_text(NAVER_MARKET_SUM_URL, params={"sosok": sosok, "page": page})
    _cache_kr_market_page[key] = html
    return html


def _parse_kr_market_sum_rows(html: str, *, suffix: str) -> List[Dict[str, Any]]:
    rows = re.findall(
        r'<tr\s+onMouseOver="mouseOver\(this\)"\s+onMouseOut="mouseOut\(this\)">(.*?)</tr>',
        html,
        re.IGNORECASE | re.DOTALL,
    )
    out: List[Dict[str, Any]] = []
    for row in rows:
        title_m = re.search(r'/item/main\.naver\?code=(\d+)" class="tltle">(.*?)</a>', row, re.IGNORECASE | re.DOTALL)
        if not title_m:
            continue
        code, name_html = title_m.groups()
        name = _clean_html_text(name_html)
        nums_html = re.findall(r'<td class="number">(.*?)</td>', row, re.IGNORECASE | re.DOTALL)
        nums = [_clean_html_text(x) for x in nums_html]
        if len(nums) < 8:
            continue
        last = _parse_num_str(nums[0])
        day_chg_pct = _parse_num_str(nums[2])
        day_volume = _parse_int_str(nums[7])
        if last is None or day_chg_pct is None or day_volume is None:
            continue
        out.append(
            {
                "symbol": f"{code}{suffix}",
                "code": code,
                "name": name,
                "currency": "KRW",
                "last": float(last),
                "day_chg_pct": float(day_chg_pct),
                "day_volume": int(day_volume),
                "day_turnover": float(last) * float(day_volume),
            }
        )
    return out


async def fetch_kr_market_universe(pages_per_market: int = 8) -> List[Dict[str, Any]]:
    tasks = []
    for sosok in (0, 1):
        for page in range(1, max(1, pages_per_market) + 1):
            tasks.append(fetch_kr_market_sum_page(sosok, page))

    html_pages = await asyncio.gather(*tasks, return_exceptions=True)
    out: List[Dict[str, Any]] = []
    seen: set[str] = set()
    idx = 0
    for sosok in (0, 1):
        suffix = ".KS" if sosok == 0 else ".KQ"
        for _page in range(1, max(1, pages_per_market) + 1):
            html = html_pages[idx]
            idx += 1
            if isinstance(html, Exception):
                continue
            for row in _parse_kr_market_sum_rows(str(html), suffix=suffix):
                sym = row["symbol"]
                if sym in seen:
                    continue
                seen.add(sym)
                out.append(row)
    return out


async def fetch_kr_daily_history(symbol: str, count: int = 130) -> List[Dict[str, Any]]:
    sym = (symbol or "").upper().strip()
    cache_key = (sym, count)
    if cache_key in _cache_kr_chart:
        return _cache_kr_chart[cache_key]

    code = _kr_code_from_symbol(sym)
    if not code:
        _cache_kr_chart[cache_key] = []
        return []

    text = await _fetch_naver_text(
        NAVER_FCHART_URL,
        params={"symbol": code, "timeframe": "day", "count": count, "requestType": "0"},
    )
    items = re.findall(r'<item data="(\d{8})\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^"]+)"\s*/>', text)
    out: List[Dict[str, Any]] = []
    for date_s, open_s, high_s, low_s, close_s, vol_s in items:
        try:
            out.append(
                {
                    "date": date_s,
                    "open": float(open_s.replace(",", "")),
                    "high": float(high_s.replace(",", "")),
                    "low": float(low_s.replace(",", "")),
                    "close": float(close_s.replace(",", "")),
                    "volume": int(float(vol_s.replace(",", ""))),
                }
            )
        except Exception:
            continue
    _cache_kr_chart[cache_key] = out
    return out


def _extract_blind_value(block: str, label: str) -> Optional[str]:
    m = re.search(
        rf'<span class="sptxt [^"]*">{re.escape(label)}</span>\s*<em>.*?<span class="blind">([^<]+)</span>',
        block,
        re.IGNORECASE | re.DOTALL,
    )
    return _clean_html_text(m.group(1)) if m else None


async def fetch_kr_snapshot(symbol: str) -> Dict[str, Any]:
    sym = (symbol or "").upper().strip()
    if sym in _cache_kr_snapshot:
        return _cache_kr_snapshot[sym]

    code = _kr_code_from_symbol(sym)
    if not code:
        _cache_kr_snapshot[sym] = {}
        return {}

    html = await _fetch_naver_text(NAVER_STOCK_MAIN_URL, params={"code": code})
    block_m = re.search(
        r'<div class="rate_info" id="rate_info_krx".*?>(.*?)</table>',
        html,
        re.IGNORECASE | re.DOTALL,
    )
    if not block_m:
        _cache_kr_snapshot[sym] = {}
        return {}
    block = block_m.group(1)

    name = await fetch_kr_company_name(sym)

    current_m = re.search(r'<p class="no_today">.*?<span class="blind">([^<]+)</span>', block, re.IGNORECASE | re.DOTALL)
    exday_m = re.search(r'<p class="no_exday">(.*?)</p>', block, re.IGNORECASE | re.DOTALL)
    current = _parse_num_str(_clean_html_text(current_m.group(1))) if current_m else None

    diff_val = None
    day_chg_pct = None
    diff_sign = 1.0
    if exday_m:
        exday = exday_m.group(1)
        blinds = re.findall(r'<span class="blind">([^<]+)</span>', exday, re.IGNORECASE | re.DOTALL)
        if 'ico down' in exday:
            diff_sign = -1.0
        elif 'ico up' in exday:
            diff_sign = 1.0
        if len(blinds) >= 1:
            dv = _parse_num_str(_clean_html_text(blinds[0]))
            diff_val = (dv * diff_sign) if dv is not None else None
        if len(blinds) >= 2:
            pv = _parse_num_str(_clean_html_text(blinds[1]))
            day_chg_pct = (pv * diff_sign) if pv is not None else None

    prev_close = _parse_num_str(_extract_blind_value(block, "\uc804\uc77c"))
    open_ = _parse_num_str(_extract_blind_value(block, "\uc2dc\uac00"))
    high = _parse_num_str(_extract_blind_value(block, "\uace0\uac00"))
    low = _parse_num_str(_extract_blind_value(block, "\uc800\uac00"))
    volume = _parse_int_str(_extract_blind_value(block, "\uac70\ub798\ub7c9"))
    turnover_million = _parse_num_str(_extract_blind_value(block, "\uac70\ub798\ub300\uae08"))
    turnover = (turnover_million * 1_000_000.0) if turnover_million is not None else None

    if prev_close is None and current is not None and diff_val is not None:
        prev_close = current - diff_val

    listed_shares_m = re.search(
        r"<th scope=\"row\">상장주식수</th>\s*<td><em>([^<]+)</em></td>",
        html,
        re.IGNORECASE | re.DOTALL,
    )
    market_cap_m = re.search(
        r"<em id=\"_market_sum\">\s*([^<]+?)\s*</em>",
        html,
        re.IGNORECASE | re.DOTALL,
    )
    listed_shares = _parse_int_str(_clean_html_text(listed_shares_m.group(1))) if listed_shares_m else None
    market_cap_eok = _parse_num_str(_clean_html_text(market_cap_m.group(1))) if market_cap_m else None
    market_cap = (market_cap_eok * 100_000_000.0) if market_cap_eok is not None else None
    if market_cap is None and current is not None and listed_shares is not None:
        try:
            market_cap = float(current) * float(listed_shares)
        except Exception:
            market_cap = None

    out = {
        "symbol": sym,
        "name": name,
        "currency": "KRW",
        "last": current,
        "prev_close": prev_close,
        "day_chg_pct": day_chg_pct,
        "day_volume": volume,
        "day_turnover": turnover,
        "open": open_,
        "high": high,
        "low": low,
        "bid": None,
        "ask": None,
        "listed_shares": listed_shares,
        "market_cap": market_cap,
        "market_state": _market_session_label_kr(_now_kst()),
    }
    _cache_kr_snapshot[sym] = out
    return out


def _sum_recent(items: List[Optional[int]], n: int) -> Optional[int]:
    vals = [int(x) for x in items[:n] if x is not None]
    return sum(vals) if vals else None


def _parse_kr_flow_rows(html: str) -> List[Dict[str, Any]]:
    table_m = re.search(
        r'<table[^>]+summary="외국인 기관 순매매 거래량에 관한 표이며 날짜별로 정보를 제공합니다."[^>]*>(.*?)</table>',
        html,
        re.IGNORECASE | re.DOTALL,
    )
    if not table_m:
        return []

    rows_html = re.findall(r"<tr[^>]*>(.*?)</tr>", table_m.group(1), re.IGNORECASE | re.DOTALL)
    out: List[Dict[str, Any]] = []
    for row_html in rows_html:
        cols = re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", row_html, re.IGNORECASE | re.DOTALL)
        if len(cols) < 9:
            continue
        cells = [_clean_html_text(x) for x in cols]
        date_text = cells[0]
        if not re.match(r"\d{4}\.\d{2}\.\d{2}", date_text):
            continue
        out.append(
            {
                "date": date_text,
                "close": _parse_num_str(cells[1]),
                "day_change": _parse_num_str(cells[2]),
                "day_change_pct": _parse_num_str(cells[3]),
                "volume": _parse_int_str(cells[4]),
                "institution_net_volume": _parse_int_str(cells[5]),
                "foreign_net_volume": _parse_int_str(cells[6]),
                "foreign_holding_shares": _parse_int_str(cells[7]),
                "foreign_ownership_pct": _parse_num_str(cells[8]),
            }
        )
    return out


async def fetch_kr_investor_flows(symbol: str) -> Dict[str, Any]:
    sym = (symbol or "").upper().strip()
    if sym in _cache_kr_flow:
        return _cache_kr_flow[sym]

    code = _kr_code_from_symbol(sym)
    if not code:
        _cache_kr_flow[sym] = {}
        return {}

    try:
        html = await _fetch_naver_text(NAVER_FRGN_URL, params={"code": code, "page": 1})
    except Exception:
        _cache_kr_flow[sym] = {}
        return {}

    rows = _parse_kr_flow_rows(html)
    if not rows:
        _cache_kr_flow[sym] = {}
        return {}

    foreign_vals = [r.get("foreign_net_volume") for r in rows]
    institution_vals = [r.get("institution_net_volume") for r in rows]
    latest = rows[0]
    result = {
        "source": "Naver Finance / KRX close data",
        "as_of": latest.get("date"),
        "lookbacks": {
            "1d": {
                "foreign_net_volume": _sum_recent(foreign_vals, 1),
                "institution_net_volume": _sum_recent(institution_vals, 1),
                "individual_net_volume": None,
            },
            "5d": {
                "foreign_net_volume": _sum_recent(foreign_vals, 5),
                "institution_net_volume": _sum_recent(institution_vals, 5),
                "individual_net_volume": None,
            },
            "20d": {
                "foreign_net_volume": _sum_recent(foreign_vals, 20),
                "institution_net_volume": _sum_recent(institution_vals, 20),
                "individual_net_volume": None,
            },
        },
        "latest": latest,
        "rows": rows[:20],
        "note": "외국인 기관 순매매는 확인되지만 개인 순매수는 현재 확인 불가합니다.",
    }
    _cache_kr_flow[sym] = result
    return result


async def fetch_krx_full_code(symbol: str, name_hint: Optional[str] = None) -> Optional[str]:
    sym = (symbol or "").upper().strip()
    code = _kr_code_from_symbol(sym)
    if not code:
        return None
    if code in _cache_krx_full_code:
        return _cache_krx_full_code[code]

    query = (name_hint or "").strip() or code
    try:
        data = await _fetch_krx_json(
            {
                "bld": KRX_FINDER_AUTOCOMPLETE_BLD,
                "query": query,
                "mktsel": "ALL",
                "searchText": query,
            },
            referer=f"{KRX_SRT_LOADER_URL}?screenId=MDCSTAT300&isuCd={code}",
        )
    except Exception:
        return None

    for item in (data.get("block1") or []):
        short_code = str(item.get("tp") or "").strip()
        full_code = str(item.get("cd") or "").strip()
        if short_code == code and full_code:
            _cache_krx_full_code[code] = full_code
            return full_code
    return None


async def fetch_kr_short_data(symbol: str, *, name_hint: Optional[str] = None) -> Dict[str, Any]:
    sym = (symbol or "").upper().strip()
    if sym in _cache_kr_short:
        return _cache_kr_short[sym]

    code = _kr_code_from_symbol(sym)
    if not code:
        _cache_kr_short[sym] = {}
        return {}

    full_code = await fetch_krx_full_code(sym, name_hint=name_hint)
    if not full_code:
        _cache_kr_short[sym] = {}
        return {}

    end_dd = _now_kst().strftime("%Y%m%d")
    strt_dd = (_now_kst() - timedelta(days=45)).strftime("%Y%m%d")
    try:
        data = await _fetch_krx_json(
            {
                "bld": KRX_SHORT_OUT_BLD,
                "locale": "ko_KR",
                "isuCd": full_code,
                "strtDd": strt_dd,
                "endDd": end_dd,
                "share": "1",
                "money": "1",
            },
            referer=f"{KRX_SRT_LOADER_URL}?screenId=MDCSTAT300&isuCd={code}",
        )
    except Exception:
        _cache_kr_short[sym] = {}
        return {}

    rows: List[Dict[str, Any]] = []
    for row in (data.get("OutBlock_1") or []):
        rows.append(
            {
                "date": str(row.get("TRD_DD") or "").replace("/", "-"),
                "short_volume": _parse_int_str(row.get("CVSRTSELL_TRDVOL")),
                "short_value": _parse_int_str(row.get("CVSRTSELL_TRDVAL")),
                "net_short_balance_qty": _parse_int_str(row.get("STR_CONST_VAL1")),
                "net_short_balance_value": _parse_int_str(row.get("STR_CONST_VAL2")),
                "uptick_applied_volume": _parse_int_str(row.get("UPTICKRULE_APPL_TRDVOL")),
                "uptick_exempt_volume": _parse_int_str(row.get("UPTICKRULE_EXCPT_TRDVOL")),
            }
        )

    if not rows:
        _cache_kr_short[sym] = {}
        return {}

    short_vols = [r.get("short_volume") for r in rows]
    short_vals = [r.get("short_value") for r in rows]
    latest = rows[0]
    latest_balance = next(
        (
            r for r in rows
            if r.get("net_short_balance_qty") is not None or r.get("net_short_balance_value") is not None
        ),
        {},
    )
    result = {
        "source": "KRX Data Marketplace",
        "as_of": latest.get("date"),
        "latest": latest,
        "latest_balance": latest_balance,
        "lookbacks": {
            "1d": {
                "short_volume": _sum_recent(short_vols, 1),
                "short_value": _sum_recent(short_vals, 1),
            },
            "5d": {
                "short_volume": _sum_recent(short_vols, 5),
                "short_value": _sum_recent(short_vals, 5),
            },
            "20d": {
                "short_volume": _sum_recent(short_vols, 20),
                "short_value": _sum_recent(short_vals, 20),
            },
        },
        "rows": rows[:20],
        "note": "공매도잔고는 KRX 보고 기준 T+2 지연이 반영되어 있습니다.",
    }
    _cache_kr_short[sym] = result
    return result


async def fetch_sec_ticker_map() -> Dict[str, Dict[str, Any]]:
    if "map" in _cache_sec_tickers:
        return _cache_sec_tickers["map"]

    data = await _fetch_json(SEC_TICKERS_URL)
    out: Dict[str, Dict[str, Any]] = {}
    for _k, row in (data or {}).items():
        ticker = (row.get("ticker") or "").upper().strip()
        if ticker:
            out[ticker] = row

    _cache_sec_tickers["map"] = out
    return out


async def fetch_sec_recent_filings(symbol: str, *, days: int = 7, limit: int = 10) -> List[Dict[str, Any]]:
    symbol = symbol.upper().strip()
    # skip obvious non-US suffixes to avoid useless SEC map fetch
    if _is_korea_symbol(symbol):
        return []

    cache_key = (symbol, days, limit)
    if cache_key in _cache_sec_submissions:
        return _cache_sec_submissions[cache_key]

    ticker_map = await fetch_sec_ticker_map()
    row = ticker_map.get(symbol)
    if not row:
        _cache_sec_submissions[cache_key] = []
        return []

    cik = int(row.get("cik_str"))
    cik10 = str(cik).zfill(10)
    sub = await _fetch_json(SEC_SUBMISSIONS_URL.format(cik10=cik10))

    filings = (sub.get("filings", {}) or {}).get("recent", {}) or {}
    forms = filings.get("form", []) or []
    accession = filings.get("accessionNumber", []) or []
    filing_date = filings.get("filingDate", []) or []
    report_date = filings.get("reportDate", []) or []
    primary_doc = filings.get("primaryDocument", []) or []

    today = _now_et().date()
    cutoff = today - timedelta(days=days)

    out: List[Dict[str, Any]] = []
    for i in range(min(len(forms), len(filing_date))):
        try:
            fd = datetime.strptime(filing_date[i], "%Y-%m-%d").date()
        except Exception:
            continue
        if fd < cutoff:
            continue
        out.append(
            {
                "form": forms[i],
                "filingDate": filing_date[i],
                "reportDate": report_date[i] if i < len(report_date) else None,
                "accessionNumber": accession[i] if i < len(accession) else None,
                "primaryDocument": primary_doc[i] if i < len(primary_doc) else None,
            }
        )
        if len(out) >= limit:
            break

    _cache_sec_submissions[cache_key] = out
    return out


# ---- app ----

app = FastAPI(title=APP_NAME)


@app.get("/api/health")
async def health() -> Dict[str, Any]:
    now_et = _now_et()
    return {
        "ok": True,
        "now_et": _fmt_dt(now_et),
        "now_kst": _fmt_dt(_now_kst()),
        "session_us": _market_session_label_us(now_et),
        "supported_markets": ["US", "KR"],
        "horizons": [5, 20],
        "data_sources": [
            "Yahoo Finance chart/quote/screener/trending/options/quoteSummary (unofficial endpoints)",
            "Naver Finance market summary/item page/fchart (KR scan/detail/news/name)",
            "SEC data.sec.gov (official, no-key)",
            "Yahoo Finance RSS (public)",
        ],
        "note": "Educational prototype. No API keys. Data best-effort and may be delayed/incomplete.",
    }


@app.get("/api/candidates")
async def candidates(
    market: str = Query(default="US", description="Market universe: US or KR"),
    horizon_days: int = Query(default=5, ge=3, le=60, description="Trading-day horizon. UI offers 5 or 20."),
    scr_ids: str = Query(default="day_gainers,most_actives", description="(US) comma-separated Yahoo predefined screener IDs"),
    symbols: str = Query(default="", description="Optional: override universe with explicit comma-separated symbols"),
    size_per_screener: int = Query(default=25, ge=5, le=50),
    max_price: float = Query(default=80.0, ge=0.0, le=1_000_000.0),
    min_avg_turnover: float = Query(default=20_000_000.0, ge=0.0, description="20d average turnover filter (price*volume, local currency)"),
    market_cap_min: float = Query(default=0.0, ge=0.0),
    today_turnover_min: float = Query(default=0.0, ge=0.0),
    rel_volume_min: float = Query(default=0.0, ge=0.0),
    ret_5d_min: float = Query(default=-100.0, ge=-100.0, le=500.0),
    ret_5d_max: float = Query(default=500.0, ge=-100.0, le=500.0),
    close_position_min: float = Query(default=0.0, ge=0.0, le=1.0),
    fresh_news_hours: float = Query(default=0.0, ge=0.0, le=240.0),
    market_turnover_rank_max: int = Query(default=0, ge=0, le=500),
    largecap_min: float = Query(default=0.0, ge=0.0),
    largecap_quota: int = Query(default=0, ge=0, le=10),
    kr_exclude_fundlike: bool = Query(default=True),
    direct_mode: bool = Query(default=False, description="When true with symbols, bypass hard filters and include symbols directly."),
    us_market_cap_min: float = Query(default=2_000_000_000.0, ge=0.0),
    us_day_turnover_min: float = Query(default=25_000_000.0, ge=0.0),
    us_rel_volume_min: float = Query(default=1.2, ge=0.0),
    us_exclude_etf: bool = Query(default=True),
    held_symbols: str = Query(default="", description="Optional held symbols for HOLD/TRIM/EXIT review"),
    top_n: int = Query(default=10, ge=1, le=25),
) -> Dict[str, Any]:
    """Returns momentum candidates for short swing (5 trading days default). No keys."""

    market_u = market.upper().strip()
    if market_u not in ("US", "KR"):
        raise HTTPException(status_code=400, detail="market must be US or KR")
    if market_u == "KR":
        if (symbols or "").strip():
            symbols = await _resolve_kr_input_text(symbols)
        if (held_symbols or "").strip():
            held_symbols = await _resolve_kr_input_text(held_symbols)

    # keep horizons sane; UI offers 5 and 20, but backend tolerates a bit more.
    if horizon_days not in (5, 20):
        # don't be clever here; just clamp to nearest supported.
        horizon_days = 5 if horizon_days < 12 else 20

    region = market_u

    # Universe source:
    explicit = [s.strip() for s in (symbols or "").split(",") if s.strip()]

    universe: List[str] = []
    universe_source = ""
    kr_seed_map: Dict[str, Dict[str, Any]] = {}
    kr_turnover_rank_map: Dict[str, int] = {}
    scan_defaults: Dict[str, Any] = {}
    us_defaults: Dict[str, Any] = {
        "market_cap_min": float(us_market_cap_min),
        "day_turnover_min": float(us_day_turnover_min),
        "rel_volume_min": float(us_rel_volume_min),
        "exclude_etf": bool(us_exclude_etf),
    }
    direct_override = bool(direct_mode and bool(explicit))

    if market_u == "KR":
        scan_defaults = {
            "market_cap_min": market_cap_min or KR_SWING_DEFAULTS["market_cap_min"],
            "avg20_turnover_min": min_avg_turnover if min_avg_turnover >= 1_000_000_000.0 else KR_SWING_DEFAULTS["avg20_turnover_min"],
            "today_turnover_min": today_turnover_min or KR_SWING_DEFAULTS["today_turnover_min"],
            "rel_volume_min": rel_volume_min or KR_SWING_DEFAULTS["rel_volume_min"],
            "ret_5d_min": ret_5d_min if ret_5d_min > -100.0 else KR_SWING_DEFAULTS["ret_5d_min"],
            "ret_5d_max": ret_5d_max if ret_5d_max < 500.0 else KR_SWING_DEFAULTS["ret_5d_max"],
            "close_position_min": close_position_min or KR_SWING_DEFAULTS["close_position_min"],
            "fresh_news_hours": fresh_news_hours or KR_SWING_DEFAULTS["fresh_news_hours"],
            "market_turnover_rank_max": market_turnover_rank_max or KR_SWING_DEFAULTS["market_turnover_rank_max"],
            "largecap_min": largecap_min or KR_SWING_DEFAULTS["largecap_min"],
            "largecap_quota": largecap_quota or KR_SWING_DEFAULTS["largecap_quota"],
            "kr_exclude_fundlike": bool(kr_exclude_fundlike),
        }
        min_avg_turnover = float(scan_defaults["avg20_turnover_min"])

    if explicit:
        universe = explicit
        universe_source = "symbols"
    else:
        if market_u == "US":
            scr_list = [s.strip() for s in scr_ids.split(",") if s.strip()]
            if not scr_list:
                raise HTTPException(status_code=400, detail="scr_ids required (or provide symbols)")

            tasks = [fetch_yahoo_screener(s, region=region, size=size_per_screener) for s in scr_list]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            raw_quotes: List[Dict[str, Any]] = []
            for r in results:
                if isinstance(r, Exception):
                    continue
                raw_quotes.extend(r)

            seen = set()
            for q in raw_quotes:
                sym = (q.get("symbol") or "").strip()
                if not sym or sym in seen:
                    continue
                seen.add(sym)
                universe.append(sym)

            universe_source = f"screeners:{','.join(scr_list)}"
        else:
            kr_rows = await fetch_kr_market_universe(pages_per_market=20)
            base_rows = list(kr_rows or [])
            fallback_rows = [{"symbol": sym, "bucket_tags": ["fallback_union"]} for sym in _KR_FALLBACK_SYMBOLS]
            row_map: Dict[str, Dict[str, Any]] = {}
            for row in base_rows:
                sym = str(row.get("symbol") or "")
                if not sym:
                    continue
                row_map[sym] = dict(row)
            for row in fallback_rows:
                sym = str(row.get("symbol") or "")
                if not sym:
                    continue
                if sym not in row_map:
                    row_map[sym] = dict(row)
                else:
                    row_map[sym]["bucket_tags"] = list(dict.fromkeys((row_map[sym].get("bucket_tags") or []) + ["fallback_union"]))

            ranked_turnover = sorted(
                [r for r in base_rows if r.get("symbol")],
                key=lambda r: float(r.get("day_turnover") or 0.0),
                reverse=True,
            )
            kr_turnover_rank_map = {str(r.get("symbol")): idx + 1 for idx, r in enumerate(ranked_turnover)}

            turnover_bucket = ranked_turnover[:200]
            mover_bucket = sorted(
                [r for r in base_rows if float(r.get("day_turnover") or 0.0) >= scan_defaults["today_turnover_min"]],
                key=lambda r: float(r.get("day_chg_pct") or 0.0),
                reverse=True,
            )[:140]
            base_bucket = sorted(
                [r for r in base_rows if float(r.get("day_turnover") or 0.0) >= (scan_defaults["avg20_turnover_min"] * 0.6)],
                key=lambda r: (float(r.get("day_turnover") or 0.0), float(r.get("day_chg_pct") or 0.0)),
                reverse=True,
            )[:180]

            union_rows: List[Dict[str, Any]] = []
            seen_syms: set[str] = set()
            for tag, bucket in (
                ("turnover_top", turnover_bucket),
                ("movers", mover_bucket),
                ("base", base_bucket),
                ("fallback_union", fallback_rows),
            ):
                for raw in bucket:
                    sym = str(raw.get("symbol") or "")
                    if not sym or sym in seen_syms:
                        continue
                    seen_syms.add(sym)
                    row = dict(row_map.get(sym) or raw)
                    tags = list(row.get("bucket_tags") or [])
                    tags.append(tag)
                    row["bucket_tags"] = list(dict.fromkeys(tags))
                    rank = kr_turnover_rank_map.get(sym)
                    if rank is not None:
                        row["market_turnover_rank"] = rank
                    union_rows.append(row)

            if not union_rows:
                union_rows = fallback_rows

            universe = [str(r["symbol"]) for r in union_rows if r.get("symbol")]
            kr_seed_map = {str(r["symbol"]): r for r in union_rows if r.get("symbol")}
            universe_source = "kr_market_union_with_fallback"

    # polite cap
    universe = universe[:120] if market_u == "KR" else universe[:80]

    quote_map: Dict[str, Dict[str, Any]] = {}
    if market_u == "US":
        quote_map = await fetch_yahoo_quote(universe, region=region)

    sem = asyncio.Semaphore(12)

    async def build_candidate(sym: str) -> Optional[Candidate]:
        if market_u == "KR":
            seed_q = kr_seed_map.get(sym) or {}
            snap_q = await fetch_kr_snapshot(sym)
            q = {**seed_q, **(snap_q or {})}
            name = q.get("name") or ""
            currency = "KRW"
            last = q.get("last")
            day_chg_pct = q.get("day_chg_pct")
            day_volume = q.get("day_volume")
            day_turnover = q.get("day_turnover")
            market_cap = q.get("market_cap")
            quote_type = "EQUITY"
            market_turnover_rank = q.get("market_turnover_rank")
            if market_turnover_rank is None:
                market_turnover_rank = kr_turnover_rank_map.get(sym)
            bucket_tags = list(q.get("bucket_tags") or [])
            if bool(scan_defaults.get("kr_exclude_fundlike", True)) and (not direct_override) and _is_kr_fundlike_name(name):
                return None
        else:
            q = quote_map.get(sym) or {}
            name = q.get("shortName") or q.get("longName") or ""
            currency = q.get("currency")
            last = q.get("regularMarketPrice")
            prev_close = q.get("regularMarketPreviousClose")
            day_chg_pct = None
            if last is not None and prev_close is not None:
                try:
                    day_chg_pct = _safe_pct(float(last), float(prev_close))
                except Exception:
                    day_chg_pct = None
            day_volume = q.get("regularMarketVolume")
            day_turnover = (float(last) * float(day_volume)) if last is not None and day_volume is not None else None
            market_cap = q.get("marketCap")
            quote_type = str(q.get("quoteType") or "").upper().strip()
            market_turnover_rank = None
            bucket_tags = []

        # price filter (local currency)
        try:
            if (not direct_override) and market_u != "KR" and max_price > 0 and last is not None and float(last) > float(max_price):
                return None
        except Exception:
            pass

        # daily chart for returns & avg volume
        if market_u == "KR":
            async with sem:
                daily_rows = await fetch_kr_daily_history(sym, count=80)
            closes = [float(x["close"]) for x in daily_rows if x.get("close") is not None]
            vols = [int(x["volume"]) for x in daily_rows if x.get("volume") is not None]
            latest_row = daily_rows[-1] if daily_rows else {}
            prev_row = daily_rows[-2] if len(daily_rows) >= 2 else {}
            q["open"] = q.get("open") if q.get("open") is not None else latest_row.get("open")
            q["high"] = q.get("high") if q.get("high") is not None else latest_row.get("high")
            q["low"] = q.get("low") if q.get("low") is not None else latest_row.get("low")
            q["prev_close"] = q.get("prev_close") if q.get("prev_close") is not None else prev_row.get("close")
        else:
            async with sem:
                daily = await fetch_yahoo_chart(sym, range_="3mo", interval="1d", include_prepost=False)
            _ts, _o, _h, _l, _c, _v = _extract_ohlcv(daily)
            closes = _drop_none_float(_c)
            vols = _drop_none_int(_v)

        ret_3d_pct = _compute_return_pct(closes, 3)
        ret_5d_pct = _compute_return_pct(closes, 5)
        ret_20d_pct = _compute_return_pct(closes, 20)

        avg20_volume = None
        if len(vols) >= 20:
            avg20_volume = statistics.fmean(vols[-20:])
        elif len(vols) >= 10:
            avg20_volume = statistics.fmean(vols[-10:])

        if day_volume is None and vols:
            day_volume = vols[-1]

        rel_vol_20d = None
        try:
            if day_volume is not None and avg20_volume is not None and avg20_volume > 0:
                rel_vol_20d = float(day_volume) / float(avg20_volume)
        except Exception:
            rel_vol_20d = None

        avg_turnover_20d = _avg_recent_turnover(closes, vols, 20)
        if day_turnover is None and last is not None and day_volume is not None:
            try:
                day_turnover = float(last) * float(day_volume)
            except Exception:
                day_turnover = None

        # liquidity filter
        if (not direct_override) and (avg_turnover_20d is None or avg_turnover_20d < float(min_avg_turnover)):
            return None

        extras: Dict[str, Any] = {}
        scan_reason: List[str] = []
        rejection_flags: List[str] = []

        if market_u == "KR":
            highs_20 = [float(x["high"]) for x in daily_rows[-21:-1] if x.get("high") is not None]
            highs_60 = [float(x["high"]) for x in daily_rows[-61:-1] if x.get("high") is not None]
            prev_20_high = max(highs_20) if highs_20 else None
            prev_60_high = max(highs_60) if highs_60 else None
            close_position = _close_position(last, q.get("high"), q.get("low"))
            gap_pct = None
            try:
                if q.get("open") is not None and q.get("prev_close") is not None and float(q.get("prev_close")) > 0:
                    gap_pct = _safe_pct(float(q.get("open")), float(q.get("prev_close")))
            except Exception:
                gap_pct = None
            turnover_ratio_20d = None
            try:
                if day_turnover is not None and avg_turnover_20d is not None and avg_turnover_20d > 0:
                    turnover_ratio_20d = float(day_turnover) / float(avg_turnover_20d)
            except Exception:
                turnover_ratio_20d = None

            extras = {
                "close_position": close_position,
                "gap_pct": gap_pct,
                "breakout_20d": bool(last is not None and prev_20_high is not None and float(last) > float(prev_20_high)),
                "breakout_60d": bool(last is not None and prev_60_high is not None and float(last) > float(prev_60_high)),
                "close_near_high": bool(close_position is not None and close_position >= 0.70),
                "turnover_ratio_20d": turnover_ratio_20d,
                "market_turnover_rank": int(market_turnover_rank) if market_turnover_rank is not None else None,
                "market_turnover_percentile": (
                    round((float(market_turnover_rank) / float(max(len(kr_turnover_rank_map), 1))) * 100.0, 2)
                    if market_turnover_rank is not None
                    else None
                ),
                "bucket_tags": list(bucket_tags),
            }

            if market_cap is not None and float(market_cap) >= float(scan_defaults["largecap_min"]):
                extras["bucket_tags"] = list(dict.fromkeys((extras.get("bucket_tags") or []) + ["largecap_core"]))
            if market_turnover_rank is not None and int(market_turnover_rank) <= int(scan_defaults["market_turnover_rank_max"]):
                extras["bucket_tags"] = list(dict.fromkeys((extras.get("bucket_tags") or []) + ["turnover_top"]))

            meets_market_attention = False
            if market_turnover_rank is not None and int(market_turnover_rank) <= int(scan_defaults["market_turnover_rank_max"]):
                meets_market_attention = True
            if day_turnover is not None and float(day_turnover) >= 70_000_000_000.0:
                meets_market_attention = True
            if (
                market_cap is not None
                and float(market_cap) >= float(scan_defaults["largecap_min"])
                and day_turnover is not None
                and float(day_turnover) >= 50_000_000_000.0
            ):
                meets_market_attention = True

            if market_cap is None or float(market_cap) < scan_defaults["market_cap_min"]:
                rejection_flags.append("market_cap_low")
            if day_turnover is None or float(day_turnover) < scan_defaults["today_turnover_min"]:
                rejection_flags.append("day_turnover_low")
            if rel_vol_20d is None or float(rel_vol_20d) < scan_defaults["rel_volume_min"]:
                rejection_flags.append("rel_volume_low")
            if ret_5d_pct is None or float(ret_5d_pct) < scan_defaults["ret_5d_min"]:
                rejection_flags.append("ret_5d_low")
            elif float(ret_5d_pct) > scan_defaults["ret_5d_max"]:
                rejection_flags.append("ret_5d_overheat")
            if close_position is None or float(close_position) < scan_defaults["close_position_min"]:
                rejection_flags.append("close_position_weak")
            if gap_pct is not None and gap_pct >= 12.0:
                rejection_flags.append("gap_overheat")
            if (not meets_market_attention) and (not direct_override):
                rejection_flags.append("market_attention_low")

            if day_turnover is not None and day_turnover >= scan_defaults["today_turnover_min"]:
                scan_reason.append("today turnover filter passed")
            if rel_vol_20d is not None and rel_vol_20d >= scan_defaults["rel_volume_min"]:
                scan_reason.append("relative volume filter passed")
            if extras["breakout_20d"]:
                scan_reason.append("20D breakout")
            if extras["close_near_high"]:
                scan_reason.append("close near day high")
            if market_turnover_rank is not None:
                scan_reason.append("turnover rank #" + str(int(market_turnover_rank)))
            if meets_market_attention:
                scan_reason.append("market attention qualified")
            rejection_flags = list(dict.fromkeys(rejection_flags))
            return Candidate(
                symbol=sym,
                name=name,
                currency=currency,
                last=float(last) if last is not None else None,
                day_chg_pct=float(day_chg_pct) if day_chg_pct is not None else None,
                day_volume=int(day_volume) if day_volume is not None else None,
                avg20_volume=float(avg20_volume) if avg20_volume is not None else None,
                rel_vol_20d=float(rel_vol_20d) if rel_vol_20d is not None else None,
                ret_3d_pct=float(ret_3d_pct) if ret_3d_pct is not None else None,
                ret_5d_pct=float(ret_5d_pct) if ret_5d_pct is not None else None,
                ret_20d_pct=float(ret_20d_pct) if ret_20d_pct is not None else None,
                avg_turnover_20d=float(avg_turnover_20d) if avg_turnover_20d is not None else None,
                score=0.0,
                day_turnover=float(day_turnover) if day_turnover is not None else None,
                market_cap=float(market_cap) if market_cap is not None else None,
                extras=extras,
                scan_reason=scan_reason,
                rejection_flags=rejection_flags,
            )

        if market_u == "US":
            us_flags: List[str] = []
            if us_defaults["exclude_etf"] and quote_type in {"ETF", "MUTUALFUND"}:
                us_flags.append("etf_excluded")
            if market_cap is None or float(market_cap) < us_defaults["market_cap_min"]:
                us_flags.append("market_cap_low")
            if day_turnover is None or float(day_turnover) < us_defaults["day_turnover_min"]:
                us_flags.append("day_turnover_low")
            if rel_vol_20d is None or float(rel_vol_20d) < us_defaults["rel_volume_min"]:
                us_flags.append("rel_volume_low")
            if (not direct_override) and us_flags:
                return None
            extras = {
                "us_quote_type": quote_type or None,
                "us_filter_flags": us_flags,
            }
        else:
            extras = {}

        score = _score_candidate(
            day_chg_pct,
            rel_vol_20d,
            ret_3d_pct,
            ret_5d_pct,
            ret_20d_pct,
            avg_turnover_20d,
            horizon_days=horizon_days,
        )

        if market_u == "US":
            if market_cap is not None:
                score += _clamp(float(market_cap) / 20_000_000_000.0, 0.0, 5.0) * 3.0
            if day_turnover is not None:
                score += _clamp(float(day_turnover) / 100_000_000.0, 0.0, 4.0) * 2.5
            if quote_type in {"ETF", "MUTUALFUND"}:
                score -= 12.0

        return Candidate(
            symbol=sym,
            name=name,
            currency=currency,
            last=float(last) if last is not None else None,
            day_chg_pct=float(day_chg_pct) if day_chg_pct is not None else None,
            day_volume=int(day_volume) if day_volume is not None else None,
            avg20_volume=float(avg20_volume) if avg20_volume is not None else None,
            rel_vol_20d=float(rel_vol_20d) if rel_vol_20d is not None else None,
            ret_3d_pct=float(ret_3d_pct) if ret_3d_pct is not None else None,
            ret_5d_pct=float(ret_5d_pct) if ret_5d_pct is not None else None,
            ret_20d_pct=float(ret_20d_pct) if ret_20d_pct is not None else None,
            avg_turnover_20d=float(avg_turnover_20d) if avg_turnover_20d is not None else None,
            score=float(score),
            day_turnover=float(day_turnover) if day_turnover is not None else None,
            market_cap=float(market_cap) if market_cap is not None else None,
            extras=extras,
        )

    tasks = [build_candidate(s) for s in universe]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    cands: List[Candidate] = []
    for r in results:
        if isinstance(r, Exception) or r is None:
            continue
        cands.append(r)

    if market_u == "KR":
        base_pool = cands if explicit else [c for c in cands if not c.rejection_flags]
        if not base_pool:
            base_pool = list(cands)

        general_bucket = sorted(
            base_pool,
            key=lambda c: (
                _to_float(c.day_turnover, 0.0),
                _to_float(c.ret_5d_pct, 0.0),
                _to_float(c.extras.get("turnover_ratio_20d"), 0.0),
            ),
            reverse=True,
        )
        largecap_bucket = sorted(
            [
                c
                for c in base_pool
                if c.market_cap is not None and float(c.market_cap) >= float(scan_defaults["largecap_min"])
            ],
            key=lambda c: (
                _to_float(c.day_turnover, 0.0),
                _to_float(c.ret_5d_pct, 0.0),
            ),
            reverse=True,
        )
        turnover_bucket = sorted(
            [
                c
                for c in base_pool
                if c.extras.get("market_turnover_rank") is not None
                and int(c.extras.get("market_turnover_rank")) <= int(scan_defaults["market_turnover_rank_max"])
            ],
            key=lambda c: int(c.extras.get("market_turnover_rank")),
        )
        priority_largecaps = [
            c for c in largecap_bucket if c.day_turnover is not None and float(c.day_turnover) >= 50_000_000_000.0
        ][:10]

        discovered: List[Candidate] = []
        seen_discovered: set[str] = set()
        for bucket in (priority_largecaps, general_bucket, largecap_bucket, turnover_bucket):
            for item in bucket:
                if item.symbol in seen_discovered:
                    continue
                seen_discovered.add(item.symbol)
                discovered.append(item)
        discovered = discovered[:72]

        async def enrich_kr_candidate(base: Candidate) -> Candidate:
            news_items, flow = await asyncio.gather(
                fetch_kr_naver_news(base.symbol, limit=3),
                fetch_kr_investor_flows(base.symbol),
            )
            flow_1d = (flow.get("lookbacks") or {}).get("1d") or {}
            flow_5d = (flow.get("lookbacks") or {}).get("5d") or {}
            signed_flow = _signed_flow_score(flow_1d, flow_5d)
            news_dt = None
            if news_items:
                n0 = news_items[0] or {}
                if n0.get("published_kst"):
                    try:
                        news_dt = datetime.fromisoformat(str(n0.get("published_kst")))
                    except Exception:
                        news_dt = None
                if news_dt is None:
                    news_dt = _parse_kr_news_timestamp(n0.get("published"))
            news_age_hours = None
            if news_dt is not None:
                try:
                    news_age_hours = (_now_kst() - news_dt).total_seconds() / 3600.0
                except Exception:
                    news_age_hours = None
            catalyst_freshness = 0.0
            if news_age_hours is not None:
                catalyst_freshness = _clamp(
                    (scan_defaults["fresh_news_hours"] - news_age_hours) / max(scan_defaults["fresh_news_hours"], 1.0),
                    -1.0,
                    1.0,
                ) * 12.0

            close_position = _to_float(base.extras.get("close_position"), 0.0)
            breakout_strength = 0.0
            if base.extras.get("breakout_20d"):
                breakout_strength += 12.0
            if base.extras.get("breakout_60d"):
                breakout_strength += 10.0
            breakout_strength += _clamp(close_position, 0.0, 1.0) * 10.0
            if base.extras.get("close_near_high"):
                breakout_strength += 5.0

            liquidity_accel = _clamp(_to_float(base.extras.get("turnover_ratio_20d"), 0.0), 0.0, 5.0) * 6.0
            junk_risk = 0.0
            gap_pct = _to_float(base.extras.get("gap_pct"), 0.0)
            if close_position < scan_defaults["close_position_min"]:
                junk_risk += 12.0
            if gap_pct >= 12.0:
                junk_risk += 8.0
            if base.ret_5d_pct is not None and base.ret_5d_pct > scan_defaults["ret_5d_max"]:
                junk_risk += 10.0

            conviction_score = (
                0.30 * breakout_strength
                + 0.25 * liquidity_accel
                + 0.20 * signed_flow
                + 0.15 * catalyst_freshness
                - 0.10 * junk_risk
            )

            scan_reason = list(base.scan_reason)
            rejection_flags = list(base.rejection_flags)
            if signed_flow > 0:
                scan_reason.append("5D flow positive")
            elif signed_flow < 0:
                rejection_flags.append("flow_negative")
            if news_items and news_age_hours is not None and news_age_hours <= scan_defaults["fresh_news_hours"]:
                scan_reason.append("fresh news verified")
            else:
                rejection_flags.append("news_missing")

            extras = dict(base.extras)
            extras.update(
                {
                    "news_items": news_items,
                    "news_asof": ((news_items[0] or {}).get("published_kst") or (news_items[0] or {}).get("published")) if news_items else None,
                    "flow_asof": flow.get("as_of"),
                    "signed_flow_score": round(signed_flow, 2),
                    "conviction_score": round(conviction_score, 2),
                    "catalyst_freshness": round(catalyst_freshness, 2),
                    "foreign_1d": flow_1d.get("foreign_net_volume"),
                    "foreign_5d": flow_5d.get("foreign_net_volume"),
                    "institution_1d": flow_1d.get("institution_net_volume"),
                    "institution_5d": flow_5d.get("institution_net_volume"),
                    "bucket_tags": list(dict.fromkeys(extras.get("bucket_tags") or [])),
                }
            )
            return replace(
                base,
                score=round(conviction_score, 2),
                extras=extras,
                scan_reason=scan_reason,
                rejection_flags=list(dict.fromkeys(rejection_flags)),
            )

        enriched = await asyncio.gather(*[enrich_kr_candidate(c) for c in discovered], return_exceptions=True)
        cands = [c for c in enriched if isinstance(c, Candidate)]

    cands.sort(key=lambda x: x.score, reverse=True)
    cands = cands[:top_n]

    kr_name_map: Dict[str, str] = {}
    if market_u == "KR" and cands:
        kr_name_map = {c.symbol: c.name for c in cands}

    macro_rows = await _fetch_macro_snapshot(market_u)
    market_decision = _compute_market_decision(market_u, macro_rows)
    context: Dict[str, Any] = dict(market_decision.get("macro_snapshot") or {})

    def _classify_entry(c: Candidate) -> Candidate:
        reasons = list(c.scan_reason or [])
        entry_status = "APPROVED_NEW"
        if not bool(market_decision.get("new_entries_allowed", True)):
            entry_status = "WATCHLIST_ONLY"
            reasons.append("market risk-off blocks new entries")
        else:
            watch_reasons: List[str] = []
            if market_u == "KR":
                if not (c.extras.get("news_items") or []):
                    watch_reasons.append("missing news")
                if _to_float(c.extras.get("signed_flow_score"), 0.0) <= 0:
                    watch_reasons.append("negative flow")
                close_pos = c.extras.get("close_position")
                if close_pos is None or float(close_pos) < float(scan_defaults["close_position_min"]):
                    watch_reasons.append("weak close position")
                trank = c.extras.get("market_turnover_rank")
                if trank is None or int(trank) > int(scan_defaults["market_turnover_rank_max"]):
                    watch_reasons.append("turnover rank too low")
            else:
                if c.extras.get("us_filter_flags"):
                    watch_reasons.append("liquidity/filter caution")

            if watch_reasons:
                entry_status = "WATCHLIST_ONLY"
                reasons.extend(watch_reasons)

        if entry_status != "WATCHLIST_ONLY" and len(c.rejection_flags or []) >= 4:
            entry_status = "AVOID"
            reasons.append("multiple risk flags")

        return replace(
            c,
            entry_status=entry_status,
            entry_reason=list(dict.fromkeys(reasons)),
        )

    cands = [_classify_entry(c) for c in cands]

    def _serialize_candidate(c: Candidate) -> Dict[str, Any]:
        return {
            "symbol": c.symbol,
            "name": kr_name_map.get(c.symbol) or c.name,
            "currency": c.currency,
            "last": c.last,
            "day_chg_pct": c.day_chg_pct,
            "day_volume": c.day_volume,
            "avg20_volume": c.avg20_volume,
            "rel_vol_20d": c.rel_vol_20d,
            "ret_3d_pct": c.ret_3d_pct,
            "ret_5d_pct": c.ret_5d_pct,
            "ret_20d_pct": c.ret_20d_pct,
            "ret_horizon_pct": c.ret_5d_pct if horizon_days == 5 else c.ret_20d_pct,
            "avg_turnover_20d": c.avg_turnover_20d,
            "day_turnover": c.day_turnover,
            "market_cap": c.market_cap,
            "score": c.score,
            "entry_status": c.entry_status,
            "entry_reason": c.entry_reason,
            "extras": c.extras,
            "scan_reason": c.scan_reason,
            "rejection_flags": c.rejection_flags,
        }

    serialized_candidates = [_serialize_candidate(c) for c in cands]
    approved_serialized = [x for x in serialized_candidates if x.get("entry_status") == "APPROVED_NEW"]
    watchlist_serialized = [x for x in serialized_candidates if x.get("entry_status") != "APPROVED_NEW"]

    effective_new_entries_allowed = bool(market_decision.get("new_entries_allowed", False) and approved_serialized)
    market_decision = dict(market_decision)
    market_decision["new_entries_allowed"] = effective_new_entries_allowed
    if not effective_new_entries_allowed:
        if market_decision.get("regime") == "NO_TRADE":
            market_decision["recommended_action"] = "CASH"
        else:
            market_decision["recommended_action"] = "WATCHLIST_ONLY"
        reasons = list(market_decision.get("reason") or [])
        if not approved_serialized:
            reasons.append("no approved new entries")
        market_decision["reason"] = list(dict.fromkeys(reasons))

    auto_selected_symbols: List[str] = []
    if effective_new_entries_allowed:
        if market_u == "KR":
            approved_sorted = sorted(approved_serialized, key=lambda x: float(x.get("score") or 0.0), reverse=True)
            primary = approved_sorted[:2]
            largecap = [
                x
                for x in approved_sorted
                if x.get("market_cap") is not None and float(x.get("market_cap")) >= float(scan_defaults["largecap_min"])
            ][: int(scan_defaults["largecap_quota"])]
            picked: List[str] = []
            for row in primary + largecap:
                sym = str(row.get("symbol") or "")
                if not sym or sym in picked:
                    continue
                picked.append(sym)
                if len(picked) >= 4:
                    break
            auto_selected_symbols = picked
        else:
            approved_sorted = sorted(approved_serialized, key=lambda x: float(x.get("score") or 0.0), reverse=True)
            auto_selected_symbols = [str(x.get("symbol")) for x in approved_sorted[:5] if x.get("symbol")]

    positions_review: List[Dict[str, Any]] = []
    if (held_symbols or "").strip():
        positions_review = await _review_positions_impl(
            held_symbols=held_symbols,
            market=market_u,
            market_decision=market_decision,
            max_items=20,
        )

    now_et = _now_et()
    out = {
        "schema_version": "candidates.v2",
        "contract": {
            "required_candidate_fields": [
                "symbol",
                "name",
                "currency",
                "last",
                "day_chg_pct",
                "day_volume",
                "avg20_volume",
                "rel_vol_20d",
                "ret_3d_pct",
                "ret_5d_pct",
                "ret_20d_pct",
                "ret_horizon_pct",
                "avg_turnover_20d",
                "day_turnover",
                "market_cap",
                "score",
                "entry_status",
                "entry_reason",
                "scan_reason",
                "rejection_flags",
            ],
            "direct_mode_bypass_supported": True,
        },
        "fields_guaranteed": [
            "symbol",
            "name",
            "currency",
            "last",
            "day_chg_pct",
            "day_volume",
            "avg20_volume",
            "rel_vol_20d",
            "ret_3d_pct",
            "ret_5d_pct",
            "ret_20d_pct",
            "ret_horizon_pct",
            "avg_turnover_20d",
            "day_turnover",
            "market_cap",
            "score",
            "entry_status",
            "entry_reason",
            "scan_reason",
            "rejection_flags",
        ],
        "asof_et": _fmt_dt(now_et),
        "asof_kst": _fmt_dt(_now_kst()),
        "market": market_u,
        "region": region,
        "horizon_days": horizon_days,
        "hold_days_max": horizon_days,
        "universe_source": universe_source,
        "filters": {
            "max_price": max_price,
            "min_avg_turnover": scan_defaults.get("avg20_turnover_min", min_avg_turnover),
            "market_cap_min": scan_defaults.get("market_cap_min", market_cap_min),
            "today_turnover_min": scan_defaults.get("today_turnover_min", today_turnover_min),
            "rel_volume_min": scan_defaults.get("rel_volume_min", rel_volume_min),
            "ret_5d_min": scan_defaults.get("ret_5d_min", ret_5d_min),
            "ret_5d_max": scan_defaults.get("ret_5d_max", ret_5d_max),
            "close_position_min": scan_defaults.get("close_position_min", close_position_min),
            "fresh_news_hours": scan_defaults.get("fresh_news_hours", fresh_news_hours),
            "market_turnover_rank_max": scan_defaults.get("market_turnover_rank_max"),
            "largecap_min": scan_defaults.get("largecap_min"),
            "largecap_quota": scan_defaults.get("largecap_quota"),
            "kr_exclude_fundlike": scan_defaults.get("kr_exclude_fundlike"),
            "direct_mode": direct_override,
            "us_market_cap_min": us_defaults["market_cap_min"],
            "us_day_turnover_min": us_defaults["day_turnover_min"],
            "us_rel_volume_min": us_defaults["rel_volume_min"],
            "us_exclude_etf": us_defaults["exclude_etf"],
        },
        "scan_defaults": scan_defaults or None,
        "context": context,
        "market_decision": market_decision,
        "new_entries_allowed": effective_new_entries_allowed,
        "approved_candidates": approved_serialized,
        "watchlist_candidates": watchlist_serialized,
        "auto_selected_symbols": auto_selected_symbols,
        "positions_review": positions_review,
        "note": "Educational prototype. Not financial advice. Data best-effort and may be delayed/incomplete.",
        "candidates": serialized_candidates,
    }
    return out


@app.get("/api/review_positions")
async def review_positions(
    held_symbols: str = Query(..., description="Comma-separated held symbols"),
    market: str = Query(default="US", description="US or KR"),
) -> Dict[str, Any]:
    market_u = (market or "US").upper().strip()
    if market_u not in ("US", "KR"):
        raise HTTPException(status_code=400, detail="market must be US or KR")
    if market_u == "KR":
        held_symbols = await _resolve_kr_input_text(held_symbols)
    macro_rows = await _fetch_macro_snapshot(market_u)
    market_decision = _compute_market_decision(market_u, macro_rows)
    rows = await _review_positions_impl(
        held_symbols=held_symbols,
        market=market_u,
        market_decision=market_decision,
        max_items=20,
    )
    return {
        "asof_et": _fmt_dt(_now_et()),
        "asof_kst": _fmt_dt(_now_kst()),
        "market": market_u,
        "market_decision": market_decision,
        "positions_review": rows,
    }


@app.get("/api/ticker/{symbol}")
async def ticker_detail(
    symbol: str,
    market: str = Query(default="US", description="US or KR (controls Yahoo region)"),
    horizon_days: int = Query(default=5, ge=3, le=60),
) -> Dict[str, Any]:
    sym = symbol.upper().strip()
    if not sym:
        raise HTTPException(status_code=400, detail="symbol required")

    market_u = market.upper().strip()
    if market_u not in ("US", "KR"):
        market_u = "US"

    if horizon_days not in (5, 20):
        horizon_days = 5 if horizon_days < 12 else 20

    if market_u == "KR":
        q = await fetch_kr_snapshot(sym)
        if not q or q.get("last") is None:
            raise HTTPException(status_code=404, detail="symbol not found (Naver)")

        name = q.get("name") or ""
        currency = q.get("currency") or "KRW"
        last = q.get("last")
        prev_close = q.get("prev_close")
        day_chg_pct = q.get("day_chg_pct")
        market_state = q.get("market_state")
        session = _market_session_label_kr(_now_kst())

        daily_rows = await fetch_kr_daily_history(sym, count=130)
        d_highs = [float(x["high"]) for x in daily_rows if x.get("high") is not None]
        d_lows = [float(x["low"]) for x in daily_rows if x.get("low") is not None]
        d_closes = [float(x["close"]) for x in daily_rows if x.get("close") is not None]
        d_vols = [int(x["volume"]) for x in daily_rows if x.get("volume") is not None]

        lookback_high = d_highs[-20:] if len(d_highs) >= 20 else d_highs
        lookback_low = d_lows[-20:] if len(d_lows) >= 20 else d_lows
        resistance_20d, support_20d = _swing_levels(lookback_high, lookback_low)
        resistance_60d = max(d_highs[-60:]) if len(d_highs) >= 60 else (max(d_highs) if d_highs else None)

        day_high = q.get("high") if q.get("high") is not None else (d_highs[-1] if d_highs else None)
        day_low = q.get("low") if q.get("low") is not None else (d_lows[-1] if d_lows else None)
        day_open = q.get("open")
        day_volume = q.get("day_volume")
        day_turnover = q.get("day_turnover")

        avg20_volume = None
        if len(d_vols) >= 20:
            avg20_volume = statistics.fmean(d_vols[-20:])
        elif len(d_vols) >= 10:
            avg20_volume = statistics.fmean(d_vols[-10:])

        rel_vol_20d = None
        try:
            if day_volume is not None and avg20_volume is not None and avg20_volume > 0:
                rel_vol_20d = float(day_volume) / float(avg20_volume)
        except Exception:
            rel_vol_20d = None

        ret_3d_pct = _compute_return_pct(d_closes, 3)
        ret_5d_pct = _compute_return_pct(d_closes, 5)
        ret_20d_pct = _compute_return_pct(d_closes, 20)
        ret_horizon_pct = ret_5d_pct if horizon_days == 5 else ret_20d_pct
        atr14 = _atr14(d_highs, d_lows, d_closes)
        close_position = _close_position(last, day_high, day_low)
        gap_pct = _safe_pct(day_open, prev_close) if day_open is not None and prev_close is not None else None
        avg20_turnover = _avg_recent_turnover(d_closes, d_vols, 20)
        turnover_ratio_20d = (float(day_turnover) / float(avg20_turnover)) if day_turnover and avg20_turnover else None
        kr_flow, kr_short = await asyncio.gather(
            fetch_kr_investor_flows(sym),
            fetch_kr_short_data(sym, name_hint=name),
        )
    else:
        quote_map = await fetch_yahoo_quote([sym], region=market_u)
        q = quote_map.get(sym)
        if not q:
            raise HTTPException(status_code=404, detail="symbol not found (Yahoo)")

        name = q.get("shortName") or q.get("longName") or ""
        currency = q.get("currency")

        last = q.get("regularMarketPrice")
        prev_close = q.get("regularMarketPreviousClose")

        day_chg_pct = None
        if last is not None and prev_close is not None:
            try:
                day_chg_pct = _safe_pct(float(last), float(prev_close))
            except Exception:
                day_chg_pct = None

        market_state = q.get("marketState")
        session = _session_from_market_state(market_state, _now_et())

        daily = await fetch_yahoo_chart(sym, range_="6mo", interval="1d", include_prepost=False)
        intraday = await fetch_yahoo_chart(sym, range_="1d", interval="1m", include_prepost=True)

        d_ts, d_o, d_h, d_l, d_c, d_v = _extract_ohlcv(daily)
        i_ts, i_o, i_h, i_l, i_c, i_v = _extract_ohlcv(intraday)

        d_highs = _drop_none_float(d_h)
        d_lows = _drop_none_float(d_l)
        d_closes = _drop_none_float(d_c)
        d_vols = _drop_none_int(d_v)

        lookback_high = d_highs[-20:] if len(d_highs) >= 20 else d_highs
        lookback_low = d_lows[-20:] if len(d_lows) >= 20 else d_lows
        resistance_20d, support_20d = _swing_levels(lookback_high, lookback_low)

        day_high = max(_drop_none_float(i_h)) if i_h else None
        day_low = min(_drop_none_float(i_l)) if i_l else None
        day_open = None
        day_volume = q.get("regularMarketVolume")
        day_turnover = (float(last) * float(day_volume)) if last is not None and day_volume is not None else None

        avg20_volume = None
        if len(d_vols) >= 20:
            avg20_volume = statistics.fmean(d_vols[-20:])
        elif len(d_vols) >= 10:
            avg20_volume = statistics.fmean(d_vols[-10:])

        rel_vol_20d = None
        try:
            if day_volume is not None and avg20_volume is not None and avg20_volume > 0:
                rel_vol_20d = float(day_volume) / float(avg20_volume)
        except Exception:
            rel_vol_20d = None

        ret_3d_pct = _compute_return_pct(d_closes, 3)
        ret_5d_pct = _compute_return_pct(d_closes, 5)
        ret_20d_pct = _compute_return_pct(d_closes, 20)
        ret_horizon_pct = ret_5d_pct if horizon_days == 5 else ret_20d_pct
        atr14 = _atr14(d_highs, d_lows, d_closes)
        kr_flow = {}
        kr_short = {}

    # plan-like (rules output):
    # - entry: break above 20D high if below; else break day_high
    # - stop: 1x ATR below entry if ATR available; else below day_low
    # - target: entry + 1.5R
    entry_trigger = None
    if resistance_20d is not None and last is not None:
        try:
            if float(last) < float(resistance_20d):
                entry_trigger = float(resistance_20d)
            else:
                entry_trigger = float(day_high) if day_high is not None else float(last)
        except Exception:
            entry_trigger = float(last) if last is not None else None
    elif day_high is not None:
        entry_trigger = float(day_high)
    elif last is not None:
        entry_trigger = float(last)

    stop = None
    if entry_trigger is not None and atr14 is not None and atr14 > 0:
        stop = max(0.01, entry_trigger - atr14)
    elif day_low is not None:
        stop = float(day_low)

    target = None
    if entry_trigger is not None and stop is not None:
        risk = max(0.01, entry_trigger - stop)
        target = entry_trigger + 1.5 * risk

    # heavy-ish extras (best-effort)
    sem = asyncio.Semaphore(4)

    async def get_rss() -> List[Dict[str, Any]]:
        async with sem:
            if market_u == "KR":
                items = await fetch_kr_naver_news(sym, limit=6)
                if items:
                    return items
            return await fetch_yahoo_rss(sym, region=market_u, limit=6)

    async def get_sec() -> List[Dict[str, Any]]:
        # only meaningful for US; function already skips KR suffixes.
        async with sem:
            return await fetch_sec_recent_filings(sym, days=7, limit=10)

    async def get_opt() -> Dict[str, Any]:
        async with sem:
            return await fetch_yahoo_options_summary(sym)

    async def get_qs() -> Dict[str, Any]:
        async with sem:
            return await fetch_yahoo_quote_summary(sym, region=market_u)

    news, sec, opt, qs = await asyncio.gather(get_rss(), get_sec(), get_opt(), get_qs(), return_exceptions=True)

    news_items: List[Dict[str, Any]] = []
    if not isinstance(news, Exception):
        news_items = (news or [])[:3]

    sec_items: List[Dict[str, Any]] = []
    if not isinstance(sec, Exception):
        sec_items = sec or []

    opt_sum: Dict[str, Any] = {} if isinstance(opt, Exception) else (opt or {})
    qs_sum: Dict[str, Any] = {} if isinstance(qs, Exception) else (qs or {})

    if market_u == "KR" and kr_short:
        latest_short = kr_short.get("latest") or {}
        try:
            sv = latest_short.get("short_volume")
            if sv is not None and day_volume:
                latest_short["short_volume_ratio_pct"] = round(float(sv) / float(day_volume) * 100.0, 4)
        except Exception:
            pass
        try:
            sval = latest_short.get("short_value")
            if sval is not None and day_turnover:
                latest_short["short_value_ratio_pct"] = round(float(sval) / float(day_turnover) * 100.0, 4)
        except Exception:
            pass

    scan_reason: List[str] = []
    rejection_flags: List[str] = []
    if market_u == "KR":
        if day_turnover is not None and day_turnover >= KR_SWING_DEFAULTS["today_turnover_min"]:
            scan_reason.append("당일 거래대금 기준 통과")
        if rel_vol_20d is not None and rel_vol_20d >= KR_SWING_DEFAULTS["rel_volume_min"]:
            scan_reason.append("상대거래량 기준 통과")
        if close_position is not None and close_position >= KR_SWING_DEFAULTS["close_position_min"]:
            scan_reason.append("종가 고가권 안착")
        if resistance_20d is not None and last is not None and float(last) > float(resistance_20d):
            scan_reason.append("20일 고점 돌파")
        if q.get("market_cap") is not None and float(q.get("market_cap")) < KR_SWING_DEFAULTS["market_cap_min"]:
            rejection_flags.append("시총 하한 미달")
        if close_position is not None and close_position < KR_SWING_DEFAULTS["close_position_min"]:
            rejection_flags.append("종가 위치 약함")

    now_et = _now_et()
    return {
        "asof_et": _fmt_dt(now_et),
        "asof_kst": _fmt_dt(_now_kst()),
        "market": market_u,
        "horizon_days": horizon_days,
        "hold_days_max": horizon_days,
        "session": session,
        "note": "Educational prototype. Not financial advice. Data best-effort and may be delayed/incomplete.",
        "symbol": sym,
        "name": name,
        "currency": currency,
        "scan_reason": scan_reason,
        "rejection_flags": rejection_flags,
        "quote": {
            "last": last,
            "prev_close": prev_close,
            "day_chg_pct": day_chg_pct,
            "day_volume": day_volume,
            "day_turnover": day_turnover,
            "market_cap": q.get("market_cap") if market_u == "KR" else qs_sum.get("market_cap"),
            "bid": q.get("bid"),
            "ask": q.get("ask"),
            "open": day_open,
            "high": day_high,
            "low": day_low,
            "market_state": market_state,
            "regular_market_time": q.get("regularMarketTime") if market_u != "KR" else None,
        },
        "stats": {
            "ret_3d_pct": ret_3d_pct,
            "ret_5d_pct": ret_5d_pct,
            "ret_20d_pct": ret_20d_pct,
            "ret_horizon_pct": ret_horizon_pct,
            "avg20_volume": avg20_volume,
            "avg20_turnover": avg20_turnover if market_u == "KR" else None,
            "rel_vol_20d": rel_vol_20d,
            "atr14": atr14,
            "close_position": close_position if market_u == "KR" else None,
            "gap_pct": gap_pct if market_u == "KR" else None,
            "turnover_ratio_20d": turnover_ratio_20d if market_u == "KR" else None,
        },
        "levels": {
            "resistance_20d": resistance_20d,
            "resistance_60d": resistance_60d if market_u == "KR" else None,
            "support_20d": support_20d,
            "day_high": day_high,
            "day_low": day_low,
        },
        "extras": {
            "quote_summary": qs_sum,
            "options": opt_sum,
            "kr_flow": kr_flow,
            "kr_short": kr_short,
            "timestamps": {
                "quote_asof_kst": _fmt_dt(_now_kst()) if market_u == "KR" else None,
                "news_asof_kst": ((news_items[0] or {}).get("published_kst") or (news_items[0] or {}).get("published")) if news_items else None,
                "flow_asof_kst": kr_flow.get("as_of") if market_u == "KR" else None,
                "short_asof_kst": (kr_short.get("latest") or {}).get("date") if market_u == "KR" else None,
            },
        },
        "trade_plan_like": {
            "hold_days_max": horizon_days,
            "entry_trigger": entry_trigger,
            "stop": stop,
            "target": target,
            "time_stop": f"If no follow-through within 2 trading days, exit (rule-of-thumb). Max hold: {horizon_days} trading days.",
        },
        "news": news_items,
        "sec_filings_last_7d": sec_items,
    }


def _fnum(x: Any, nd: int = 2) -> str:
    if x is None:
        return "확인 불가"
    try:
        return f"{float(x):.{nd}f}"
    except Exception:
        return "확인 불가"


def _fint(x: Any) -> str:
    if x is None:
        return "확인 불가"
    try:
        return f"{int(x):,}"
    except Exception:
        return "확인 불가"


def _fmt_pct(x: Any) -> str:
    if x is None:
        return "확인 불가"
    try:
        v = float(x)
        return f"{v:+.2f}%"
    except Exception:
        return "확인 불가"


def _to_float(x: Any, default: float = 0.0) -> float:
    try:
        return float(x)
    except Exception:
        return default


def _parse_scan_thresholds(raw: str) -> Dict[str, Any]:
    text = (raw or "").strip()
    if not text:
        return {}
    try:
        obj = json.loads(text)
        return obj if isinstance(obj, dict) else {}
    except Exception:
        return {}


def _parse_selected_meta(raw: str) -> Dict[str, Dict[str, Any]]:
    text = (raw or "").strip()
    if not text:
        return {}
    try:
        obj = json.loads(text)
    except Exception:
        return {}
    if not isinstance(obj, list):
        return {}

    out: Dict[str, Dict[str, Any]] = {}
    for idx, row in enumerate(obj, start=1):
        if not isinstance(row, dict):
            continue
        symbol = str(row.get("symbol") or "").upper().strip()
        if not symbol:
            continue
        scan_rank = row.get("scan_rank")
        selected_order = row.get("selected_order")
        out[symbol] = {
            "scan_rank": int(scan_rank) if isinstance(scan_rank, (int, float)) else None,
            "scan_score": _to_float(row.get("scan_score"), 0.0),
            "selected_order": int(selected_order) if isinstance(selected_order, (int, float)) else idx,
        }
    return out


def _spread_pct_from_quote(q: Dict[str, Any]) -> Optional[float]:
    b = q.get("bid")
    a = q.get("ask")
    try:
        bf = float(b)
        af = float(a)
        if bf > 0 and af > 0:
            return (af / bf - 1.0) * 100.0
    except Exception:
        return None
    return None


def _score_breakdown_detail(d: Dict[str, Any]) -> Dict[str, float]:
    q = d.get("quote", {}) or {}
    st = d.get("stats", {}) or {}
    ex = d.get("extras", {}) or {}
    qs = (ex.get("quote_summary") or {})
    opt = (ex.get("options") or {})
    kr_flow = (ex.get("kr_flow") or {})
    kr_short = (ex.get("kr_short") or {})

    relv = _to_float(st.get("rel_vol_20d"), 0.0)
    hret = _to_float(st.get("ret_horizon_pct"), -50.0)
    dayp = _to_float(q.get("day_chg_pct"), 0.0)
    atr = _to_float(st.get("atr14"), 0.0)
    last = _to_float(q.get("last"), 0.0)
    vol = _to_float(q.get("day_volume"), 0.0)
    turnover = last * vol
    call_put = _to_float(opt.get("call_put_vol_ratio"), 1.0)
    short_ratio = _to_float(qs.get("short_ratio"), 0.0)
    short_float = _to_float(qs.get("short_percent_of_float"), 0.0)

    atr_pct = (atr / last * 100.0) if last > 0 and atr > 0 else 0.0

    momentum = 0.0
    momentum += max(-20.0, min(25.0, hret)) * 1.8
    momentum += max(-8.0, min(10.0, dayp)) * 1.2

    liquidity = 0.0
    liquidity += min(4.0, relv) * 14.0
    if turnover >= 1_000_000_000:
        liquidity += 18.0
    elif turnover >= 300_000_000:
        liquidity += 12.0
    elif turnover >= 100_000_000:
        liquidity += 7.0

    flow_proxy = 0.0
    if str(d.get("market") or "").upper() == "KR" and (kr_flow or kr_short):
        flow_1d = (kr_flow.get("lookbacks") or {}).get("1d") or {}
        flow_5d = (kr_flow.get("lookbacks") or {}).get("5d") or {}
        latest_short = (kr_short.get("latest") or {})
        foreign_1d = _to_float(flow_1d.get("foreign_net_volume"), 0.0)
        institution_1d = _to_float(flow_1d.get("institution_net_volume"), 0.0)
        foreign_5d = _to_float(flow_5d.get("foreign_net_volume"), 0.0)
        institution_5d = _to_float(flow_5d.get("institution_net_volume"), 0.0)
        short_ratio_vol = _to_float(latest_short.get("short_volume_ratio_pct"), 0.0)

        flow_proxy += _signed_flow_score(flow_1d, flow_5d)
        if short_ratio_vol >= 8.0:
            flow_proxy -= 2.0
        elif short_ratio_vol >= 5.0:
            flow_proxy -= 1.0
    else:
        flow_proxy += max(0.0, min(3.0, call_put)) * 7.0
        flow_proxy += max(0.0, min(12.0, short_float)) * 1.1
        if short_ratio >= 5.0:
            flow_proxy += 4.0

    risk = 0.0
    if atr_pct > 7.0:
        risk += 16.0
    elif atr_pct > 5.0:
        risk += 9.0
    elif atr_pct > 3.5:
        risk += 4.0
    if relv < 0.7:
        risk += 5.0

    total = momentum + liquidity + flow_proxy - risk
    return {
        "total": round(total, 1),
        "momentum": round(momentum, 1),
        "liquidity": round(liquidity, 1),
        "flow_proxy": round(flow_proxy, 1),
        "risk_penalty": round(risk, 1),
        "turnover": round(turnover, 1),
        "atr_pct": round(atr_pct, 2),
    }


def _risk_flags_detail(d: Dict[str, Any], score: Dict[str, float]) -> List[str]:
    flags: List[str] = []
    q = d.get("quote", {}) or {}
    ex = d.get("extras", {}) or {}
    qs = (ex.get("quote_summary") or {})
    sec = d.get("sec_filings_last_7d", []) or []
    spread = _spread_pct_from_quote(q)
    if qs.get("earnings_dates"):
        flags.append("earnings")
    if spread is not None and spread > 0.35:
        flags.append("wide_spread")
    if score.get("atr_pct", 0.0) > 6.0:
        flags.append("high_volatility")
    if sec:
        flags.append(f"sec_{len(sec)}")
    return flags


def _macro_regime(macro_rows: List[Dict[str, Any]], market_code: str) -> str:
    return str(_compute_market_decision(market_code, macro_rows).get("regime") or "MIXED")


def _compute_market_decision(market_code: str, macro_rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    m = {str(x.get("label")): x for x in (macro_rows or [])}
    market_u = (market_code or "US").upper().strip()
    reasons: List[str] = []
    regime = "MIXED"
    recommended_action = "WATCHLIST_ONLY"
    new_entries_allowed = False

    if market_u == "KR":
        kospi = _to_float((m.get("KOSPI") or {}).get("day_chg_pct"), 0.0)
        kosdaq = _to_float((m.get("KOSDAQ") or {}).get("day_chg_pct"), 0.0)
        usdkrw = _to_float((m.get("USD/KRW") or {}).get("day_chg_pct"), 0.0)
        macro_snapshot = {
            "KOSPI_day_chg_pct": kospi,
            "KOSDAQ_day_chg_pct": kosdaq,
            "USDKRW_day_chg_pct": usdkrw,
        }

        if kospi <= -2.0:
            reasons.append("KOSPI crash")
        if kosdaq <= -3.0:
            reasons.append("KOSDAQ crash")
        if usdkrw >= 1.0:
            reasons.append("USD/KRW spike")
        if kospi < 0 and kosdaq < 0 and usdkrw > 0:
            reasons.append("broad risk-off")

        if kospi <= -2.0 or kosdaq <= -3.0 or usdkrw >= 1.0:
            regime = "NO_TRADE"
            recommended_action = "CASH"
            new_entries_allowed = False
        elif kospi < 0 and kosdaq < 0 and usdkrw > 0:
            regime = "RISK_OFF"
            recommended_action = "WATCHLIST_ONLY"
            new_entries_allowed = False
        elif kospi > 0 and kosdaq > 0 and usdkrw <= 0:
            regime = "RISK_ON"
            recommended_action = "NEW_ENTRY"
            new_entries_allowed = True
        else:
            regime = "MIXED"
            recommended_action = "NEW_ENTRY"
            new_entries_allowed = True
    else:
        spy = _to_float((m.get("SPY") or {}).get("day_chg_pct"), 0.0)
        qqq = _to_float((m.get("QQQ") or {}).get("day_chg_pct"), 0.0)
        vix = _to_float((m.get("VIX") or {}).get("day_chg_pct"), 0.0)
        macro_snapshot = {
            "SPY_day_chg_pct": spy,
            "QQQ_day_chg_pct": qqq,
            "VIX_day_chg_pct": vix,
        }

        if spy < -1.5:
            reasons.append("SPY crash")
        if qqq < -2.0:
            reasons.append("QQQ crash")
        if vix > 0:
            reasons.append("VIX rising")
        if spy < 0 and qqq < 0 and vix > 0:
            reasons.append("broad risk-off")

        if spy < -1.5 and qqq < -2.0 and vix > 0:
            regime = "NO_TRADE"
            recommended_action = "CASH"
            new_entries_allowed = False
        elif spy < 0 and qqq < 0 and vix > 0:
            regime = "RISK_OFF"
            recommended_action = "WATCHLIST_ONLY"
            new_entries_allowed = False
        elif spy > 0 and qqq > 0 and vix <= 0:
            regime = "RISK_ON"
            recommended_action = "NEW_ENTRY"
            new_entries_allowed = True
        else:
            regime = "MIXED"
            recommended_action = "NEW_ENTRY"
            new_entries_allowed = True

    if not reasons:
        reasons = ["macro mixed"]

    return {
        "regime": regime,
        "recommended_action": recommended_action,
        "new_entries_allowed": bool(new_entries_allowed),
        "reason": reasons,
        "macro_snapshot": macro_snapshot,
    }


def _compute_carry_score(
    *,
    close: Optional[float],
    ma20: Optional[float],
    ma20_slope: Optional[float],
    ret_3d_pct: Optional[float],
    ret_20d_pct: Optional[float],
    close_position: Optional[float],
    flow_5d: Optional[float],
    market_decision: Optional[Dict[str, Any]] = None,
) -> Tuple[float, List[str], bool]:
    score = 0.0
    reasons: List[str] = []

    if close is not None and ma20 is not None and float(close) > float(ma20):
        score += 12.0
        reasons.append("above_ma20")
    elif close is not None and ma20 is not None and float(close) <= float(ma20):
        score -= 16.0
        reasons.append("below_ma20")

    if ma20_slope is not None and float(ma20_slope) > 0:
        score += 8.0
        reasons.append("ma20_slope_up")

    if flow_5d is not None and float(flow_5d) > 0:
        score += 6.0
        reasons.append("flow_5d_positive")
    elif flow_5d is not None and float(flow_5d) < 0:
        score -= 6.0
        reasons.append("flow_5d_negative")

    if ret_20d_pct is not None and float(ret_20d_pct) > 0:
        score += 6.0
        reasons.append("ret_20d_positive")
    elif ret_20d_pct is not None and float(ret_20d_pct) <= 0:
        reasons.append("ret_20d_weak")

    if close_position is not None and float(close_position) < 0.45:
        score -= 6.0
        reasons.append("close_position_weak")

    if ret_3d_pct is not None and float(ret_3d_pct) < -6.0:
        score -= 8.0
        reasons.append("ret_3d_drop")

    if market_decision and not bool(market_decision.get("new_entries_allowed", True)):
        reasons.append("risk_off_market")

    invalidated = bool(
        (close is not None and ma20 is not None and float(close) < float(ma20))
        and (ret_3d_pct is not None and float(ret_3d_pct) < -6.0)
    )
    return round(score, 2), list(dict.fromkeys(reasons)), invalidated


async def _fetch_macro_snapshot(market: str) -> List[Dict[str, Any]]:
    m = (market or "US").upper().strip()
    if m == "KR":
        labels = {
            "^KS11": "KOSPI",
            "^KQ11": "KOSDAQ",
            "USDKRW=X": "USD/KRW",
            "^TNX": "US10Y",
            "DX-Y.NYB": "DXY",
        }
        region = "KR"
        symbols = list(labels.keys())
    else:
        labels = {
            "SPY": "SPY",
            "QQQ": "QQQ",
            "^VIX": "VIX",
            "^TNX": "US10Y",
            "DX-Y.NYB": "DXY",
        }
        region = "US"
        symbols = list(labels.keys())

    out: List[Dict[str, Any]] = []
    try:
        qmap = await fetch_yahoo_quote(symbols, region=region)
        for s in symbols:
            q = qmap.get(s) or {}
            p = q.get("regularMarketPrice")
            pc = q.get("regularMarketPreviousClose")
            chg = None
            try:
                if p is not None and pc is not None:
                    chg = _safe_pct(float(p), float(pc))
            except Exception:
                chg = None
            out.append(
                {
                    "symbol": s,
                    "label": labels.get(s, s),
                    "last": p,
                    "day_chg_pct": chg,
                }
            )
    except Exception:
        return []
    return out


async def _collect_symbol_details(
    symbols: str,
    *,
    market: str,
    horizon_days: int,
    max_items: int,
) -> Tuple[List[Dict[str, Any]], List[str]]:
    syms = [s.strip().upper() for s in (symbols or "").split(",") if s.strip()]
    if not syms:
        raise HTTPException(status_code=400, detail="symbols required")

    if horizon_days not in (5, 20):
        horizon_days = 5 if horizon_days < 12 else 20

    syms = syms[:max_items]
    sem = asyncio.Semaphore(4)

    async def get_one(s: str) -> Tuple[str, Optional[Dict[str, Any]], Optional[str]]:
        async with sem:
            try:
                d = await ticker_detail(s, market=market, horizon_days=horizon_days)
                return s, d, None
            except Exception as e:
                return s, None, str(e)

    results = await asyncio.gather(*[get_one(s) for s in syms])

    ok_details: List[Dict[str, Any]] = []
    errors: List[str] = []
    for s, d, err in results:
        if d is not None:
            ok_details.append(d)
        else:
            errors.append(f"{s}: {err or '확인 불가'}")
    return ok_details, errors


async def _review_positions_impl(
    *,
    held_symbols: str,
    market: str,
    market_decision: Optional[Dict[str, Any]] = None,
    max_items: int = 20,
) -> List[Dict[str, Any]]:
    market_u = (market or "US").upper().strip()
    syms = [s.strip().upper() for s in (held_symbols or "").split(",") if s.strip()]
    if not syms:
        return []
    syms = syms[:max_items]

    if market_decision is None:
        macro_rows = await _fetch_macro_snapshot(market_u)
        market_decision = _compute_market_decision(market_u, macro_rows)

    sem = asyncio.Semaphore(4)

    async def _one(sym: str) -> Dict[str, Any]:
        async with sem:
            try:
                d = await ticker_detail(sym, market=market_u, horizon_days=20)
            except Exception:
                return {
                    "symbol": sym,
                    "status": "EXIT",
                    "carry_score": -99.0,
                    "reason": ["data_fetch_failed"],
                    "invalidated": True,
                }

            stats = d.get("stats") or {}
            quote = d.get("quote") or {}
            extras = d.get("extras") or {}
            close = quote.get("last")
            close_position = stats.get("close_position")
            ret_3d_pct = stats.get("ret_3d_pct")
            ret_20d_pct = stats.get("ret_20d_pct")

            ma20 = None
            ma20_prev = None
            flow_5d = None
            try:
                if market_u == "KR":
                    rows = await fetch_kr_daily_history(sym, count=40)
                    closes = [float(x["close"]) for x in rows if x.get("close") is not None]
                else:
                    daily = await fetch_yahoo_chart(sym, range_="3mo", interval="1d", include_prepost=False)
                    _ts, _o, _h, _l, _c, _v = _extract_ohlcv(daily)
                    closes = _drop_none_float(_c)
                if len(closes) >= 20:
                    ma20 = statistics.fmean(closes[-20:])
                if len(closes) >= 21:
                    ma20_prev = statistics.fmean(closes[-21:-1])
            except Exception:
                ma20 = None
                ma20_prev = None

            if market_u == "KR":
                flow_5d_data = ((extras.get("kr_flow") or {}).get("lookbacks") or {}).get("5d") or {}
                flow_5d = _to_float(flow_5d_data.get("foreign_net_volume"), 0.0) + _to_float(flow_5d_data.get("institution_net_volume"), 0.0)

            ma20_slope = None
            if ma20 is not None and ma20_prev is not None:
                ma20_slope = float(ma20) - float(ma20_prev)

            carry_score, reasons, invalidated = _compute_carry_score(
                close=close,
                ma20=ma20,
                ma20_slope=ma20_slope,
                ret_3d_pct=ret_3d_pct,
                ret_20d_pct=ret_20d_pct,
                close_position=close_position,
                flow_5d=flow_5d,
                market_decision=market_decision,
            )

            if carry_score >= 25:
                status = "HOLD"
            elif carry_score >= 5:
                status = "TRIM"
            else:
                status = "EXIT"

            return {
                "symbol": sym,
                "status": status,
                "carry_score": carry_score,
                "reason": reasons,
                "invalidated": bool(invalidated),
            }

    rows = await asyncio.gather(*[_one(sym) for sym in syms], return_exceptions=True)
    out: List[Dict[str, Any]] = []
    for idx, row in enumerate(rows):
        if isinstance(row, Exception):
            out.append(
                {
                    "symbol": syms[idx],
                    "status": "EXIT",
                    "carry_score": -99.0,
                    "reason": ["data_process_failed"],
                    "invalidated": True,
                }
            )
            continue
        out.append(row)
    return out


def _build_data_package(
    details: List[Dict[str, Any]],
    *,
    market: str,
    horizon_days: int,
    macro: List[Dict[str, Any]],
    errors: Optional[List[str]] = None,
    scan_context: Optional[Dict[str, Any]] = None,
    selected_meta: Optional[Dict[str, Dict[str, Any]]] = None,
    market_decision: Optional[Dict[str, Any]] = None,
    approved_candidates: Optional[List[Dict[str, Any]]] = None,
    watchlist_candidates: Optional[List[Dict[str, Any]]] = None,
    positions_review: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    selected_meta = selected_meta or {}
    ranked_rows: List[Tuple[Any, ...]] = []
    for d in details:
        sc = _score_breakdown_detail(d)
        meta = selected_meta.get(str(d.get("symbol") or "").upper().strip()) or {}
        if selected_meta:
            ranked_rows.append(
                (
                    int(meta.get("selected_order") or 9999),
                    int(meta.get("scan_rank") or 9999),
                    -float(sc["total"]),
                    d,
                    sc,
                    meta,
                )
            )
        else:
            ranked_rows.append((float(sc["total"]), d, sc, meta))
    if selected_meta:
        ranked_rows.sort(key=lambda x: (x[0], x[1], x[2]))
    else:
        ranked_rows.sort(key=lambda x: x[0], reverse=True)

    candidates: List[Dict[str, Any]] = []
    selected_symbols: List[Dict[str, Any]] = []
    for idx, row in enumerate(ranked_rows, start=1):
        if selected_meta:
            _, _, _, d, sc, meta = row
        else:
            _, d, sc, meta = row
        q = d.get("quote", {}) or {}
        st = d.get("stats", {}) or {}
        lv = d.get("levels", {}) or {}
        plan = d.get("trade_plan_like", {}) or {}
        ex = d.get("extras", {}) or {}
        qs = ex.get("quote_summary") or {}
        opt = ex.get("options") or {}
        kr_flow = ex.get("kr_flow") or {}
        kr_short = ex.get("kr_short") or {}
        spread = _spread_pct_from_quote(q)
        risk_flags = _risk_flags_detail(d, sc)
        scan_rank = meta.get("scan_rank")
        scan_score = meta.get("scan_score")
        selected_order = meta.get("selected_order") if selected_meta else idx

        selected_symbols.append(
            {
                "symbol": d.get("symbol"),
                "selected_order": selected_order,
                "scan_rank": scan_rank,
                "scan_score": scan_score,
            }
        )

        candidates.append(
            {
                "rank": idx,
                "symbol": d.get("symbol"),
                "name": d.get("name"),
                "currency": d.get("currency"),
                "session": d.get("session"),
                "quote": {
                    "last": q.get("last"),
                    "prev_close": q.get("prev_close"),
                    "day_chg_pct": q.get("day_chg_pct"),
                    "day_volume": q.get("day_volume"),
                    "day_turnover": q.get("day_turnover"),
                    "market_cap": q.get("market_cap"),
                    "bid": q.get("bid"),
                    "ask": q.get("ask"),
                    "spread_pct": round(spread, 4) if spread is not None else None,
                    "market_state": q.get("market_state"),
                },
                "stats": {
                    "ret_3d_pct": st.get("ret_3d_pct"),
                    "ret_5d_pct": st.get("ret_5d_pct"),
                    "ret_20d_pct": st.get("ret_20d_pct"),
                    "ret_horizon_pct": st.get("ret_horizon_pct"),
                    "avg20_volume": st.get("avg20_volume"),
                    "avg20_turnover": st.get("avg20_turnover"),
                    "rel_vol_20d": st.get("rel_vol_20d"),
                    "atr14": st.get("atr14"),
                    "close_position": st.get("close_position"),
                    "gap_pct": st.get("gap_pct"),
                    "turnover_ratio_20d": st.get("turnover_ratio_20d"),
                },
                "levels": {
                    "resistance_20d": lv.get("resistance_20d"),
                    "resistance_60d": lv.get("resistance_60d"),
                    "support_20d": lv.get("support_20d"),
                    "day_high": lv.get("day_high"),
                    "day_low": lv.get("day_low"),
                },
                "trade_plan_ref": {
                    "entry_trigger": plan.get("entry_trigger"),
                    "stop": plan.get("stop"),
                    "target": plan.get("target"),
                    "time_stop": plan.get("time_stop"),
                    "hold_days_max": plan.get("hold_days_max"),
                },
                "derived": {
                    "score_total": sc.get("total"),
                    "score_momentum": sc.get("momentum"),
                    "score_liquidity": sc.get("liquidity"),
                    "score_flow_proxy": sc.get("flow_proxy"),
                    "risk_penalty": sc.get("risk_penalty"),
                    "turnover_est": sc.get("turnover"),
                    "atr_pct": sc.get("atr_pct"),
                    "scan_rank": scan_rank,
                    "scan_score": scan_score,
                    "selected_order": selected_order,
                    "scan_reason": d.get("scan_reason") or [],
                    "rejection_flags": d.get("rejection_flags") or [],
                    "risk_flags": risk_flags,
                },
                "events": {
                    "news": (d.get("news") or [])[:3],
                    "sec_filings_last_7d": (d.get("sec_filings_last_7d") or [])[:6],
                    "earnings_dates": (qs.get("earnings_dates") or [])[:2],
                    "news_asof_kst": ((ex.get("timestamps") or {}).get("news_asof_kst")),
                },
                "market_micro": {
                    "short_percent_of_float": qs.get("short_percent_of_float"),
                    "short_ratio": qs.get("short_ratio"),
                    "call_volume": opt.get("call_volume"),
                    "put_volume": opt.get("put_volume"),
                    "call_put_vol_ratio": opt.get("call_put_vol_ratio"),
                    "expiration": opt.get("expiration"),
                    "kr_flow": kr_flow,
                    "kr_short": kr_short,
                    "timestamps": ex.get("timestamps") or {},
                },
            }
        )

    decision = market_decision or _compute_market_decision(market, macro)
    return {
        "schema_version": "data_package.v2",
        "fields_guaranteed": [
            "candidates[].quote",
            "candidates[].stats",
            "candidates[].levels",
            "candidates[].derived.scan_rank",
            "candidates[].derived.scan_score",
            "candidates[].derived.selected_order",
            "candidates[].derived.scan_reason",
            "candidates[].derived.rejection_flags",
            "candidates[].events.news_asof_kst",
            "candidates[].market_micro.timestamps",
        ],
        "external_discovery_allowed": True,
        "reason_for_rejection_required": True,
        "source_latency_hint": "best-effort delayed feeds; KR flow/short can lag market close",
        "generated_at_et": _fmt_dt(_now_et()),
        "generated_at_kst": _fmt_dt(_now_kst()),
        "market": market.upper().strip(),
        "horizon_days": horizon_days,
        "market_regime": _macro_regime(macro, market),
        "market_decision": decision,
        "new_entries_allowed": bool(decision.get("new_entries_allowed", False)),
        "macro": macro,
        "macro_asof_kst": _fmt_dt(_now_kst()),
        "scan_setup": scan_context or {},
        "selected_symbols": selected_symbols,
        "approved_candidates": approved_candidates or [],
        "watchlist_candidates": watchlist_candidates or [],
        "positions_review": positions_review or [],
        "errors": errors or [],
        "notes": [
            "데이터 중심 패키지입니다.",
            "미국 가격 차트는 Yahoo public endpoint best-effort 기준입니다.",
            "한국 가격 차트/뉴스/종목명은 Naver Finance best-effort 기준입니다.",
            "한국 수급은 외국인 기관 순매매와 공매도 데이터를 포함합니다.",
            "媛쒖씤 ?쒕ℓ?섎뒗 ?꾩옱 확인 불가濡??④퉩?덈떎.",
        ],
        "candidates": candidates,
    }


def _build_ai_prompt_from_package(pkg: Dict[str, Any]) -> str:
    market = str(pkg.get("market") or "US").upper().strip()
    horizon_days = int(pkg.get("horizon_days") or 5)
    decision = pkg.get("market_decision") or {}
    scan_setup = pkg.get("scan_setup") or {}
    payload = json.dumps(pkg, ensure_ascii=False, indent=2)

    if market == "KR":
        lines = [
            f"당신은 {market} 시장 모멘텀 스캐너 어시스턴트입니다.",
            f"최대 보유 기간은 {horizon_days} 거래일입니다.",
            "",
            "핵심 지침:",
            "- 시장 상황이나 후보 종목의 상태가 좋지 않을 때는 억지로 신규 진입을 추천하지 마십시오.",
            "- 최종 판단은 상황에 따라 '신규 진입(NEW_ENTRY)', '관심종목 관찰(WATCHLIST_ONLY)', '현금 관망(CASH)' 또는 보유 종목에 대한 '보유(HOLD)/비중축소(TRIM)/청산(EXIT)' 중 하나가 될 수 있습니다.",
            "",
            "출력 형식 (반드시 지킬 것):",
            "[1] 시장 판단",
            "- CASH (현금 대기) / WATCHLIST_ONLY (관심종목 관찰) / NEW_ENTRY (신규 진입)",
            "",
            "[2] 신규 진입 승인 후보 (최대 3개)",
            "- 적합한 종목이 없으면 '없음'으로 기재",
            "",
            "[3] 관심종목 (타점 대기)",
            "- 관찰할 가치가 있는 후보만 제시",
            "",
            "[4] 보유 종목 판단",
            "- HOLD / TRIM / EXIT",
            "",
            "다음 패키지 필드 데이터를 최우선으로 참고하세요:",
            "- market_decision",
            "- approved_candidates",
            "- watchlist_candidates",
            "- positions_review",
            f"- scan_setup: {(scan_setup.get('scan_label') or scan_setup.get('scan_profile') or 'default')} / {(scan_setup.get('scan_note') or 'no note')}",
            "",
            f"시장 판단 힌트: {json.dumps(decision, ensure_ascii=False)}",
            "",
            "[DATA_PACKAGE_JSON_BEGIN]",
            payload,
            "[DATA_PACKAGE_JSON_END]",
        ]
    else:
        lines = [
            f"You are an expert {market} momentum scanner assistant.",
            f"The maximum holding period is {horizon_days} trading days.",
            "",
            "CRITICAL INSTRUCTIONS:",
            "- Do NOT force a new stock recommendation when the market or candidate quality is weak.",
            "- Your final decision may validly be NEW_ENTRY, WATCHLIST_ONLY, CASH, or HOLD/TRIM/EXIT for held positions.",
            "",
            "Output format (You must strictly follow this):",
            "[1] Market Decision",
            "- CASH / WATCHLIST_ONLY / NEW_ENTRY",
            "",
            "[2] Approved New Entries (Max 3)",
            "- If none, state 'None'",
            "",
            "[3] Watchlist Candidates",
            "- List candidates worth observing",
            "",
            "[4] Held Positions Review",
            "- HOLD / TRIM / EXIT",
            "",
            "Prioritize these data fields from the payload:",
            "- market_decision",
            "- approved_candidates",
            "- watchlist_candidates",
            "- positions_review",
            f"- scan_setup: {(scan_setup.get('scan_label') or scan_setup.get('scan_profile') or 'default')} / {(scan_setup.get('scan_note') or 'no note')}",
            "",
            f"Market decision hint: {json.dumps(decision, ensure_ascii=False)}",
            "",
            "[DATA_PACKAGE_JSON_BEGIN]",
            payload,
            "[DATA_PACKAGE_JSON_END]",
        ]
    return "\n".join(lines)


def _build_single_report(d: Dict[str, Any], macro: Optional[List[Dict[str, Any]]] = None) -> str:
    now_et = _now_et()
    now_kst = _now_kst()

    q = d.get("quote", {}) or {}
    stats = d.get("stats", {}) or {}
    lv = d.get("levels", {}) or {}
    plan = d.get("trade_plan_like", {}) or {}
    news = d.get("news", []) or []
    sec = d.get("sec_filings_last_7d", []) or []
    extras = d.get("extras", {}) or {}
    qs = (extras.get("quote_summary") or {})
    opt = (extras.get("options") or {})
    kr_flow = (extras.get("kr_flow") or {})
    kr_short = (extras.get("kr_short") or {})

    horizon = int(d.get("horizon_days") or 5)
    market = d.get("market") or "US"

    lines: List[str] = []
    lines.append(f"현재 시각 ET: {_fmt_dt(now_et)}")
    lines.append(f"현재 시각 KST: {_fmt_dt(now_kst)}")
    source_hint = "Naver Finance best-effort" if market == "KR" else "Yahoo/SEC best-effort"
    lines.append(f"시장: {market} / 세션: {d.get('session', 'Unknown')} ({source_hint})")
    lines.append(f"기준 보유 기간: 최대 {horizon} 거래일")
    lines.append("")
    lines.append("단일 종목 참고 리포트:")
    lines.append("- 왜 후보인지 / 왜 아닌지 먼저 확인")
    lines.append("- 규칙 기반 수치와 리스크를 함께 확인")
    lines.append("- 최종 매매 판단은 별도로 검증")

    if macro:
        lines.append("")
        lines.append("시장 스냅샷:")
        for x in macro:
            lines.append(f"  - {x.get('label')}: {_fnum(x.get('last'))} ({_fmt_pct(x.get('day_chg_pct'))})")
    lines.append("")

    lines.append(f"- 종목: {d.get('symbol')} / {d.get('name')} ({d.get('currency') or 'N/A'})")
    lines.append(
        f"- 현재가: {_fnum(q.get('last'))} / 당일 등락률 {_fmt_pct(q.get('day_chg_pct'))} / 거래량 {_fint(q.get('day_volume'))}"
    )

    lines.append(
        f"- 수익률: 3D {_fmt_pct(stats.get('ret_3d_pct'))} / 5D {_fmt_pct(stats.get('ret_5d_pct'))} / 20D {_fmt_pct(stats.get('ret_20d_pct'))} / 선택 {horizon}D {_fmt_pct(stats.get('ret_horizon_pct'))}"
    )
    lines.append(
        f"- 거래량: 20D 평균 {_fint(stats.get('avg20_volume'))} / 상대거래량 {_fnum(stats.get('rel_vol_20d'))}x"
    )
    lines.append(f"- 변동성: ATR(14) {_fnum(stats.get('atr14'))}")

    if market == "KR" and (kr_flow or kr_short):
        lines.append("")
        lines.append("KR 수급 / 공매도:")
        if kr_flow:
            flow_1d = (kr_flow.get("lookbacks") or {}).get("1d") or {}
            flow_5d = (kr_flow.get("lookbacks") or {}).get("5d") or {}
            flow_20d = (kr_flow.get("lookbacks") or {}).get("20d") or {}
            lines.append(
                "  - 외국인 순매수 수량: "
                f"1D {_fint(flow_1d.get('foreign_net_volume'))} / "
                f"5D {_fint(flow_5d.get('foreign_net_volume'))} / "
                f"20D {_fint(flow_20d.get('foreign_net_volume'))}"
            )
            lines.append(
                "  - 기관 순매수 수량: "
                f"1D {_fint(flow_1d.get('institution_net_volume'))} / "
                f"5D {_fint(flow_5d.get('institution_net_volume'))} / "
                f"20D {_fint(flow_20d.get('institution_net_volume'))}"
            )
            lines.append("  - 개인 수급은 별도 추적 필요")
        if kr_short:
            short_1d = (kr_short.get("lookbacks") or {}).get("1d") or {}
            short_5d = (kr_short.get("lookbacks") or {}).get("5d") or {}
            short_20d = (kr_short.get("lookbacks") or {}).get("20d") or {}
            latest_short = kr_short.get("latest") or {}
            latest_balance = kr_short.get("latest_balance") or {}
            lines.append(
                "  - 공매도 거래량: "
                f"1D {_fint(short_1d.get('short_volume'))} / "
                f"5D {_fint(short_5d.get('short_volume'))} / "
                f"20D {_fint(short_20d.get('short_volume'))}"
            )
            lines.append(
                "  - 최신 공매도 비중: "
                f"거래량 {_fnum(latest_short.get('short_volume_ratio_pct'), 4)}% / "
                f"거래대금 {_fnum(latest_short.get('short_value_ratio_pct'), 4)}%"
            )
            lines.append(
                "  - 공매도 잔고(최신): "
                f"수량 {_fint(latest_balance.get('net_short_balance_qty'))} / "
                f"금액 {_fint(latest_balance.get('net_short_balance_value'))} "
                f"(기준 {latest_balance.get('date') or 'N/A'})"
            )

    if qs or opt:
        lines.append("")
        lines.append("추가 참고 데이터:")
        if qs:
            spf = qs.get("short_percent_of_float")
            sr = qs.get("short_ratio")
            mc = qs.get("market_cap")
            eds = qs.get("earnings_dates")
            if mc is not None:
                lines.append(f"  - 시가총액(참고): {_fint(mc)}")
            if spf is not None or sr is not None:
                lines.append(f"  - Short % of float: {_fnum(spf,4)} / Short ratio: {_fnum(sr,2)}")
            if eds:
                lines.append(f"  - Earnings (ET): {', '.join(eds[:2])}")
        if opt:
            cv = opt.get("call_volume")
            pv = opt.get("put_volume")
            cpr = opt.get("call_put_vol_ratio")
            exp = opt.get("expiration")
            if cv or pv:
                lines.append(f"  - Options (near exp {exp or 'N/A'}): CallVol {_fint(cv)} / PutVol {_fint(pv)} / Call:Put {_fnum(cpr,2)}")

    lines.append("")
    news_label = "최근 뉴스 (Naver Finance):" if market == "KR" else "최근 뉴스 (Yahoo RSS):"
    lines.append(news_label)
    if not news:
        lines.append("  - 확인 불가")
    else:
        for n in news[:3]:
            lines.append(f"  - {n.get('title') or '제목 확인 불가'} ({n.get('published') or '시각 확인 불가'})")

    lines.append("")
    if _is_korea_symbol(str(d.get("symbol") or "")):
        lines.append("SEC (최근 7일): N/A (비미국 종목)")
    else:
        lines.append("SEC (최근 7일):")
        if not sec:
            lines.append("  - 없음 / 확인 불가")
        else:
            for s in sec[:6]:
                lines.append(f"  - {s.get('form')} / filingDate={s.get('filingDate')} / reportDate={s.get('reportDate') or 'N/A'}")

    lines.append("")
    lines.append("차트 레벨:")
    lines.append(f"  - 20D 저항: {_fnum(lv.get('resistance_20d'))}")
    lines.append(f"  - 20D 지지: {_fnum(lv.get('support_20d'))}")
    lines.append(f"  - 당일 고가 / 저가: {_fnum(lv.get('day_high'))} / {_fnum(lv.get('day_low'))}")

    lines.append("")
    lines.append("규칙 기반 플랜(보조):")
    lines.append(f"  - 진입 트리거: {_fnum(plan.get('entry_trigger'))}")
    lines.append(f"  - 손절 기준: {_fnum(plan.get('stop'))}")
    lines.append(f"  - 목표가: {_fnum(plan.get('target'))}")
    lines.append(f"  - 보유 한도: 최대 {plan.get('hold_days_max', horizon)} 거래일 / 시간 손절: {plan.get('time_stop')}")

    lines.append("")
    lines.append("주의: 참고용 출력입니다. 데이터 지연/누락 가능성이 있으며 최종 판단 책임은 사용자에게 있습니다.")

    return "\n".join(lines)


@app.get("/report/{symbol}", response_class=PlainTextResponse)
async def report(symbol: str, market: str = Query(default="US"), horizon_days: int = Query(default=5)) -> str:
    d = await ticker_detail(symbol, market=market, horizon_days=horizon_days)
    macro = await _fetch_macro_snapshot(market)
    return _build_single_report(d, macro=macro)


@app.get("/report_multi_data")
async def report_multi_data(
    symbols: str = Query(..., description="Comma-separated symbols"),
    market: str = Query(default="US"),
    horizon_days: int = Query(default=5),
    max_items: int = Query(default=5, ge=1, le=10),
    scan_profile: str = Query(default=""),
    scan_label: str = Query(default=""),
    scan_note: str = Query(default=""),
    scan_thresholds: str = Query(default=""),
    selected_meta: str = Query(default=""),
    held_symbols: str = Query(default=""),
) -> Dict[str, Any]:
    market_u = (market or "US").upper().strip()
    if market_u == "KR":
        symbols = await _resolve_kr_input_text(symbols)
        if (held_symbols or "").strip():
            held_symbols = await _resolve_kr_input_text(held_symbols)
    details, errors = await _collect_symbol_details(
        symbols,
        market=market,
        horizon_days=horizon_days,
        max_items=max_items,
    )
    if horizon_days not in (5, 20):
        horizon_days = 5 if horizon_days < 12 else 20
    macro = await _fetch_macro_snapshot(market_u)
    market_decision = _compute_market_decision(market_u, macro)

    approved_candidates: List[Dict[str, Any]] = []
    watchlist_candidates: List[Dict[str, Any]] = []
    for d in details:
        sym = str(d.get("symbol") or "")
        if not sym:
            continue
        score = _score_breakdown_detail(d).get("total", 0.0)
        reasons = list(d.get("scan_reason") or [])
        status = "APPROVED_NEW"
        if not bool(market_decision.get("new_entries_allowed", True)):
            status = "WATCHLIST_ONLY"
            reasons.append("market risk-off blocks new entries")
        else:
            soft_block = False
            if market_u == "KR":
                if not (d.get("news") or []):
                    soft_block = True
                    reasons.append("missing news")
                flow_5d = (((d.get("extras") or {}).get("kr_flow") or {}).get("lookbacks") or {}).get("5d") or {}
                signed_5d = _to_float(flow_5d.get("foreign_net_volume"), 0.0) + _to_float(flow_5d.get("institution_net_volume"), 0.0)
                if signed_5d <= 0:
                    soft_block = True
                    reasons.append("negative flow")
                close_pos = ((d.get("stats") or {}).get("close_position"))
                if close_pos is None or float(close_pos) < KR_SWING_DEFAULTS["close_position_min"]:
                    soft_block = True
                    reasons.append("weak close position")
            if soft_block:
                status = "WATCHLIST_ONLY"

        row = {
            "symbol": sym,
            "name": d.get("name"),
            "score": round(float(score), 2),
            "entry_status": status,
            "entry_reason": list(dict.fromkeys(reasons)),
        }
        if status == "APPROVED_NEW":
            approved_candidates.append(row)
        else:
            watchlist_candidates.append(row)

    effective_new_entries = bool(market_decision.get("new_entries_allowed", False) and approved_candidates)
    market_decision = dict(market_decision)
    market_decision["new_entries_allowed"] = effective_new_entries
    if not effective_new_entries:
        market_decision["recommended_action"] = "CASH" if market_decision.get("regime") == "NO_TRADE" else "WATCHLIST_ONLY"

    positions_review = []
    if (held_symbols or "").strip():
        positions_review = await _review_positions_impl(
            held_symbols=held_symbols,
            market=market_u,
            market_decision=market_decision,
            max_items=20,
        )

    return _build_data_package(
        details,
        market=market_u,
        horizon_days=horizon_days,
        macro=macro,
        errors=errors,
        scan_context={
            "scan_profile": scan_profile,
            "scan_label": scan_label,
            "scan_note": scan_note,
            "thresholds": _parse_scan_thresholds(scan_thresholds),
        },
        selected_meta=_parse_selected_meta(selected_meta),
        market_decision=market_decision,
        approved_candidates=approved_candidates,
        watchlist_candidates=watchlist_candidates,
        positions_review=positions_review,
    )


@app.get("/prompt/{symbol}", response_class=PlainTextResponse)
async def prompt_single(
    symbol: str,
    market: str = Query(default="US"),
    horizon_days: int = Query(default=5),
    scan_profile: str = Query(default=""),
    scan_label: str = Query(default=""),
    scan_note: str = Query(default=""),
    scan_thresholds: str = Query(default=""),
) -> str:
    d = await ticker_detail(symbol, market=market, horizon_days=horizon_days)
    if horizon_days not in (5, 20):
        horizon_days = 5 if horizon_days < 12 else 20
    macro = await _fetch_macro_snapshot(market)
    pkg = _build_data_package(
        [d],
        market=market,
        horizon_days=horizon_days,
        macro=macro,
        errors=[],
        scan_context={
            "scan_profile": scan_profile,
            "scan_label": scan_label,
            "scan_note": scan_note,
            "thresholds": _parse_scan_thresholds(scan_thresholds),
        },
    )
    return _build_ai_prompt_from_package(pkg)


@app.get("/prompt_multi", response_class=PlainTextResponse)
async def prompt_multi(
    symbols: str = Query(..., description="Comma-separated symbols"),
    market: str = Query(default="US"),
    horizon_days: int = Query(default=5),
    max_items: int = Query(default=5, ge=1, le=10),
    scan_profile: str = Query(default=""),
    scan_label: str = Query(default=""),
    scan_note: str = Query(default=""),
    scan_thresholds: str = Query(default=""),
    selected_meta: str = Query(default=""),
    held_symbols: str = Query(default=""),
) -> str:
    pkg = await report_multi_data(
        symbols=symbols,
        market=market,
        horizon_days=horizon_days,
        max_items=max_items,
        scan_profile=scan_profile,
        scan_label=scan_label,
        scan_note=scan_note,
        scan_thresholds=scan_thresholds,
        selected_meta=selected_meta,
        held_symbols=held_symbols,
    )
    return _build_ai_prompt_from_package(pkg)


@app.get("/report_multi", response_class=PlainTextResponse)
async def report_multi(
    symbols: str = Query(..., description="Comma-separated symbols"),
    market: str = Query(default="US"),
    horizon_days: int = Query(default=5),
    max_items: int = Query(default=5, ge=1, le=10),
) -> str:
    syms = [s.strip().upper() for s in (symbols or "").split(",") if s.strip()]
    if not syms:
        raise HTTPException(status_code=400, detail="symbols required")

    if horizon_days not in (5, 20):
        horizon_days = 5 if horizon_days < 12 else 20

    # cap
    syms = syms[:max_items]

    now_et = _now_et()
    now_kst = _now_kst()

    # Build details concurrently, but keep it polite.
    sem = asyncio.Semaphore(4)

    async def get_one(s: str) -> Tuple[str, Optional[Dict[str, Any]], Optional[str]]:
        async with sem:
            try:
                d = await ticker_detail(s, market=market, horizon_days=horizon_days)
                return s, d, None
            except Exception as e:
                return s, None, str(e)

    tasks = [get_one(s) for s in syms]
    results = await asyncio.gather(*tasks)

    ok_details: List[Dict[str, Any]] = []
    errors: List[str] = []
    for s, d, err in results:
        if d is not None:
            ok_details.append(d)
        else:
            errors.append(f"- {s}: {err or '확인 불가'}")

    # header
    lines: List[str] = []
    lines.append(f"현재 시간 ET: {_fmt_dt(now_et)}")
    lines.append(f"현재 시간 KST: {_fmt_dt(now_kst)}")
    lines.append(f"리포트 모드: 다종목 일괄 / 기준 {horizon_days} 거래일 (보유기한 최대 {horizon_days} 거래일)")
    lines.append(f"종목: {', '.join([d.get('symbol') for d in ok_details])}")
    lines.append("")
    lines.append("AI 판단 요청(복합):")
    lines.append("아래 데이터로 진입/관망, 목표가, 손절가, 우선순위 TOP3를 제시하세요.")
    lines.append("핵심: 점수(total/세부) + 매크로 + 이벤트 리스크를 함께 반영.")

    macro = await _fetch_macro_snapshot(market)
    if macro:
        lines.append("")
        lines.append("매크로 체크(당일):")
        for x in macro:
            lines.append(f"- {x.get('label')}: {_fnum(x.get('last'))} ({_fmt_pct(x.get('day_chg_pct'))})")

    if errors:
        lines.append("")
        lines.append("불러오기 실패:")
        lines.extend(errors)

    def _to_float(x: Any, default: float = 0.0) -> float:
        try:
            return float(x)
        except Exception:
            return default

    def _score_breakdown(d: Dict[str, Any]) -> Dict[str, float]:
        q = d.get("quote", {}) or {}
        st = d.get("stats", {}) or {}
        ex = d.get("extras", {}) or {}
        qs = (ex.get("quote_summary") or {})
        opt = (ex.get("options") or {})
        kr_flow = (ex.get("kr_flow") or {})
        kr_short = (ex.get("kr_short") or {})

        relv = _to_float(st.get("rel_vol_20d"), 0.0)
        hret = _to_float(st.get("ret_horizon_pct"), -50.0)
        dayp = _to_float(q.get("day_chg_pct"), 0.0)
        atr = _to_float(st.get("atr14"), 0.0)
        last = _to_float(q.get("last"), 0.0)
        vol = _to_float(q.get("day_volume"), 0.0)
        turnover = last * vol
        call_put = _to_float(opt.get("call_put_vol_ratio"), 1.0)
        short_ratio = _to_float(qs.get("short_ratio"), 0.0)
        short_float = _to_float(qs.get("short_percent_of_float"), 0.0)

        atr_pct = (atr / last * 100.0) if last > 0 and atr > 0 else 0.0

        momentum = 0.0
        momentum += max(-20.0, min(25.0, hret)) * 1.8
        momentum += max(-8.0, min(10.0, dayp)) * 1.2

        liquidity = 0.0
        liquidity += min(4.0, relv) * 14.0
        if turnover >= 1_000_000_000:
            liquidity += 18.0
        elif turnover >= 300_000_000:
            liquidity += 12.0
        elif turnover >= 100_000_000:
            liquidity += 7.0

        flow_proxy = 0.0
        if str(d.get("market") or "").upper() == "KR" and (kr_flow or kr_short):
            flow_1d = (kr_flow.get("lookbacks") or {}).get("1d") or {}
            flow_5d = (kr_flow.get("lookbacks") or {}).get("5d") or {}
            latest_short = (kr_short.get("latest") or {})
            short_ratio_vol = _to_float(latest_short.get("short_volume_ratio_pct"), 0.0)

            flow_proxy += _signed_flow_score(flow_1d, flow_5d)
            if short_ratio_vol >= 8.0:
                flow_proxy -= 2.0
            elif short_ratio_vol >= 5.0:
                flow_proxy -= 1.0
        else:
            flow_proxy += max(0.0, min(3.0, call_put)) * 7.0
            flow_proxy += max(0.0, min(12.0, short_float)) * 1.1
            if short_ratio >= 5.0:
                flow_proxy += 4.0

        risk = 0.0
        if atr_pct > 7.0:
            risk += 16.0
        elif atr_pct > 5.0:
            risk += 9.0
        elif atr_pct > 3.5:
            risk += 4.0
        if relv < 0.7:
            risk += 5.0

        total = momentum + liquidity + flow_proxy - risk
        return {
            "total": round(total, 1),
            "momentum": round(momentum, 1),
            "liquidity": round(liquidity, 1),
            "flow_proxy": round(flow_proxy, 1),
            "risk_penalty": round(risk, 1),
            "turnover": turnover,
            "atr_pct": atr_pct,
        }

    def _spread_pct(q: Dict[str, Any]) -> Optional[float]:
        b = q.get("bid")
        a = q.get("ask")
        try:
            bf = float(b)
            af = float(a)
            if bf > 0 and af > 0:
                return (af / bf - 1.0) * 100.0
        except Exception:
            return None
        return None

    def _risk_flags(d: Dict[str, Any], score: Dict[str, float]) -> str:
        flags: List[str] = []
        q = d.get("quote", {}) or {}
        ex = d.get("extras", {}) or {}
        qs = (ex.get("quote_summary") or {})
        sec = d.get("sec_filings_last_7d", []) or []
        spread = _spread_pct(q)
        eds = qs.get("earnings_dates") or []
        if eds:
            flags.append("실적일정")
        if spread is not None and spread > 0.35:
            flags.append("스프레드넓음")
        if score.get("atr_pct", 0.0) > 6.0:
            flags.append("변동성높음")
        if sec:
            flags.append(f"SEC{len(sec)}건")
        return ",".join(flags) if flags else "없음"

    def _macro_regime(macro_rows: List[Dict[str, Any]], market_code: str) -> str:
        m = {str(x.get("label")): x for x in (macro_rows or [])}
        if market_code.upper() == "US":
            spy = _to_float((m.get("SPY") or {}).get("day_chg_pct"), 0.0)
            qqq = _to_float((m.get("QQQ") or {}).get("day_chg_pct"), 0.0)
            vix = _to_float((m.get("VIX") or {}).get("day_chg_pct"), 0.0)
            if spy > 0 and qqq > 0 and vix <= 0:
                return "RISK_ON"
            if spy < 0 and qqq < 0 and vix > 0:
                return "RISK_OFF"
            return "MIXED"
        kospi = _to_float((m.get("KOSPI") or {}).get("day_chg_pct"), 0.0)
        kosdaq = _to_float((m.get("KOSDAQ") or {}).get("day_chg_pct"), 0.0)
        usdkrw = _to_float((m.get("USD/KRW") or {}).get("day_chg_pct"), 0.0)
        if kospi > 0 and kosdaq > 0 and usdkrw <= 0:
            return "RISK_ON"
        if kospi < 0 and kosdaq < 0 and usdkrw > 0:
            return "RISK_OFF"
        return "MIXED"

    # 비교 테이블(리포트 출력용): AI가 바로 인식할 수 있는 구조화 데이터
    lines.append("")
    lines.append("비교 요약(배치 리포트):")
    lines.append("SYMBOL | TOTAL | MOM | LIQ | FLOW | RISK- | HRET | DAY | RELVOL | ATR% | SPREAD% | TURNOVER | EVENT")
    ranked: List[Tuple[float, Dict[str, Any], Dict[str, float]]] = []
    for d in ok_details:
        q = d.get("quote", {}) or {}
        st = d.get("stats", {}) or {}
        sc = _score_breakdown(d)
        event = _risk_flags(d, sc)
        spread = _spread_pct(q)
        ranked.append((sc["total"], d, sc))
        lines.append(
            f"{d.get('symbol')} | {sc['total']} | {sc['momentum']} | {sc['liquidity']} | {sc['flow_proxy']} | {sc['risk_penalty']} | "
            f"{_fmt_pct(st.get('ret_horizon_pct'))} | {_fmt_pct(q.get('day_chg_pct'))} | {_fnum(st.get('rel_vol_20d'))}x | "
            f"{_fnum(sc.get('atr_pct'))}% | {_fnum(spread,3) if spread is not None else '확인 불가'} | {_fint(sc['turnover'])} | {event}"
        )

    ranked.sort(key=lambda x: x[0], reverse=True)
    if ranked:
        best = ranked[0][1]
        top3 = [x[1].get("symbol") for x in ranked[:3]]
        lines.append("")
        lines.append(f"우선순위 TOP3: {', '.join([str(x) for x in top3])}")
        lines.append(f"1순위 후보: {best.get('symbol')} (珥앹젏 {ranked[0][0]})")
        if market.upper() == "KR":
            lines.append("二쇱쓽: KR? ?멸뎅??湲곌? ?먮뜲?댄꽣? 怨듬ℓ???곗씠?곕? ?ы븿?⑸땲?? 媛쒖씤 ?쒕ℓ?섎뒗 확인 불가?낅땲??")
        else:
            lines.append("주의: FLOW는 기관/외국인 순매수 데이터가 아닌 프록시 거래강도/옵션/숏비율 등입니다.")

    # 종목별 AI 해석 블록
    lines.append("")
    lines.append("종목별 해석 입력(요약):")
    for total, d, sc in ranked:
        q = d.get("quote", {}) or {}
        st = d.get("stats", {}) or {}
        lv = d.get("levels", {}) or {}
        plan = d.get("trade_plan_like", {}) or {}
        ex = d.get("extras", {}) or {}
        qs = (ex.get("quote_summary") or {})
        opt = (ex.get("options") or {})
        kr_flow = (ex.get("kr_flow") or {})
        kr_short = (ex.get("kr_short") or {})
        news = d.get("news", []) or []
        sec = d.get("sec_filings_last_7d", []) or []
        lines.append("-" * 42)
        lines.append(
            f"[{d.get('symbol')}] total={total} (mom={sc['momentum']}, liq={sc['liquidity']}, flow={sc['flow_proxy']}, risk={sc['risk_penalty']})"
        )
        lines.append(
            f"price={_fnum(q.get('last'))}, day={_fmt_pct(q.get('day_chg_pct'))}, hret={_fmt_pct(st.get('ret_horizon_pct'))}, relvol={_fnum(st.get('rel_vol_20d'))}x, atr={_fnum(st.get('atr14'))} ({_fnum(sc.get('atr_pct'))}%)"
        )
        lines.append(
            f"levels: resist20={_fnum(lv.get('resistance_20d'))}, support20={_fnum(lv.get('support_20d'))}, dayHL={_fnum(lv.get('day_high'))}/{_fnum(lv.get('day_low'))}"
        )
        lines.append(
            f"plan_ref: entry={_fnum(plan.get('entry_trigger'))}, stop={_fnum(plan.get('stop'))}, target={_fnum(plan.get('target'))}"
        )
        if str(d.get("market") or "").upper() == "KR" and (kr_flow or kr_short):
            flow_1d = (kr_flow.get("lookbacks") or {}).get("1d") or {}
            flow_5d = (kr_flow.get("lookbacks") or {}).get("5d") or {}
            short_1d = (kr_short.get("lookbacks") or {}).get("1d") or {}
            latest_short = kr_short.get("latest") or {}
            lines.append(
                "kr_flow_details: "
                f"foreign_1d={_fint(flow_1d.get('foreign_net_volume'))}, "
                f"inst_1d={_fint(flow_1d.get('institution_net_volume'))}, "
                f"foreign_5d={_fint(flow_5d.get('foreign_net_volume'))}, "
                f"inst_5d={_fint(flow_5d.get('institution_net_volume'))}, "
                "individual=확인 불가"
            )
            lines.append(
                "kr_short_details: "
                f"short_1d={_fint(short_1d.get('short_volume'))}, "
                f"short_ratio_vol={_fnum(latest_short.get('short_volume_ratio_pct'),4)}%, "
                f"net_balance_qty={_fint(latest_short.get('net_short_balance_qty'))}"
            )
        else:
            lines.append(
                f"flow_proxy_details: turnover={_fint(sc['turnover'])}, call_put={_fnum(opt.get('call_put_vol_ratio'))}, short_float={_fnum(qs.get('short_percent_of_float'),4)}, short_ratio={_fnum(qs.get('short_ratio'))}"
            )
        if qs.get("earnings_dates"):
            lines.append(f"event: earnings={', '.join((qs.get('earnings_dates') or [])[:2])}")
        if sec:
            lines.append(f"event: sec_forms={', '.join([(x.get('form') or 'N/A') for x in sec[:3]])}")
        if news:
            lines.append(f"news_headline_1: {(news[0].get('title') or '확인 불가')}")

    lines.append("")
    lines.append(f"매크로 레짐 추정: {_macro_regime(macro, market)}")
    lines.append("AI 출력 요청 형식(필수):")
    lines.append("[종목] 진입/관망 | 진입가 | 손절가 | 목표가 | 투자우선순위(1~3) | 확신도 | 근거(거시/수급프록시/레벨)")

    return "\n".join(lines)


# Serve the mobile web UI (mounted last so it doesn't shadow /api routes).
app.mount(
    "/",
    StaticFiles(directory=str((__import__("pathlib").Path(__file__).parent / "static").resolve()), html=True),
    name="static",
)


@app.on_event("shutdown")
async def _shutdown() -> None:
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None

