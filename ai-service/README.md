# AI Service

Standalone FastAPI service for AI inference.

This service is intentionally separate from the Django backend. Django should keep handling users, authentication, subscriptions, nutrition plans, storage, and dashboard flow. This service only receives a meal image, runs the AI pipeline, and returns structured prediction results.

## Current status

The current `/predict` endpoint returns a mock segmentation-style response. This lets the website integrate with the correct architecture before the FoodInsSeg model is trained and plugged in.

Final AI target:

1. Use FoodInsSeg as the primary instance segmentation dataset.
2. Detect/segment food instances in a meal image.
3. Estimate portions.
4. Match detected foods with Nutrition5k or another nutrition database/API.
5. Return calorie estimates to the main website.

## Setup

```powershell
cd "C:\Users\user\Desktop\ai web project\ai-service"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Run

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

Then open:

```text
http://127.0.0.1:8001/docs
```

## Endpoints

```text
GET /health
POST /predict
```

`POST /predict` expects an uploaded image file named `image`.
