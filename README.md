# Momentum Scout

Momentum Scout는 "오늘 강한 종목 몇 개 보여주는 앱"에서 한 단계 더 나아간 모멘텀 스캐너입니다.  
이 앱은 시장 상태를 먼저 판단하고, 신규 진입 가능 여부를 분리해서 보여주며, 이미 보유한 종목을 계속 들고 갈지까지 함께 검토합니다.

쉽게 말해 이 제품은 아래 질문에 차분하게 답하려고 만든 도구입니다.

- 오늘은 아예 신규 진입을 쉬는 날인가?
- 지금 볼 만한 종목은 무엇인가?
- 그 종목은 "신규 진입 가능"인가, 아니면 "관찰만" 해야 하는가?
- 내가 이미 들고 있는 종목은 HOLD / TRIM / EXIT 중 어디에 가까운가?
- 인트라데이로 본다면 지금은 PREPARE / CONFIRM / TRIGGERED / EXPIRED 중 어디인가?

이 프로젝트는 공개 데이터를 최대한 조합해서 best-effort로 보여주는 참고 도구입니다.  
따라서 투자 조언이나 자동 주문 시스템이 아니라, 사람이 더 나은 판단을 하도록 도와주는 작업 도구에 가깝습니다.

## 이 제품이 잘 맞는 사람

이 앱은 아래처럼 생각하는 사용자에게 특히 잘 맞습니다.

- "장이 안 좋은데도 억지로 하나 고르라고 하면 싫다."
- "강한 종목은 보고 싶지만, 이미 너무 튄 종목은 뒤늦게 쫓아가고 싶지 않다."
- "KR에서는 ETF/ETN 말고 실제 종목을 보고 싶다."
- "새 후보만 보지 말고, 내가 이미 산 종목을 계속 보유할지 같이 판단하고 싶다."
- "인트라데이에서는 예쁜 카드보다 상태 전이와 타이밍이 더 중요하다."

## 제품 구성

앱은 크게 두 메뉴로 나뉩니다.

### 1) Momentum Scout

Momentum Scout는 스윙 또는 1~5일 모멘텀 확인용 메뉴입니다.

- 시장 판단: `NEW_ENTRY`, `WATCHLIST_ONLY`, `CASH`
- 후보 분리: `APPROVED_NEW`, `WATCHLIST_ONLY`, `AVOID`
- 보유 종목 리뷰: `HOLD`, `TRIM`, `EXIT`
- KR 기본 모드에서 ETF/ETN, 레버리지, 인버스 계열 기본 제외
- KR 대형주 누락을 줄이기 위한 bucket/turnover/largecap 우선 로직 적용

이 메뉴는 "오늘 무엇을 볼지"와 "오늘 무엇을 하지 말아야 할지"를 함께 보여주는 데 집중합니다.

### 2) Intraday Desk

Intraday Desk는 데이트레이딩 보조 메뉴입니다.

- 세션 기준: `KR Open Auction`, `KR Open Drive`, `KR Intraday Continuation`, `US Premarket`, `US Open Drive`
- 상태 전이: `PREPARE`, `CONFIRM`, `TRIGGERED`, `EXPIRED`, `BLOCKED`
- Snapshot 분리: 추천이 생성된 순간의 상태와 트리거 플랜을 따로 저장
- Journal 분리: 실제 진입/청산 결과를 나중에 기록
- Stats 누적: 세션별, 셋업별, 결과별 통계 확인
- Broker Setup: 한국투자 API 웹소켓 어댑터를 붙일 자리를 먼저 마련

지금 단계에서는 공개 데이터 기반 프록시 점수로 레이더를 만들고, 한국투자 API 연결 설정 흐름과 피드 계획까지 준비해 둔 상태입니다.  
즉, "실시간 연결 완성본"이라기보다 "실시간 데스크로 커지는 구조"에 가깝습니다.

## 이 앱이 판단하는 방식

### 시장 판단을 먼저 합니다

이 앱은 먼저 시장을 봅니다.  
장이 심하게 망가진 날에는 종목을 억지로 추천하지 않습니다.

예를 들면:

- KR에서 KOSPI 급락, KOSDAQ 급락, USD/KRW 급등이 나오면 `NO_TRADE`
- US에서 SPY/QQQ 약세와 변동성 확대가 동시에 나오면 `NO_TRADE` 또는 `RISK_OFF`

이 구조 덕분에 "그날 덜 죽은 종목"이 매수 추천처럼 보이는 문제를 줄였습니다.

### 후보와 진입 승인을 분리합니다

