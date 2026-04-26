# AI Implementation Plan

## Goal

Build a standalone FastAPI inference service for food instance segmentation and calorie estimation.

The main website remains separate:

- React handles the user interface.
- Django handles authentication, users, subscriptions, nutrition plans, storage, and routing.
- FastAPI handles AI inference only.

## Academic Direction

The final AI module should not be only a simple CNN classifier. The expected pipeline is:

```text
meal image
-> instance segmentation
-> detected food items and masks
-> portion or area estimation
-> nutrition reference lookup
-> calorie estimation
-> structured response to Django
```

## Dataset Strategy

- FoodInsSeg is the primary dataset for instance segmentation.
- Nutrition5k is not treated as an instance segmentation dataset.
- Nutrition5k or another nutrition database/API can be used as an external source for calorie values.

## Implementation Phases

1. Current phase: connected placeholder inference service.
2. Dataset phase: download FoodInsSeg and inspect its annotation format.
3. Conversion phase: convert FoodInsSeg annotations to the selected training format if needed.
4. Training phase: train a segmentation model, preferably YOLO segmentation for a practical MVP.
5. Inference phase: load the trained model inside `app/services/predictor.py`.
6. Nutrition phase: match detected food labels with nutrition references.
7. Evaluation phase: report segmentation and calorie-estimation results in the dissertation.

## Expected Final Response Format

```json
{
  "status": "success",
  "filename": "meal.jpg",
  "image_width": 640,
  "image_height": 480,
  "model_name": "foodinsseg-yolo-seg",
  "detections": [
    {
      "label": "rice",
      "confidence": 0.87,
      "bbox": { "x": 20, "y": 30, "width": 220, "height": 180 },
      "mask_available": true,
      "estimated_portion_g": 180,
      "estimated_calories_kcal": 234,
      "nutrition_source": "nutrition_reference_demo"
    }
  ],
  "total_estimated_calories_kcal": 234
}
```
