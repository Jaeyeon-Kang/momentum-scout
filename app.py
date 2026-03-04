from __future__ import annotations

import asyncio
import math
import statistics
from dataclasses import dataclass
from datetime import datetime, timedelta, time
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


def _is_korea_symbol(sym: str) -> bool:
    s = sym.upper().strip()
    return s.endswith(".KS") or s.endswith(".KQ")


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
            # KR: predefined screeners return US stocks; use Yahoo trending + fallback list.
            universe = await fetch_yahoo_trending(region=region)
            if not universe:
                universe = list(_KR_FALLBACK_SYMBOLS)
                universe_source = "kr_fallback"
            else:
                universe_source = "trending"

    # polite cap
    universe = universe[:80]

    quote_map = await fetch_yahoo_quote(universe, region=region)

    sem = asyncio.Semaphore(12)

    async def build_candidate(sym: str) -> Optional[Candidate]:
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

        # price filter (local currency)
        try:
            if max_price > 0 and last is not None and float(last) > float(max_price):
                return None
        except Exception:
            pass

        # daily chart for returns & avg volume
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

        day_volume = q.get("regularMarketVolume")
        if day_volume is None and vols:
            day_volume = vols[-1]

        rel_vol_20d = None
        try:
            if day_volume is not None and avg20_volume is not None and avg20_volume > 0:
                rel_vol_20d = float(day_volume) / float(avg20_volume)
        except Exception:
            rel_vol_20d = None

        avg_turnover_20d = None
        try:
            if avg20_volume is not None and last is not None:
                avg_turnover_20d = float(avg20_volume) * float(last)
        except Exception:
            avg_turnover_20d = None

        # liquidity filter
        if avg_turnover_20d is None or avg_turnover_20d < float(min_avg_turnover):
            return None

        score = _score_candidate(
            day_chg_pct,
            rel_vol_20d,
            ret_3d_pct,
            ret_5d_pct,
            ret_20d_pct,
            avg_turnover_20d,
            horizon_days=horizon_days,
        )

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
        )

    tasks = [build_candidate(s) for s in universe]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    cands: List[Candidate] = []
    for r in results:
        if isinstance(r, Exception) or r is None:
            continue
        cands.append(r)

    cands.sort(key=lambda x: x.score, reverse=True)
    cands = cands[:top_n]

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
        "asof_et": _fmt_dt(now_et),
        "asof_kst": _fmt_dt(_now_kst()),
        "market": market_u,
        "region": region,
        "horizon_days": horizon_days,
        "hold_days_max": horizon_days,
        "universe_source": universe_source,
        "filters": {"max_price": max_price, "min_avg_turnover": min_avg_turnover},
        "context": context,
        "note": "Educational prototype. Not financial advice. Data best-effort and may be delayed/incomplete.",
        "candidates": [
            {
                "symbol": c.symbol,
                "name": c.name,
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
                "score": c.score,
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

    # charts
    daily = await fetch_yahoo_chart(sym, range_="6mo", interval="1d", include_prepost=False)
    intraday = await fetch_yahoo_chart(sym, range_="1d", interval="1m", include_prepost=True)

    d_ts, d_o, d_h, d_l, d_c, d_v = _extract_ohlcv(daily)
    i_ts, i_o, i_h, i_l, i_c, i_v = _extract_ohlcv(intraday)

    d_highs = _drop_none_float(d_h)
    d_lows = _drop_none_float(d_l)
    d_closes = _drop_none_float(d_c)
    d_vols = _drop_none_int(d_v)

    # levels: use 20 trading days for local swing levels
    lookback_high = d_highs[-20:] if len(d_highs) >= 20 else d_highs
    lookback_low = d_lows[-20:] if len(d_lows) >= 20 else d_lows
    resistance_20d, support_20d = _swing_levels(lookback_high, lookback_low)

    day_high = max(_drop_none_float(i_h)) if i_h else None
    day_low = min(_drop_none_float(i_l)) if i_l else None

    # volume stats
    avg20_volume = None
    if len(d_vols) >= 20:
        avg20_volume = statistics.fmean(d_vols[-20:])
    elif len(d_vols) >= 10:
        avg20_volume = statistics.fmean(d_vols[-10:])

    day_volume = q.get("regularMarketVolume")
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
        "quote": {
            "last": last,
            "prev_close": prev_close,
            "day_chg_pct": day_chg_pct,
            "day_volume": q.get("regularMarketVolume"),
            "bid": q.get("bid"),
            "ask": q.get("ask"),
            "market_state": market_state,
            "regular_market_time": q.get("regularMarketTime"),
        },
        "stats": {
            "ret_3d_pct": ret_3d_pct,
            "ret_5d_pct": ret_5d_pct,
            "ret_20d_pct": ret_20d_pct,
            "ret_horizon_pct": ret_horizon_pct,
            "avg20_volume": avg20_volume,
            "rel_vol_20d": rel_vol_20d,
            "atr14": atr14,
        },
        "levels": {
            "resistance_20d": resistance_20d,
            "support_20d": support_20d,
            "day_high": day_high,
            "day_low": day_low,
        },
        "extras": {
            "quote_summary": qs_sum,
            "options": opt_sum,
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

    horizon = int(d.get("horizon_days") or 5)
    market = d.get("market") or "US"

    lines: List[str] = []
    lines.append(f"현재 시간 ET: {_fmt_dt(now_et)}")
    lines.append(f"현재 시간 KST: {_fmt_dt(now_kst)}")
    lines.append(f"마켓: {market} / 데이터 세션: {d.get('session','Unknown')} (Yahoo/SEC best-effort)")
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
    lines.append("촉매(최근 Yahoo RSS):")
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