후보가 뜬다고 해서 바로 사라는 뜻은 아닙니다.  
각 후보에는 아래 상태가 붙습니다.

- `APPROVED_NEW`: 신규 진입 후보
- `WATCHLIST_ONLY`: 관찰만 할 후보
- `AVOID`: 비추천

따라서 사용자는 "이 종목이 왜 후보인지"와 "지금 들어가도 되는지"를 따로 볼 수 있습니다.

### 보유 종목 판단을 별도로 합니다

이 앱은 이미 보유한 종목도 같이 봅니다.  
`close > ma20`, `ma20 slope`, `5D flow`, `ret_20d`, `close_position` 같은 항목을 이용해서 carry score를 계산하고, 아래로 분류합니다.

- `HOLD`
- `TRIM`
- `EXIT`

즉, "새 장난감 고르는 앱"이 아니라 "오늘 신규 진입 / 관찰 / 현금 대기 / 기존 보유 관리"를 함께 보는 도구를 목표로 합니다.

## KR 기본값

KR 기본 프리셋은 `대형주 포함 공격형`입니다.

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

이 기본값은 "외딴 종목을 줄이고, 대형주 누락을 줄이고, 시장이 실제로 때리는 종목 위주로 보자"는 방향으로 잡았습니다.

## US 기본값

US는 유동성 기준에 따라 최소 평균 거래대금을 자동으로 맞춥니다.

- 보수적: `50M`
- 균형: `20M`
- 공격적: `10M`

또한 최대 가격 기본값은 `2000달러`입니다.  
이 기본값은 너무 비싼 종목을 괜히 잘라내지 않으면서도, 지나치게 마른 종목을 기본 후보에서 줄이기 위한 타협점입니다.

## 빠른 시작

