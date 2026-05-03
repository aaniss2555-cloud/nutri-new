import base64
import json
import os
from io import BytesIO
from pathlib import Path

import numpy as np
from fastapi import HTTPException
from PIL import Image, ImageFilter, ImageOps, UnidentifiedImageError

from app.schemas import BoundingBox, FoodDetection, PredictionResponse

PROJECT_ROOT = Path(__file__).resolve().parents[2]
REFERENCE_PATH = PROJECT_ROOT / "app" / "data" / "nutrition_reference.json"
DEFAULT_MODEL_PATH = Path(r"C:\Users\user\Downloads\best 31+46 yolo s.pt")
LOCAL_ULTRALYTICS_CONFIG = PROJECT_ROOT / ".ultralytics"
CONFIDENCE_THRESHOLD = 0.35
MAX_DETECTIONS = 3
MAX_IMAGE_SIDE = 1280
BLUR_WARNING_THRESHOLD = 85.0
os.environ.setdefault("YOLO_CONFIG_DIR", str(LOCAL_ULTRALYTICS_CONFIG))
os.environ.setdefault("ULTRALYTICS_CONFIG_DIR", str(LOCAL_ULTRALYTICS_CONFIG))
LOCAL_ULTRALYTICS_CONFIG.mkdir(parents=True, exist_ok=True)

_MODEL = None


def load_nutrition_reference() -> dict:
    with REFERENCE_PATH.open("r", encoding="utf-8") as reference_file:
        return json.load(reference_file)


def get_model_path() -> Path:
    model_path = os.getenv("AI_MODEL_PATH")
    if model_path:
        return Path(model_path)
    return DEFAULT_MODEL_PATH


def get_model():
    global _MODEL

    if _MODEL is not None:
        return _MODEL

    model_path = get_model_path()
    if not model_path.exists():
        raise HTTPException(
            status_code=503,
            detail=f"AI model weights not found at {model_path}",
        )

    try:
        from ultralytics import YOLO
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail="Ultralytics is not installed in ai-service. Install it in the ai-service virtual environment.",
        ) from exc

    _MODEL = YOLO(str(model_path))
    return _MODEL


def estimate_blur_score(image: Image.Image) -> float:
    """Approximate blur with variance of a simple Laplacian filter."""
    gray = np.asarray(image.convert("L"), dtype=np.float32)
    if gray.size == 0:
        return 0.0

    laplacian = (
        -4 * gray
        + np.roll(gray, 1, axis=0)
        + np.roll(gray, -1, axis=0)
        + np.roll(gray, 1, axis=1)
        + np.roll(gray, -1, axis=1)
    )
    return round(float(laplacian.var()), 2)


def preprocess_image(image: Image.Image) -> tuple[Image.Image, list[str]]:
    notes: list[str] = []

    processed = ImageOps.exif_transpose(image).convert("RGB")
    notes.append("Applied EXIF orientation correction and converted image to RGB.")

    original_size = processed.size
    processed.thumbnail((MAX_IMAGE_SIDE, MAX_IMAGE_SIDE), Image.Resampling.LANCZOS)
    if processed.size != original_size:
        notes.append(
            f"Resized image from {original_size[0]}x{original_size[1]} to {processed.size[0]}x{processed.size[1]} for faster inference."
        )

    blur_score = estimate_blur_score(processed)
    notes.append(f"Blur score: {blur_score}. Higher is sharper.")
    if blur_score < BLUR_WARNING_THRESHOLD:
        notes.append("Image may be blurry; detection confidence can be lower.")

    processed = ImageOps.autocontrast(processed, cutoff=1)
    processed = processed.filter(ImageFilter.UnsharpMask(radius=1.2, percent=135, threshold=3))
    notes.append("Applied light auto-contrast and sharpening before inference.")

    return processed, notes


def encode_annotated_result(result) -> tuple[str | None, str | None]:
    try:
        annotated_bgr = result.plot()
        annotated_rgb = annotated_bgr[..., ::-1]
        annotated_image = Image.fromarray(annotated_rgb)
        buffer = BytesIO()
        annotated_image.save(buffer, format="JPEG", quality=88)
        encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
        return encoded, "image/jpeg"
    except Exception:
        return None, None


def estimate_calories_from_reference(label: str) -> tuple[float | None, float | None, str | None]:
    nutrition_reference = load_nutrition_reference()
    key = label.lower().strip()
    food_data = nutrition_reference.get(key)
    if not food_data:
        return None, None, None

    portion_g = float(food_data["default_portion_g"])
    calories_per_100g = float(food_data["calories_per_100g"])
    calories = round((portion_g / 100) * calories_per_100g, 1)
    return portion_g, calories, food_data["source"]


