# AI Service

Standalone FastAPI service for food image inference.

This service is intentionally separate from the Django backend. Django handles users, authentication, subscriptions, nutrition plans, storage, and the dashboard flow. The AI service only receives a meal image, preprocesses it, runs the trained segmentation model, and returns structured prediction results.

## Current Status

The `/predict` endpoint is connected to a FoodInsSeg-trained YOLO segmentation model. It currently supports:

1. Receiving an uploaded meal image.
2. Applying basic preprocessing before inference.
3. Running YOLO segmentation/object detection.
4. Returning detected food labels, confidence scores, bounding boxes, and mask availability.
5. Returning an annotated image preview with YOLO boxes/masks when available.
6. Estimating calories only when the detected label exists in the small local nutrition reference file.

Calorie estimation is still basic. The current implementation uses default portions from `app/data/nutrition_reference.json`. More advanced portion estimation can be added later.

## Preprocessing

Before inference, the service applies:

1. EXIF orientation correction.
2. RGB conversion.
3. Resize to a maximum side length of `1280px`.
4. Blur score calculation.
5. Light auto-contrast.
6. Light sharpening.

The blur score is included in `preprocessing_notes`. A low score means the image may be blurry and prediction confidence may be lower.

## Setup

```powershell
cd "C:\Users\user\Desktop\ai web project\ai-service"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Model Weights

By default, the service looks for:

```text
C:\Users\user\Downloads\foodinsseg_yolov8n_50plus20epoch_best.pt
```

You can override the model path with an environment variable:

```powershell
$env:AI_MODEL_PATH="C:\path\to\best.pt"
```

## Run

```powershell
cd "C:\Users\user\Desktop\ai web project\ai-service"
.\.venv\Scripts\Activate.ps1
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

## Prediction Response

The response includes:

1. `detections`: food label, confidence, bounding box, mask availability, and optional calorie estimate.
2. `total_estimated_calories_kcal`: total calories when matching nutrition data exists.
3. `annotated_image_base64`: preview image with YOLO boxes/masks.
4. `preprocessing_notes`: preprocessing steps and blur score.
5. `notes`: model and filtering notes.

## Academic Explanation

This architecture separates the AI model from the main web backend. That makes the project cleaner because Django stays responsible for the website logic, while FastAPI is responsible only for AI inference. The AI pipeline follows the MVP requirement: upload image, preprocess image, detect food instances, return predictions, and support calorie tracking.