### 1) 설치

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --host 127.0.0.1 --port 8000
```

브라우저에서 [http://127.0.0.1:8000](http://127.0.0.1:8000) 를 열면 됩니다.

### 2) 가장 쉬운 사용 순서

처음 쓸 때는 아래 순서가 가장 편합니다.

1. `Momentum Scout`를 연다.
2. KR 또는 US를 고른다.
3. 기본값을 그대로 두고 스캔한다.
4. 먼저 시장 판단 배너를 읽는다.
5. `신규 진입 가능` / `관찰만` / `비추천`을 구분해서 본다.
6. 필요한 종목만 체크한다.
7. `AI 판단용 프롬프트 복사` 또는 `원본 데이터(JSON) 보기`를 사용한다.

## 예시로 이렇게 사용할 수 있습니다

### 예시 1) KR에서 오늘 신규 진입 가능한 종목을 보고 싶을 때

1. 거래 시장을 `KR`로 둡니다.
2. 기본값을 그대로 둡니다.
3. `후보 스캔 시작`을 누릅니다.
4. `시장 판단`이 `WATCHLIST_ONLY` 또는 `CASH`인지 먼저 확인합니다.
5. `APPROVED_NEW` 배지가 붙은 종목만 신규 진입 후보로 봅니다.
6. `WATCHLIST_ONLY`는 말 그대로 관찰만 합니다.

이 흐름은 "후보가 떴다 = 지금 사라"라는 오해를 줄이는 데 도움이 됩니다.

### 예시 2) 보유 종목을 같이 점검하고 싶을 때

예를 들어 보유 종목 입력란에 아래처럼 넣을 수 있습니다.

```text
005930.KS, 109860.KS, 096530.KS
```

또는 KR에서는 종목명으로도 시도할 수 있습니다.

```text
삼성전자, 한화오션
```

그러면 스캔 결과와 함께 `positions_review`가 생성되고, 각 종목에 대해 `HOLD / TRIM / EXIT` 판단을 같이 볼 수 있습니다.

### 예시 3) AI에게 오늘 상황을 정리해서 묻고 싶을 때

1. 원하는 후보를 체크합니다.
2. `AI 판단용 프롬프트 복사`를 누릅니다.
3. ChatGPT 같은 모델에 그대로 붙여넣습니다.

이 프롬프트는 이제 "항상 종목 하나를 무조건 추천"하도록 강제하지 않습니다.  
대신 아래 같은 응답도 허용합니다.

- `NEW_ENTRY`
- `WATCHLIST_ONLY`
- `CASH`
- `HOLD / TRIM / EXIT`

즉, 시장이 별로인 날에는 "오늘은 현금 대기"라고 답하는 것이 자연스럽습니다.

### 예시 4) Intraday Desk를 쓰고 싶을 때

1. 상단 메뉴에서 `Intraday Desk`를 엽니다.
2. KR 또는 US를 선택합니다.
3. 계좌 현금, 평가금액, 손실 예산을 입력합니다.
4. `라이브 레이더 새로고침`을 누릅니다.
5. `Live Radar`에서 상태를 먼저 봅니다.
6. `Snapshot`에서 추천 당시 플랜을 따로 저장해 둡니다.
7. 실제 진입/청산이 생기면 `Journal`에서 결과를 기록합니다.
8. 나중에 `Stats`에서 어떤 세션과 셋업이 잘 맞았는지 확인합니다.

인트라데이 메뉴에서 특히 중요한 점은 `EXPIRED`입니다.  
이 상태는 "이미 많이 움직였으니 추격하지 말자"는 뜻입니다.

## Intraday Desk에서 각 상태를 읽는 법

- `PREPARE`: 아직 감시 단계입니다.
- `CONFIRM`: 거의 준비됐지만 마지막 확인이 더 필요합니다.
- `TRIGGERED`: 지금 유효한 진입 타이밍에 가깝습니다.
- `EXPIRED`: 이미 너무 움직여서 추격 리스크가 큽니다.
- `BLOCKED`: 시장 리스크 때문에 신규 진입을 막아야 합니다.

## Broker Setup은 무엇을 위한 메뉴인가요?

`Broker Setup`은 한국투자 API를 나중에 붙이기 위한 연결 설정 메뉴입니다.

현재는 아래까지 준비돼 있습니다.

- 환경변수 방식 권장
- 로컬 런타임 파일 방식 대안
- 세션별 피드 플랜 표시
- 프록시 모드 유지 여부 설정

즉, 지금은 "설정 흐름과 자리"까지 구현한 상태입니다.  
실제 웹소켓 subscription/stream loop는 다음 단계로 붙이면 됩니다.

## 주요 API

### `GET /api/candidates`

시장 판단과 후보 리스트를 같이 내려줍니다.

- `market_decision`
- `approved_candidates`
- `watchlist_candidates`
- `auto_selected_symbols`
- `positions_review`

### `GET /api/review_positions`

보유 종목 리뷰 전용 API입니다.

- 입력: `held_symbols=...`
- 출력: `positions_review[]`

### `GET /api/ticker/{SYMBOL}`

단일 종목 상세 데이터를 봅니다.

### `GET /report_multi_data`

선택 종목 원본 데이터(JSON)를 만듭니다.

### `GET /prompt_multi`

AI에게 바로 붙여넣기 좋은 프롬프트를 만듭니다.

### `GET /api/intraday/meta`

인트라데이 세션 정보, 브로커 설정 상태, 세션 규칙 미리보기를 봅니다.

### `GET /api/intraday/radar`

인트라데이 Live Radar, Snapshot, Active Trades, Journal preview, Stats preview를 한 번에 받습니다.

### `POST /api/intraday/journal/update`

인트라데이 결과를 나중에 기록합니다.

- 진입 기록
- 청산 기록
- 미체결 종료
- 메모 저장

### `POST /api/intraday/adapter`

브로커 설정 흐름을 저장합니다.

## 데이터 소스

이 프로젝트는 공개 데이터와 공식 공개 문서를 바탕으로 best-effort로 동작합니다.

- KR: Naver Finance, KRX 공개 데이터
- US: Yahoo Finance, SEC 공개 데이터
- 브로커 연결 준비: 한국투자 Open API 기준 설정 흐름

## 솔직한 한계

이 앱은 최대한 정직하게 만들려고 했기 때문에, 한계도 같이 적어둡니다.

- 공개 데이터는 지연이나 누락이 있을 수 있습니다.
- KR 이름 기반 해석은 완벽한 종목명 검색기가 아닙니다.
- Intraday Desk는 아직 "웹소켓 완성형 실행 엔진"이 아닙니다.
- 브로커 연결은 현재 설정 자리와 흐름까지 구현한 상태입니다.
- 따라서 실제 주문 전에 사용자가 한 번 더 직접 확인해야 합니다.

## 마지막으로

이 제품은 "무조건 뭔가 하나 사라고 밀어붙이는 앱"이 되고 싶지 않습니다.  
오히려 오늘은 쉬어야 하는 날이면 쉬라고 말하고, 관찰만 해야 하는 종목은 관찰만 하라고 말하며, 이미 가진 종목은 계속 들고 가도 되는지 같이 보려는 도구가 되고 싶습니다.

천천히 써 보시고, 어떤 흐름에서 더 편했는지 알려주시면 그 피드백에 맞춰 계속 다듬겠습니다.
