# Vehicle Intelligence API (backend)

FastAPI service that serves the Random Forest valuation model with SHAP
explanations. Deploy to **Railway** or **Render** (full container hosts — the
SHAP/numba/scipy stack installs cleanly, unlike size-limited serverless).

## Run locally

```bash
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8000           # http://127.0.0.1:8000/docs
```

## Endpoints

| Method | Route | Description |
|---|---|---|
| `GET` | `/health` | liveness probe |
| `GET` | `/api/meta` | categories, ranges, metrics, chart data |
| `POST` | `/api/predict` | value one vehicle |
| `POST` | `/api/explain` | value + ranked SHAP value drivers |
| `POST` | `/api/compare` | value two vehicles + gap |

## Environment

- `FRONTEND_ORIGIN` — comma-separated CORS allow-list (set to your Vercel URL; `*` in dev).
- `PORT` — injected by the host.

## Deploy

- **Render:** repo root has `render.yaml` (Blueprint) with `rootDir: backend`.
- **Railway:** set service root directory to `backend/`; uses `railway.json`.
- **Docker:** `docker build -t viapi . && docker run -p 8000:8000 viapi`.

## Retrain

```bash
pip install -r requirements-dev.txt
python train.py          # writes models/random_forest.pkl + model_metadata.json + assets/
```
