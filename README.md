# Momentum Scout (no-key prototype)

Mobile-first web app that screens US stocks for *short-term momentum* (roughly 3–5 trading days) using **public, no-auth endpoints**:
- Yahoo Finance screener + quote + chart (unofficial; can break)
- Yahoo Finance RSS (public)
- SEC `data.sec.gov` submissions API (official; no API keys)

This is **educational software**, not financial advice.

## Run (local)

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000
```

Open: http://localhost:8000

## API endpoints

- `GET /api/candidates` : returns ranked candidate list
- `GET /api/ticker/{SYMBOL}` : detailed view for one ticker
- `GET /report/{SYMBOL}` : plain text report (copy/paste friendly)
