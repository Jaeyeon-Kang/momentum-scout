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
    "market_cap_min": 500_000_000_000.0,
    "avg20_turnover_min": 15_000_000_000.0,
    "today_turnover_min": 30_000_000_000.0,
    "rel_volume_min": 1.8,
    "ret_5d_min": 8.0,
    "ret_5d_max": 30.0,
    "close_position_min": 0.70,
    "fresh_news_hours": 48.0,
}


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
        for suffix in (" : 네이버페이 증권", " : 네이버 증권"):
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
    text = text.replace("%", "").replace("배", "")
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

    prev_close = _parse_num_str(_extract_blind_value(block, "전일"))
    open_ = _parse_num_str(_extract_blind_value(block, "시가"))
    high = _parse_num_str(_extract_blind_value(block, "고가"))
    low = _parse_num_str(_extract_blind_value(block, "저가"))
    volume = _parse_int_str(_extract_blind_value(block, "거래량"))
    turnover_million = _parse_num_str(_extract_blind_value(block, "거래대금"))
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
        r'<table[^>]+summary="외국인 기관 순매매 거래량에 관한표이며 날짜별로 정보를 제공합니다\."[^>]*>(.*?)</table>',
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
        "note": "외국인/기관 순매매는 확인되지만 개인 순매수는 현재 확인 불가입니다.",
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
        "note": "순보유잔고는 KRX 보고 기준 T+2 지연이 반영될 수 있습니다.",
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
    direct_mode: bool = Query(default=False, description="When true with symbols, bypass hard filters and include symbols directly."),
    us_market_cap_min: float = Query(default=2_000_000_000.0, ge=0.0),
    us_day_turnover_min: float = Query(default=25_000_000.0, ge=0.0),
    us_rel_volume_min: float = Query(default=1.2, ge=0.0),
    us_exclude_etf: bool = Query(default=True),
    top_n: int = Query(default=10, ge=1, le=25),
) -> Dict[str, Any]:
    """Returns momentum candidates for short swing (5 trading days default). No keys."""

    market_u = market.upper().strip()
    if market_u not in ("US", "KR"):
        raise HTTPException(status_code=400, detail="market must be US or KR")

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
            if not kr_rows:
                universe = list(_KR_FALLBACK_SYMBOLS)
                universe_source = "kr_fallback"
            else:
                turnover_bucket = sorted(
                    kr_rows,
                    key=lambda r: float(r.get("day_turnover") or 0.0),
                    reverse=True,
                )[:180]
                mover_bucket = sorted(
                    [
                        r for r in kr_rows
                        if float(r.get("day_turnover") or 0.0) >= scan_defaults["today_turnover_min"]
                    ],
                    key=lambda r: float(r.get("day_chg_pct") or 0.0),
                    reverse=True,
                )[:120]
                base_bucket = sorted(
                    [
                        r for r in kr_rows
                        if float(r.get("day_turnover") or 0.0) >= (scan_defaults["avg20_turnover_min"] * 0.6)
                    ],
                    key=lambda r: (float(r.get("day_turnover") or 0.0), float(r.get("day_chg_pct") or 0.0)),
                    reverse=True,
                )[:160]
                union_rows: List[Dict[str, Any]] = []
                seen_syms: set[str] = set()
                for bucket in (turnover_bucket, mover_bucket, base_bucket, kr_rows[:120]):
                    for row in bucket:
                        sym = str(row.get("symbol") or "")
                        if not sym or sym in seen_syms:
                            continue
                        seen_syms.add(sym)
                        union_rows.append(row)
                universe = [str(r["symbol"]) for r in union_rows]
                kr_seed_map = {str(r["symbol"]): r for r in union_rows}
                universe_source = "naver_market_sum_union"

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
            }

            if market_cap is None or float(market_cap) < scan_defaults["market_cap_min"]:
                rejection_flags.append("시총 하한 미달")
            if day_turnover is None or float(day_turnover) < scan_defaults["today_turnover_min"]:
                rejection_flags.append("당일 거래대금 부족")
            if rel_vol_20d is None or float(rel_vol_20d) < scan_defaults["rel_volume_min"]:
                rejection_flags.append("상대거래량 부족")
            if ret_5d_pct is None or float(ret_5d_pct) < scan_defaults["ret_5d_min"]:
                rejection_flags.append("5일 수익률 약함")
            elif float(ret_5d_pct) > scan_defaults["ret_5d_max"]:
                rejection_flags.append("과열 구간")
            if close_position is None or float(close_position) < scan_defaults["close_position_min"]:
                rejection_flags.append("종가 위치 약함")
            if gap_pct is not None and gap_pct >= 12.0:
                rejection_flags.append("갭 과열")

            if day_turnover is not None and day_turnover >= scan_defaults["today_turnover_min"]:
                scan_reason.append("당일 거래대금 기준 통과")
            if rel_vol_20d is not None and rel_vol_20d >= scan_defaults["rel_volume_min"]:
                scan_reason.append("상대거래량 기준 통과")
            if extras["breakout_20d"]:
                scan_reason.append("20일 고점 돌파")
            if extras["close_near_high"]:
                scan_reason.append("종가 고가권 안착")

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
        discovered = (cands if explicit else [c for c in cands if not c.rejection_flags])[:48]
        if not discovered:
            discovered = sorted(
                cands,
                key=lambda c: (
                    _to_float(c.extras.get("turnover_ratio_20d"), 0.0),
                    _to_float(c.day_turnover, 0.0),
                    _to_float(c.ret_5d_pct, 0.0),
                ),
                reverse=True,
            )[:24]

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
                scan_reason.append("외국인/기관 수급 부호 양호")
            elif signed_flow < 0:
                rejection_flags.append("수급 엇갈림")
            if news_items and news_age_hours is not None and news_age_hours <= scan_defaults["fresh_news_hours"]:
                scan_reason.append("48시간 내 뉴스 확인")
            else:
                rejection_flags.append("촉매 약함")

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

    # market context (best-effort)
    context: Dict[str, Any] = {}
    try:
        if market_u == "US":
            ctx = await fetch_yahoo_quote(["SPY", "QQQ"], region="US")
            def ctx_pct(t: str) -> Optional[float]:
                q = ctx.get(t) or {}
                p = q.get("regularMarketPrice")
                pc = q.get("regularMarketPreviousClose")
                if p is None or pc is None:
                    return None
                try:
                    return _safe_pct(float(p), float(pc))
                except Exception:
                    return None
            context = {"SPY_day_chg_pct": ctx_pct("SPY"), "QQQ_day_chg_pct": ctx_pct("QQQ")}
        else:
            # indices (Yahoo): ^KS11(KOSPI), ^KQ11(KOSDAQ)
            ctx = await fetch_yahoo_quote(["^KS11", "^KQ11"], region="KR")
            def ctx_pct(t: str) -> Optional[float]:
                q = ctx.get(t) or {}
                p = q.get("regularMarketPrice")
                pc = q.get("regularMarketPreviousClose")
                if p is None or pc is None:
                    return None
                try:
                    return _safe_pct(float(p), float(pc))
                except Exception:
                    return None
            context = {"KOSPI_day_chg_pct": ctx_pct("^KS11"), "KOSDAQ_day_chg_pct": ctx_pct("^KQ11")}
    except Exception:
        context = {}

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
            "direct_mode": direct_override,
            "us_market_cap_min": us_defaults["market_cap_min"],
            "us_day_turnover_min": us_defaults["day_turnover_min"],
            "us_rel_volume_min": us_defaults["rel_volume_min"],
            "us_exclude_etf": us_defaults["exclude_etf"],
        },
        "scan_defaults": scan_defaults or None,
        "context": context,
        "note": "Educational prototype. Not financial advice. Data best-effort and may be delayed/incomplete.",
        "candidates": [
            {
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
                "extras": c.extras,
                "scan_reason": c.scan_reason,
                "rejection_flags": c.rejection_flags,
            }
            for c in cands
        ],
    }
    return out


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


