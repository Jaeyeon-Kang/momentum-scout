# Deployment

## Render

- This repo is set up to run as a single Render Docker web service.
- The Docker build compiles the Next.js app in `frontend` to a static export.
- FastAPI serves that exported frontend from `frontend/out`, so the UI and API share the same origin.
- API routes still come from FastAPI under `/api`, `/prompt`, `/report`, and related endpoints.

## Local frontend development

1. Copy `frontend/.env.example` to `frontend/.env.local`.
2. Keep `NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000`.
3. Run the FastAPI server on port `8000`.
4. Run the Next.js dev server from `frontend`.

## Existing Render service note

If the current Render service was created as a native Python service, it will not automatically start using the new Docker setup. In that case, switch the service once to the repo `Dockerfile` or re-create it from `render.yaml`. After that, normal git pushes will auto-deploy.
