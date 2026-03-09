import unittest
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

import app as momentum


def _make_daily(base_price: float, days: int = 90, vol: int = 2_000_000):
    out = []
    for i in range(days):
        close = base_price * (1.0 + i * 0.002)
        out.append(
            {
                "date": f"2026-01-{(i % 28) + 1:02d}",
                "open": close * 0.99,
                "high": close * 1.01,
                "low": close * 0.98,
                "close": close,
                "volume": vol,
            }
        )
    return out


class MomentumRegressionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(momentum.app)

    def _patch_common_kr(self, macro_rows):
        universe = [
            {"symbol": "111111.KS", "name": "SOL AI Semiconductor ETF", "day_turnover": 120_000_000_000.0, "day_chg_pct": 4.0, "last": 11000.0, "day_volume": 10_000_000},
            {"symbol": "222222.KS", "name": "Hanwha Core", "day_turnover": 140_000_000_000.0, "day_chg_pct": 3.2, "last": 21000.0, "day_volume": 7_000_000},
            {"symbol": "333333.KS", "name": "Mega Largecap", "day_turnover": 90_000_000_000.0, "day_chg_pct": 2.1, "last": 31000.0, "day_volume": 5_000_000},
        ]

        snapshots = {
            "111111.KS": {
                "symbol": "111111.KS",
                "name": "SOL AI Semiconductor ETF",
                "currency": "KRW",
                "last": 11000.0,
                "day_chg_pct": 4.0,
                "day_volume": 10_000_000,
                "day_turnover": 120_000_000_000.0,
                "market_cap": 1_300_000_000_000.0,
                "open": 10600.0,
                "high": 11150.0,
                "low": 10500.0,
                "prev_close": 10500.0,
            },
            "222222.KS": {
                "symbol": "222222.KS",
                "name": "Hanwha Core",
                "currency": "KRW",
                "last": 21000.0,
                "day_chg_pct": 3.2,
                "day_volume": 7_000_000,
                "day_turnover": 147_000_000_000.0,
                "market_cap": 1_600_000_000_000.0,
                "open": 20400.0,
                "high": 21100.0,
                "low": 20300.0,
                "prev_close": 20300.0,
            },
            "333333.KS": {
                "symbol": "333333.KS",
                "name": "Mega Largecap",
                "currency": "KRW",
                "last": 31000.0,
                "day_chg_pct": 2.1,
                "day_volume": 5_000_000,
                "day_turnover": 155_000_000_000.0,
                "market_cap": 3_500_000_000_000.0,
                "open": 30500.0,
                "high": 31200.0,
                "low": 30300.0,
                "prev_close": 30300.0,
            },
        }

        async def fake_snapshot(sym):
            return snapshots.get(sym, {})

        async def fake_daily(sym, count=80):
            base = 10_000 if sym == "111111.KS" else (20_000 if sym == "222222.KS" else 30_000)
            return _make_daily(base)

        async def fake_news(sym, limit=3):
            return [{"title": f"{sym} catalyst", "published": "2026.03.09 09:00", "published_kst": "2026-03-09T09:00:00+09:00"}]

        async def fake_flow(sym):
            return {
                "as_of": "2026-03-09",
                "lookbacks": {
                    "1d": {"foreign_net_volume": 1000, "institution_net_volume": 2000},
                    "5d": {"foreign_net_volume": 5000, "institution_net_volume": 6000},
                    "20d": {"foreign_net_volume": 10000, "institution_net_volume": 12000},
                },
            }

        return patch.multiple(
            momentum,
            fetch_kr_market_universe=AsyncMock(return_value=universe),
            fetch_kr_snapshot=AsyncMock(side_effect=fake_snapshot),
            fetch_kr_daily_history=AsyncMock(side_effect=fake_daily),
            fetch_kr_naver_news=AsyncMock(side_effect=fake_news),
            fetch_kr_investor_flows=AsyncMock(side_effect=fake_flow),
            _fetch_macro_snapshot=AsyncMock(return_value=macro_rows),
        )

    def test_kr_crash_day_blocks_new_entries(self):
        macro = [
            {"label": "KOSPI", "day_chg_pct": -2.4},
            {"label": "KOSDAQ", "day_chg_pct": -3.1},
            {"label": "USD/KRW", "day_chg_pct": 1.2},
        ]
        with self._patch_common_kr(macro):
            r = self.client.get("/api/candidates?market=KR&top_n=10")
        self.assertEqual(r.status_code, 200)
        j = r.json()
        self.assertEqual(j["market_decision"]["recommended_action"], "CASH")
        self.assertFalse(j["new_entries_allowed"])
        self.assertEqual(len(j["auto_selected_symbols"]), 0)

    def test_kr_default_excludes_etf(self):
        macro = [
            {"label": "KOSPI", "day_chg_pct": 0.5},
            {"label": "KOSDAQ", "day_chg_pct": 0.7},
            {"label": "USD/KRW", "day_chg_pct": -0.2},
        ]
        with self._patch_common_kr(macro):
            r = self.client.get("/api/candidates?market=KR&top_n=10")
        self.assertEqual(r.status_code, 200)
        symbols = {x["symbol"] for x in r.json().get("candidates", [])}
        self.assertNotIn("111111.KS", symbols)

    def test_candidate_includes_entry_and_bucket_fields(self):
        macro = [
            {"label": "KOSPI", "day_chg_pct": 0.4},
            {"label": "KOSDAQ", "day_chg_pct": 0.6},
            {"label": "USD/KRW", "day_chg_pct": -0.1},
        ]
        with self._patch_common_kr(macro):
            r = self.client.get("/api/candidates?market=KR&top_n=10")
        self.assertEqual(r.status_code, 200)
        first = r.json()["candidates"][0]
        self.assertIn("entry_status", first)
        self.assertIn("market_turnover_rank", first.get("extras", {}))
        self.assertIn("bucket_tags", first.get("extras", {}))

    def test_candidates_returns_positions_review_when_held_symbols_present(self):
        macro = [
            {"label": "KOSPI", "day_chg_pct": 0.4},
            {"label": "KOSDAQ", "day_chg_pct": 0.6},
            {"label": "USD/KRW", "day_chg_pct": -0.1},
        ]
        with self._patch_common_kr(macro), patch.object(
            momentum,
            "_review_positions_impl",
            new=AsyncMock(return_value=[{"symbol": "005930.KS", "status": "HOLD", "carry_score": 31.2, "reason": ["above_ma20"], "invalidated": False}]),
        ):
            r = self.client.get("/api/candidates?market=KR&held_symbols=005930.KS")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json().get("positions_review"))

    def test_kr_name_input_resolves_to_symbol(self):
        macro = [
            {"label": "KOSPI", "day_chg_pct": 0.4},
            {"label": "KOSDAQ", "day_chg_pct": 0.6},
            {"label": "USD/KRW", "day_chg_pct": -0.1},
        ]
        with self._patch_common_kr(macro):
            r = self.client.get("/api/candidates?market=KR&symbols=Hanwha%20Core&direct_mode=true")
        self.assertEqual(r.status_code, 200)
        symbols = {x["symbol"] for x in r.json().get("candidates", [])}
        self.assertIn("222222.KS", symbols)

    def test_prompt_template_allows_cash_watchlist_and_hold_trim_exit(self):
        text = momentum._build_ai_prompt_from_package(
            {
                "market": "KR",
                "horizon_days": 5,
                "market_decision": {"recommended_action": "WATCHLIST_ONLY", "new_entries_allowed": False},
                "approved_candidates": [],
                "watchlist_candidates": [{"symbol": "222222.KS"}],
                "positions_review": [{"symbol": "005930.KS", "status": "HOLD"}],
                "candidates": [],
            }
        )
        self.assertIn("NEW_ENTRY", text)
        self.assertIn("WATCHLIST_ONLY", text)
        self.assertIn("CASH", text)
        self.assertIn("HOLD / TRIM / EXIT", text)

    def test_kr_autoselect_contains_largecap_when_available(self):
        macro = [
            {"label": "KOSPI", "day_chg_pct": 0.8},
            {"label": "KOSDAQ", "day_chg_pct": 1.1},
            {"label": "USD/KRW", "day_chg_pct": -0.3},
        ]
        with self._patch_common_kr(macro):
            r = self.client.get("/api/candidates?market=KR&top_n=10")
        self.assertEqual(r.status_code, 200)
        j = r.json()
        selected = set(j.get("auto_selected_symbols") or [])
        candidates = {c["symbol"]: c for c in j.get("candidates", [])}
        has_largecap = any(
            sym in selected and float((candidates[sym].get("market_cap") or 0.0)) >= 2_000_000_000_000.0
            for sym in selected
            if sym in candidates
        )
        self.assertTrue(has_largecap)

    def test_intraday_radar_returns_stateful_rows(self):
        macro = [
            {"label": "KOSPI", "day_chg_pct": 0.8},
            {"label": "KOSDAQ", "day_chg_pct": 1.1},
            {"label": "USD/KRW", "day_chg_pct": -0.3},
        ]
        with self._patch_common_kr(macro), patch.object(momentum, "_load_intraday_journal", return_value=[]), patch.object(momentum, "_save_intraday_journal", return_value=None):
            r = self.client.get("/api/intraday/radar?market=KR&account_cash=10000000&account_equity=10000000")
        self.assertEqual(r.status_code, 200)
        j = r.json()
        self.assertIn("radar", j)
        self.assertTrue(j["radar"])
        self.assertIn("snapshot_preview", j)
        self.assertTrue(j["snapshot_preview"])
        first = j["radar"][0]
        self.assertIn(first["state"], {"PREPARE", "CONFIRM", "TRIGGERED", "EXPIRED", "BLOCKED"})
        self.assertIn("flow_scores", first)
        self.assertIn("trigger_price", first)

    def test_intraday_meta_includes_adapter_and_feed_plan(self):
        r = self.client.get("/api/intraday/meta?market=KR")
        self.assertEqual(r.status_code, 200)
        j = r.json()
        self.assertIn("adapter_settings", j)
        self.assertIn("api_connection", j)
        self.assertIn("feed_plan", j["api_connection"])
        self.assertIn("session_rules_preview", j)

    def test_intraday_journal_update_accumulates_results(self):
        macro = [
            {"label": "KOSPI", "day_chg_pct": 0.8},
            {"label": "KOSDAQ", "day_chg_pct": 1.1},
            {"label": "USD/KRW", "day_chg_pct": -0.3},
        ]
        store = []

        def fake_load():
            return [dict(x) for x in store]

        def fake_save(rows):
            store.clear()
            store.extend(dict(x) for x in rows)

        with self._patch_common_kr(macro), patch.object(momentum, "_load_intraday_journal", side_effect=fake_load), patch.object(momentum, "_save_intraday_journal", side_effect=fake_save):
            radar = self.client.get("/api/intraday/radar?market=KR&account_cash=10000000&account_equity=10000000")
            self.assertEqual(radar.status_code, 200)
            rec_id = radar.json()["radar"][0]["recommendation_id"]

            entered = self.client.post(
                "/api/intraday/journal/update",
                json={"recommendation_id": rec_id, "action": "mark_entered", "fill_price": 21000},
            )
            self.assertEqual(entered.status_code, 200)
            self.assertEqual(entered.json()["row"]["result_status"], "OPEN")

            exited = self.client.post(
                "/api/intraday/journal/update",
                json={"recommendation_id": rec_id, "action": "mark_exited", "exit_price": 21420},
            )
            self.assertEqual(exited.status_code, 200)
            self.assertIn(exited.json()["row"]["result_status"], {"WIN", "LOSS", "SCRATCH"})
            self.assertIsNotNone(exited.json()["row"]["realized_pnl_pct"])


if __name__ == "__main__":
    unittest.main()