def _build_data_package(
    details: List[Dict[str, Any]],
    *,
    market: str,
    horizon_days: int,
    macro: List[Dict[str, Any]],
    errors: Optional[List[str]] = None,
    scan_context: Optional[Dict[str, Any]] = None,
    selected_meta: Optional[Dict[str, Dict[str, Any]]] = None,
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
        "macro": macro,
        "macro_asof_kst": _fmt_dt(_now_kst()),
        "scan_setup": scan_context or {},
        "selected_symbols": selected_symbols,
        "errors": errors or [],
        "notes": [
            "데이터 중심 패키지입니다.",
            "미국 가격/차트는 Yahoo public endpoint best-effort 기준입니다.",
            "한국 가격/차트/뉴스/종목명은 Naver Finance best-effort 기준입니다.",
            "한국 수급은 외국인/기관 순매매와 공매도 데이터를 포함합니다.",
            "개인 순매수는 현재 확인 불가로 남깁니다.",
        ],
        "candidates": candidates,
    }


def _build_ai_prompt_from_package(pkg: Dict[str, Any]) -> str:
    market = str(pkg.get("market") or "US").upper().strip()
    horizon_days = int(pkg.get("horizon_days") or 5)
    candidates = pkg.get("candidates") or []
    scan_setup = pkg.get("scan_setup") or {}
    interest = ", ".join(
        [f"{c.get('name') or '이름 확인 불가'}({c.get('symbol')})" for c in candidates]
    ) or "없음"
    payload = json.dumps(pkg, ensure_ascii=False, indent=2)

    if market == "KR":
        lines = [
            "너는 한국 주식 단기 모멘텀 분석기다.",
            "",
            "목표:",
            "- KRX 전체에서 다음 거래일에 강한 추세 지속 또는 급등 확률이 가장 높은 종목을 찾는다.",
            "- 단, 저유동성 잡주나 단순 펌프성 종목은 피한다.",
            "- 공격적이되, 거래대금과 촉매와 수급이 확인되는 종목을 우선한다.",
            "",
            "중요 원칙:",
            "1. 아래 데이터 패키지는 출발점이지 검색 범위의 한계가 아니다.",
            "2. 브라우징/웹검색 기능이 있으면 반드시 최신 시세, 뉴스, 공시, 거래소/증권사 정보를 다시 확인하라.",
            "3. 데이터 패키지에 없는 종목이 더 좋으면 그 종목을 추천하라.",
            "4. 브라우징 기능이 없으면 그 제한을 먼저 밝히고, 패키지 내부 데이터만으로 판단하라.",
            "5. 모든 시간은 KST 기준으로 처리하라.",
            "6. 확인되지 않은 정보는 추정하지 말고 '확인 불가'라고 적어라.",
            "7. 수급은 반드시 부호를 반영하라. 순매도는 가산점이 아니다.",
            "8. 거래량보다 거래대금을 더 중요하게 보라.",
            "9. 가격 자체보다 시가총액, 거래대금, 촉매 신선도, 종가 위치를 더 중요하게 보라.",
            "",
            "우선순위:",
            "- 오늘 거래대금이 크고 최근 평균보다 확실히 증가한 종목",
            "- 최근 48시간 내 뉴스/공시/이벤트 등 신선한 촉매가 있는 종목",
            "- 외국인/기관 순매수 부호가 긍정적인 종목",
            "- 20일/60일 고점 돌파 또는 전고 돌파 후 종가가 고가권에서 끝난 종목",
            "- KOSPI/KOSDAQ 전체에서 테마/섹터 강도가 동반되는 종목",
            "- 중대형주 또는 최소한 유동성이 충분한 종목",
            "",
            "감점/제외:",
            "- 거래대금이 부족한 종목",
            "- 전일 급등 후 당일 종가가 약하거나 윗꼬리가 과한 종목",
            "- 촉매가 불명확한 종목",
            "- 저유동성, 과도한 변동성, 관리/경고성 리스크가 있는 종목",
            "- 단순히 이미 많이 올랐다는 이유만으로 유지되는 종목",
            "",
            "분석 절차:",
            "1. 현재 KST 시각을 먼저 적어라.",
            "2. 데이터 패키지의 각 timestamp/as-of를 먼저 확인하라.",
            "3. 패키지 내 후보를 검토하라.",
            "4. 가능하면 패키지 밖에서도 더 나은 종목이 있는지 KRX 전체 기준으로 재탐색하라.",
            "5. 최종적으로 상위 3개를 뽑고, 그중 1개를 최종 선택하라.",
            "6. 패키지 후보를 탈락시킨 경우 이유를 적어라.",
            "",
            f"사용자 조건: 공격적 단기 스윙 / 최대 보유 {horizon_days}거래일 / 관심 후보 {interest}",
            f"탐색 조건: {(scan_setup.get('scan_label') or scan_setup.get('scan_profile') or '기본')} / {(scan_setup.get('scan_note') or '설명 없음')}",
            "",
            "출력 형식:",
            "[1] 현재 시각 및 데이터 신선도",
            "- 현재 KST:",
            "- quote as-of:",
            "- news as-of:",
            "- flow as-of:",
            "- short as-of:",
            "- 검증 한계:",
            "",
            "[2] 시장 상태 요약",
            "- KOSPI/KOSDAQ/환율/금리/섹터 흐름을 3~5줄로 요약",
            "- 오늘의 리스크 온/오프 판단",
            "",
            "[3] 상위 3개 후보",
            "- 종목명(코드):",
            "- 출처: package / external",
            "- 핵심 촉매:",
            "- 오늘 거래대금:",
            "- 최근 평균 거래대금 대비:",
            "- 외국인/기관 수급:",
            "- 차트 상태: 전고/신고가/종가 위치/갭",
            "- 내일 강세 지속 논리:",
            "- 리스크:",
            "- 확신도: 0~100",
            "",
            "[4] 최종 1개",
            "- 종목명(코드):",
            "- 왜 이 종목이 1순위인지:",
            "- 내일 봐야 할 핵심 포인트 3개:",
            "- 무효화 조건 2개:",
            "",
            "[5] 패키지 후보 탈락 사유",
            "- 종목명:",
            "- 탈락 이유:",
            "",
            "[6] 불확실성",
            "- 확인 불가하거나 지연 가능성이 있는 데이터만 따로 적어라.",
            "",
            "[DATA_PACKAGE_JSON_BEGIN]",
            payload,
            "[DATA_PACKAGE_JSON_END]",
        ]
        return "\n".join(lines)

    lines = [
        f"You are a US equities short-term momentum swing trading analyst for a 1-{horizon_days} trading day holding period.",
        "Use only latest verified data. If a field cannot be verified, write '확인 불가'.",
        "",
        "0) Start with current ET and KST times, then label whether each price/news datapoint is RTH, PM, or AH.",
        "1) The JSON below is a pre-collected data package. Use it as a starting point, then verify and refresh with web search.",
        f"2) Pick only 1-3 short-term momentum candidates. Priority watchlist: {interest}",
        "3) For each candidate, give fact-based momentum reasons: volume/dollar volume anomaly, catalyst, options/short structure if available, chart levels, and index/sector context.",
        f"4) Build a trade plan with entry, invalidation, target, and time stop within a max {horizon_days} trading day hold.",
        "5) End with the single highest-probability candidate using the most recent timestamped data only.",
        "",
        "User constraints:",
        "- Style: aggressive short-term swing",
        f"- Max hold: {horizon_days} trading days",
        "- Max loss per trade: [-X%] (default 6% if X missing)",
        f"- Priority tickers: {interest}",
        f"- Scan setup: {(scan_setup.get('scan_label') or scan_setup.get('scan_profile') or 'default')} / {(scan_setup.get('scan_note') or 'no note')}",
        "",
        "JSON data package:",
        payload,
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
    lines.append(f"현재 시간 ET: {_fmt_dt(now_et)}")
    lines.append(f"현재 시간 KST: {_fmt_dt(now_kst)}")
    source_hint = "Naver Finance best-effort" if market == "KR" else "Yahoo/SEC best-effort"
    lines.append(f"마켓: {market} / 데이터 세션: {d.get('session','Unknown')} ({source_hint})")
    lines.append(f"기준: {horizon} 거래일 모멘텀(보유기한 최대 {horizon} 거래일)")
    lines.append("")
    lines.append("AI 판단 요청(복붙용):")
    lines.append("아래 데이터 기반으로 다음 4가지를 판단해줘.")
    lines.append("1) 각 종목 진입 여부 (진입/관망)")
    lines.append("2) 각 종목 목표가/손절가 (숫자 필수)")
    lines.append("3) 최종 1순위 종목 1개")
    lines.append("4) 판단 근거 요약 (거시 + 종목)")

    if macro:
        lines.append("")
        lines.append("매크로 체크(당일):")
        for x in macro:
            lines.append(f"  - {x.get('label')}: {_fnum(x.get('last'))} ({_fmt_pct(x.get('day_chg_pct'))})")
    lines.append("")

    lines.append(f"- 종목: {d.get('symbol')} / {d.get('name')} ({d.get('currency') or 'currency ?'})")
    lines.append(
        f"- 현재가(마지막): {_fnum(q.get('last'))} / 당일 등락률: {_fmt_pct(q.get('day_chg_pct'))} / 거래량: {_fint(q.get('day_volume'))}"
    )

    lines.append(
        f"- 수익률: 3D {_fmt_pct(stats.get('ret_3d_pct'))} / 5D {_fmt_pct(stats.get('ret_5d_pct'))} / 20D {_fmt_pct(stats.get('ret_20d_pct'))} / (선택 {horizon}D {_fmt_pct(stats.get('ret_horizon_pct'))})"
    )
    lines.append(
        f"- 거래량: 20D 평균 {_fint(stats.get('avg20_volume'))} / 상대거래량(20D): {_fnum(stats.get('rel_vol_20d'))}x"
    )
    lines.append(f"- 변동성: ATR(14): {_fnum(stats.get('atr14'))}")

    if market == "KR" and (kr_flow or kr_short):
        lines.append("")
        lines.append("KR 수급/공매도(가능한 범위):")
        if kr_flow:
            flow_1d = (kr_flow.get("lookbacks") or {}).get("1d") or {}
            flow_5d = (kr_flow.get("lookbacks") or {}).get("5d") or {}
            flow_20d = (kr_flow.get("lookbacks") or {}).get("20d") or {}
            lines.append(
                "  - 외국인 순매수(주): "
                f"1D {_fint(flow_1d.get('foreign_net_volume'))} / "
                f"5D {_fint(flow_5d.get('foreign_net_volume'))} / "
                f"20D {_fint(flow_20d.get('foreign_net_volume'))}"
            )
            lines.append(
                "  - 기관 순매수(주): "
                f"1D {_fint(flow_1d.get('institution_net_volume'))} / "
                f"5D {_fint(flow_5d.get('institution_net_volume'))} / "
                f"20D {_fint(flow_20d.get('institution_net_volume'))}"
            )
            lines.append("  - 개인 순매수(주): 확인 불가")
        if kr_short:
            short_1d = (kr_short.get("lookbacks") or {}).get("1d") or {}
            short_5d = (kr_short.get("lookbacks") or {}).get("5d") or {}
            short_20d = (kr_short.get("lookbacks") or {}).get("20d") or {}
            latest_short = kr_short.get("latest") or {}
            latest_balance = kr_short.get("latest_balance") or {}
            lines.append(
                "  - 공매도 거래량(주): "
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
                "  - 공매도 순보유잔고(최신): "
                f"수량 {_fint(latest_balance.get('net_short_balance_qty'))} / "
                f"금액 {_fint(latest_balance.get('net_short_balance_value'))} "
                f"(기준 {latest_balance.get('date') or '확인 불가'})"
            )

    # short/options/earnings
    if qs or opt:
        lines.append("")
        lines.append("추가(가능한 범위):")
        if qs:
            spf = qs.get("short_percent_of_float")
            sr = qs.get("short_ratio")
            mc = qs.get("market_cap")
            eds = qs.get("earnings_dates")
            if mc is not None:
                lines.append(f"  - 시총(야후): {_fint(mc)}")
            if spf is not None or sr is not None:
                lines.append(f"  - Short % of float: {_fnum(spf,4)} / Short ratio: {_fnum(sr,2)}")
            if eds:
                lines.append(f"  - Earnings(ET): {', '.join(eds[:2])}")
        if opt:
            cv = opt.get("call_volume")
            pv = opt.get("put_volume")
            cpr = opt.get("call_put_vol_ratio")
            exp = opt.get("expiration")
            if cv or pv:
                lines.append(f"  - Options(near exp {exp or 'N/A'}): CallVol {_fint(cv)} / PutVol {_fint(pv)} / Call:Put {_fnum(cpr,2)}")

    lines.append("")
    news_label = "촉매(최근 Naver Finance 뉴스):" if market == "KR" else "촉매(최근 Yahoo RSS):"
    lines.append(news_label)
    if not news:
        lines.append("  - 확인 불가")
    else:
        for n in news[:3]:
            lines.append(f"  - {n.get('title') or '제목 확인 불가'} ({n.get('published') or '시각 확인 불가'})")

    lines.append("")
    if _is_korea_symbol(str(d.get("symbol") or "")):
        lines.append("SEC(최근 7일): N/A (비미국 종목)")
    else:
        lines.append("SEC(최근 7일):")
        if not sec:
            lines.append("  - 없음/확인 불가")
        else:
            for s in sec[:6]:
                lines.append(f"  - {s.get('form')} / filingDate={s.get('filingDate')} / reportDate={s.get('reportDate') or 'N/A'}")

    lines.append("")
    lines.append("차트 레벨(숫자):")
    lines.append(f"  - 저항(20D 고점): {_fnum(lv.get('resistance_20d'))}")
    lines.append(f"  - 지지(20D 저점): {_fnum(lv.get('support_20d'))}")
    lines.append(f"  - 당일 고가/저가: {_fnum(lv.get('day_high'))} / {_fnum(lv.get('day_low'))}")

    lines.append("")
    lines.append("트레이드 플랜(규칙 기반 참고값, 최종 판단은 AI/사용자):")
    lines.append(f"  - 진입 트리거: {_fnum(plan.get('entry_trigger'))} 이상 체결 시")
    lines.append(f"  - 손절(무효화): {_fnum(plan.get('stop'))}")
    lines.append(f"  - 목표(전량 1회 매도): {_fnum(plan.get('target'))}")
    lines.append(f"  - 보유기한: 최대 {plan.get('hold_days_max', horizon)} 거래일 / 시간손절: {plan.get('time_stop')}")

    lines.append("")
    lines.append("주의: 교육용 프로토타입 출력. 데이터 지연/누락 가능. 매매 판단은 본인 책임.")

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
) -> Dict[str, Any]:
    details, errors = await _collect_symbol_details(
        symbols,
        market=market,
        horizon_days=horizon_days,
        max_items=max_items,
    )
    if horizon_days not in (5, 20):
        horizon_days = 5 if horizon_days < 12 else 20
    macro = await _fetch_macro_snapshot(market)
    return _build_data_package(
        details,
        market=market,
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
    lines.append(f"심볼: {', '.join([d.get('symbol') for d in ok_details])}")
    lines.append("")
    lines.append("AI 판단 요청(복붙용):")
    lines.append("아래 데이터로 진입/관망, 목표가, 손절가, 우선순위 TOP3를 제시해줘.")
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
        return ",".join(flags) if flags else "낮음"

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

    # 비교 테이블(리포트 탭 전용): AI가 바로 랭킹할 수 있는 구조화 데이터
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
        lines.append(f"1순위 후보: {best.get('symbol')} (총점 {ranked[0][0]})")
        if market.upper() == "KR":
            lines.append("주의: KR은 외국인/기관 원데이터와 공매도 데이터를 포함합니다. 개인 순매수는 확인 불가입니다.")
        else:
            lines.append("주의: FLOW는 기관/외국인 순매수 원데이터가 아닌 프록시(거래강도/옵션/숏지표)입니다.")

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
    lines.append("AI 출력 요청 형식(엄수):")
    lines.append("[종목] 진입/관망 | 진입가 | 손절가 | 목표가 | 포지션우선순위(1~3) | 확신도 | 근거(거시/수급프록시/레벨)")

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
