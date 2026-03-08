# Momentum Scout

Mobile-first web app that compresses KR and US momentum candidates before you hand them to ChatGPT, Gemini, or another external model.

It is built around one workflow:
- scan the market
- auto-pick a small recommended batch
- extract a prompt or inspect the backing JSON package

Current data sources are public, no-auth, best-effort feeds:
- KR: Naver Finance price/chart/news/name + KR flow/short overlays
- US: Yahoo Finance screener/quote/chart/news + SEC `data.sec.gov`

This is **educational software**, not financial advice.

## Run (local)

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000
```

Open: http://127.0.0.1:8000

## API endpoints

- `GET /api/candidates` : ranked candidates with scan reasons / rejection flags
- `GET /api/ticker/{SYMBOL}` : detailed view for one ticker
- `GET /report_multi_data` : structured JSON package for a selected batch
- `GET /prompt_multi` : external-AI prompt for a selected batch
- `GET /report/{SYMBOL}` : plain text report for one ticker
