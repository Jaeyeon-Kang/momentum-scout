# Momentum Scout

시장 강도만 보는 후보 앱이 아니라, 아래 판단까지 함께 내리도록 바꾼 모멘텀 스캐너입니다.

- 시장 판단: `NEW_ENTRY`, `WATCHLIST_ONLY`, `CASH`
- 신규 진입 승인 후보 vs 관찰 전용 후보 분리
- 보유 종목 리뷰: `HOLD`, `TRIM`, `EXIT`

데이터는 공개 소스를 best-effort로 조합합니다.

- KR: Naver Finance, KRX 공개 데이터
- US: Yahoo Finance, SEC 공개 데이터

투자 조언이 아닌 참고용 도구입니다.

## 실행

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000
```

브라우저에서 [http://127.0.0.1:8000](http://127.0.0.1:8000) 을 여세요.

## 핵심 변경점

- `/api/candidates` 최상단에 `market_decision` 추가
- 장이 `NO_TRADE` 또는 강한 `RISK_OFF`이면 신규 진입 차단
- KR 기본 모드에서 ETF/ETN/레버리지/인버스 계열 기본 제외
- KR 후보는 거래대금 순위, 거래대금 규모, 대형주 조건을 함께 반영
- 후보마다 `entry_status`, `entry_reason`, `extras.market_turnover_rank`, `extras.bucket_tags` 포함
- 자동 선택은 `APPROVED_NEW`만 대상으로 하고, 신규 진입 금지일 때는 자동 선택 자체를 비활성화
- 보유 종목용 `/api/review_positions` 추가
- `/report_multi_data`, `/prompt_multi`가 `market_decision`, `approved_candidates`, `watchlist_candidates`, `positions_review`, `new_entries_allowed`를 함께 전달

## KR 기본 프리셋: `대형주 포함 공격형`

```text
market_cap_min             = 1,000,000,000,000
avg20_turnover_min         = 30,000,000,000
today_turnover_min         = 70,000,000,000
rel_volume_min             = 1.3
ret_5d_min                 = 4
ret_5d_max                 = 25
close_position_min         = 0.60
fresh_news_hours           = 72
market_turnover_rank_max   = 60
largecap_min               = 2,000,000,000,000
largecap_quota             = 2
kr_exclude_fundlike        = true
```

## 주요 엔드포인트

- `GET /api/candidates`
  - `market_decision`, `approved_candidates`, `watchlist_candidates`, `auto_selected_symbols`, `positions_review` 포함
- `GET /api/review_positions`
  - 입력: `held_symbols=...`
  - 출력: `positions_review[]` with `HOLD/TRIM/EXIT`, `carry_score`
- `GET /api/ticker/{SYMBOL}`
- `GET /report_multi_data`
- `GET /prompt_multi`
- `GET /report/{SYMBOL}`
