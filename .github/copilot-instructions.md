# Copilot instructions for this repository

## Build, test, and lint commands

Frontend (nutrition-web)
- Install: cd nutrition-web && npm install
- Dev: npm run dev (Vite, HMR on :5173)
- Build: npm run build
- Preview: npm run preview
- Lint: npm run lint  (runs `eslint .`)
- Single-file lint: npx eslint path/to/file.js

Backend (Django)
- Setup: cd backend && python -m venv .venv && .\.venv\Scripts\Activate.ps1 && pip install -r requirements.txt
- Run migrations: python manage.py migrate
- Run: python manage.py runserver  (uses settings in backend/backend/settings.py)
- Tests: python manage.py test
- Single test: python manage.py test <app>.<TestCaseClass>.<test_method>
  - Example: python manage.py test accounts.tests.TestUserModel.test_create_user

AI service (FastAPI)
- Setup: cd ai-service && python -m venv .venv && .\.venv\Scripts\Activate.ps1 && pip install -r requirements.txt
- Run: uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
- Model path: set $env:AI_MODEL_PATH to override default weight path (see ai-service/README.md)

## High-level architecture
- Django backend (backend/) provides API, auth (custom user model), subscriptions, storage, and admin. Key apps: accounts, api. Uses DRF + JWT (rest_framework_simplejwt).
- Separate AI inference service (ai-service/) implemented with FastAPI; receives images, runs YOLO segmentation, returns detections and optional calorie estimates.
- React + Vite frontend (nutrition-web/) is served independently; it calls the Django API and the AI service. Backend settings point to AI_SERVICE_PREDICT_URL and FRONTEND_URL.
- Integration points: backend/backend/settings.py contains FRONTEND_URL, AI_SERVICE_PREDICT_URL and CORS_ALLOWED_ORIGINS (http://localhost:5173).

## Key conventions and repository-specific patterns
- Auth: AUTH_USER_MODEL = "accounts.CustomUser" (see backend/backend/settings.py).
- API auth: JWT via rest_framework_simplejwt; expect Authorization: Bearer <token> on protected endpoints.
- Media and uploads: MEDIA_ROOT = backend/media; MEDIA_URL = /media/.
- Database: default is PostgreSQL in settings.py; local dev must provide a running Postgres or override DATABASES via env/env-file.
- AI model: ai-service expects model weights on disk by default; path can be overridden with AI_MODEL_PATH env var.
- Frontend: uses Vite + React; linting via ESLint. Scripts are in nutrition-web/package.json.
- Start order for local end-to-end dev: backend (migrate → runserver) → ai-service (uvicorn) → frontend (vite dev).

## Useful files to inspect quickly
- nutrition-web/package.json — frontend scripts (dev/build/lint)
- ai-service/README.md — AI service setup, run, endpoints
- backend/backend/settings.py — integration URLs, DB, auth, CORS
- backend/manage.py and backend/requirements.txt
- ai-service/requirements.txt
- project_functionality_checklist.txt — feature verification checklist

----

If you want, I can also:
- Add quick-run scripts (PowerShell .ps1) to the repo for common dev flows
- Wire a basic GitHub Actions workflow for lint/build checks

Do you want to configure any MCP servers for this project (e.g., Playwright for the frontend)? If so, which server(s) to add?