def build_detection(label: str, confidence: float, xyxy: list[float]) -> FoodDetection:
    x1, y1, x2, y2 = xyxy
    width = max(int(round(x2 - x1)), 0)
    height = max(int(round(y2 - y1)), 0)
    portion_g, calories, nutrition_source = estimate_calories_from_reference(label)

    return FoodDetection(
        label=label,
        confidence=round(float(confidence), 4),
        bbox=BoundingBox(
            x=max(int(round(x1)), 0),
            y=max(int(round(y1)), 0),
            width=width,
            height=height,
        ),
        mask_available=True,
        estimated_portion_g=portion_g,
        estimated_calories_kcal=calories,
        nutrition_source=nutrition_source,
    )


def select_display_detections(raw_detections: list[FoodDetection]) -> tuple[list[FoodDetection], int]:
    filtered = [
        detection for detection in raw_detections if detection.confidence >= CONFIDENCE_THRESHOLD
    ]

    best_by_label: dict[str, FoodDetection] = {}
    for detection in filtered:
        existing = best_by_label.get(detection.label)
        if existing is None or detection.confidence > existing.confidence:
            best_by_label[detection.label] = detection

    selected = sorted(
        best_by_label.values(),
        key=lambda detection: detection.confidence,
        reverse=True,
    )[:MAX_DETECTIONS]

    return selected, len(raw_detections) - len(selected)


def predict_food_image(
    image_bytes: bytes,
    filename: str,
    content_type: str,
) -> PredictionResponse:
    try:
        with Image.open(BytesIO(image_bytes)) as image:
            processed_image, preprocessing_notes = preprocess_image(image)
            width, height = processed_image.size
            image_array = np.array(processed_image)
    except UnidentifiedImageError as exc:
        raise HTTPException(status_code=400, detail="Could not read the uploaded image.") from exc

    model = get_model()

    try:
        result = model.predict(image_array, verbose=False, device="cpu")[0]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AI inference failed: {exc}") from exc

    annotated_image_base64, annotated_image_mime = encode_annotated_result(result)

    raw_detections: list[FoodDetection] = []
    if result.boxes is not None and len(result.boxes) > 0:
        boxes_xyxy = result.boxes.xyxy.tolist()
        confidences = result.boxes.conf.tolist()
        class_ids = result.boxes.cls.tolist()
        class_names = result.names

        for xyxy, confidence, class_id in zip(boxes_xyxy, confidences, class_ids):
            class_index = int(class_id)
            label = class_names[class_index] if isinstance(class_names, dict) else class_names[class_index]
            raw_detections.append(
                build_detection(label=label, confidence=confidence, xyxy=xyxy)
            )

    detections, hidden_detection_count = select_display_detections(raw_detections)

    calorie_values = [
        detection.estimated_calories_kcal
        for detection in detections
        if detection.estimated_calories_kcal is not None
    ]
    total_calories = round(sum(calorie_values), 1) if calorie_values else None

    notes = [
        f"Received {content_type} image successfully.",
        f"Loaded trained model from {get_model_path().name}.",
        f"Showing up to {MAX_DETECTIONS} strongest unique detections with confidence >= {CONFIDENCE_THRESHOLD:.1f}.",
        "Calorie estimates use a Nutrition5k-derived local reference with default serving sizes when a detected label matches.",
    ]
    if annotated_image_base64:
        notes.append("Generated an annotated preview image with YOLO boxes/masks.")
    if hidden_detection_count > 0:
        notes.append(f"Filtered out {hidden_detection_count} lower-confidence or duplicate detections.")
    if raw_detections and not detections:
        notes.append("The model produced only low-confidence guesses for this image, so no detection is being shown.")
    if not raw_detections:
        notes.append("No food instances were detected in the uploaded image.")

    return PredictionResponse(
        status="success",
        filename=filename,
        image_width=width,
        image_height=height,
        model_name=get_model_path().stem,
        model_version="31plus46epoch-yolov8s",
        dataset_note="FoodInsSeg-trained YOLO segmentation model with Level 1 calorie estimation from a Nutrition5k-derived local reference.",
        detections=detections,
        total_estimated_calories_kcal=total_calories,
        annotated_image_base64=annotated_image_base64,
        annotated_image_mime=annotated_image_mime,
        preprocessing_notes=preprocessing_notes,
        notes=notes,
    )
