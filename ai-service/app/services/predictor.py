import base64
import json
import os
from io import BytesIO
from pathlib import Path

import numpy as np
from fastapi import HTTPException
from PIL import Image, ImageDraw, ImageFont, ImageOps, UnidentifiedImageError

from app.schemas import (
    BoundingBox,
    ClassificationCandidate,
    FoodDetection,
    PredictionResponse,
)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
REFERENCE_PATH = PROJECT_ROOT / "app" / "data" / "nutrition_reference.json"
DEFAULT_SEGMENTATION_MODEL_PATH = PROJECT_ROOT / "models" / "best_v8m_100ep_broadgroups.pt"
DEFAULT_CLASSIFIER_MODEL_PATH = PROJECT_ROOT / "models" / "foodinsseg_yolov8m_cls_best.pt"
LOCAL_ULTRALYTICS_CONFIG = PROJECT_ROOT / ".ultralytics"
SEGMENTATION_CONFIDENCE_THRESHOLD = 0.15
SEGMENTATION_IMAGE_SIZE = 768
CLASSIFIER_IMAGE_SIZE = 224
MAX_DETECTIONS = 8
MAX_IMAGE_SIDE = 1280
BLUR_WARNING_THRESHOLD = 85.0
CROP_PADDING_RATIO = 0.08
OVERLAP_DEDUP_IOU_THRESHOLD = 0.75
CONTAINMENT_DEDUP_THRESHOLD = 0.82
SEGMENTATION_IOU_THRESHOLD = 0.55
SEGMENTATION_MAX_RAW_DETECTIONS = 20

os.environ.setdefault("YOLO_CONFIG_DIR", str(LOCAL_ULTRALYTICS_CONFIG))
os.environ.setdefault("ULTRALYTICS_CONFIG_DIR", str(LOCAL_ULTRALYTICS_CONFIG))
LOCAL_ULTRALYTICS_CONFIG.mkdir(parents=True, exist_ok=True)

_SEGMENTATION_MODEL = None
_CLASSIFIER_MODEL = None


def load_nutrition_reference() -> dict:
    with REFERENCE_PATH.open("r", encoding="utf-8") as reference_file:
        return json.load(reference_file)


def get_segmentation_model_path() -> Path:
    model_path = os.getenv("AI_SEG_MODEL_PATH") or os.getenv("AI_MODEL_PATH")
    if model_path:
        return Path(model_path)
    return DEFAULT_SEGMENTATION_MODEL_PATH


def get_classifier_model_path() -> Path:
    model_path = os.getenv("AI_CLS_MODEL_PATH")
    if model_path:
        return Path(model_path)
    return DEFAULT_CLASSIFIER_MODEL_PATH


def load_yolo_model(model_path: Path, model_kind: str):
    if not model_path.exists():
        raise HTTPException(
            status_code=503,
            detail=f"AI {model_kind} weights not found at {model_path}",
        )

    try:
        from ultralytics import YOLO
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail="Ultralytics is not installed in ai-service. Install it in the ai-service virtual environment.",
        ) from exc

    return YOLO(str(model_path))


def get_segmentation_model():
    global _SEGMENTATION_MODEL

    if _SEGMENTATION_MODEL is None:
        _SEGMENTATION_MODEL = load_yolo_model(
            get_segmentation_model_path(),
            "segmentation",
        )
    return _SEGMENTATION_MODEL


def get_classifier_model():
    global _CLASSIFIER_MODEL

    if _CLASSIFIER_MODEL is None:
        _CLASSIFIER_MODEL = load_yolo_model(
            get_classifier_model_path(),
            "classifier",
        )
    return _CLASSIFIER_MODEL


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

    notes.append("Kept natural colors and texture for inference; no contrast or sharpening filter was applied.")

    return processed, notes


def encode_annotated_result(
    image: Image.Image,
    detections: list[FoodDetection],
) -> tuple[str | None, str | None]:
    """Draw numbered boxes on the image without YOLO mask/color overlays."""
    try:
        annotated_image = image.copy().convert("RGB")
        draw = ImageDraw.Draw(annotated_image)
        font = ImageFont.load_default()
        box_color = (0, 171, 167)
        label_fill = (0, 55, 64)
        text_fill = (255, 255, 255)

        for index, detection in enumerate(detections, start=1):
            x1 = detection.bbox.x
            y1 = detection.bbox.y
            x2 = x1 + detection.bbox.width
            y2 = y1 + detection.bbox.height
            label = f"Food {index}"

            draw.rectangle((x1, y1, x2, y2), outline=box_color, width=3)
            label_box = draw.textbbox((0, 0), label, font=font)
            label_width = label_box[2] - label_box[0]
            label_height = label_box[3] - label_box[1]
            label_y = max(y1 - label_height - 8, 0)
            draw.rectangle(
                (x1, label_y, x1 + label_width + 10, label_y + label_height + 8),
                fill=label_fill,
            )
            draw.text((x1 + 5, label_y + 4), label, fill=text_fill, font=font)

        buffer = BytesIO()
        annotated_image.save(buffer, format="JPEG", quality=88)
        encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
        return encoded, "image/jpeg"
    except Exception:
        return None, None


def normalize_food_label(label: str) -> str:
    return " ".join(label.replace("_", " ").replace("-", " ").lower().split())


def estimate_calories_from_reference(label: str) -> tuple[float | None, float | None, str | None]:
    nutrition_reference = load_nutrition_reference()
    key = normalize_food_label(label)
    food_data = nutrition_reference.get(key)
    if not food_data:
        return None, None, None

    portion_g = float(food_data["default_portion_g"])
    calories_per_100g = float(food_data["calories_per_100g"])
    calories = round((portion_g / 100) * calories_per_100g, 1)
    return portion_g, calories, food_data["source"]


def clamp_box(xyxy: list[float], image_width: int, image_height: int) -> tuple[int, int, int, int]:
    x1, y1, x2, y2 = xyxy
    left = max(int(round(x1)), 0)
    top = max(int(round(y1)), 0)
    right = min(int(round(x2)), image_width)
    bottom = min(int(round(y2)), image_height)
    return left, top, max(right, left + 1), max(bottom, top + 1)


def get_mask_for_detection(result, index: int, image_size: tuple[int, int]) -> Image.Image | None:
    if result.masks is None or result.masks.data is None:
        return None

    try:
        mask_array = result.masks.data[index].cpu().numpy()
        mask = Image.fromarray((mask_array > 0.5).astype(np.uint8) * 255)
        if mask.size != image_size:
            mask = mask.resize(image_size, Image.Resampling.NEAREST)
        return mask.convert("L")
    except Exception:
        return None


def crop_food_region(
    image: Image.Image,
    xyxy: list[float],
    mask: Image.Image | None,
) -> Image.Image:
    """Return a natural padded crop for classification.

    The mask is still reported, but classification keeps surrounding context because
    white-background cutouts can look different from the images used for training.
    """
    image_width, image_height = image.size
    left, top, right, bottom = clamp_box(xyxy, image_width, image_height)
    box_width = right - left
    box_height = bottom - top
    pad_x = int(round(box_width * CROP_PADDING_RATIO))
    pad_y = int(round(box_height * CROP_PADDING_RATIO))

    left = max(left - pad_x, 0)
    top = max(top - pad_y, 0)
    right = min(right + pad_x, image_width)
    bottom = min(bottom + pad_y, image_height)

    return image.crop((left, top, right, bottom)).convert("RGB")


def class_name_from_result_names(names, class_index: int) -> str:
    if isinstance(names, dict):
        return normalize_food_label(str(names.get(class_index, class_index)))
    return normalize_food_label(str(names[class_index]))


def classify_food_crop(crop: Image.Image) -> tuple[str | None, float | None, list[ClassificationCandidate]]:
    classifier = get_classifier_model()

    try:
        result = classifier.predict(crop, imgsz=CLASSIFIER_IMAGE_SIZE, verbose=False, device="cpu")[0]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AI classification failed: {exc}") from exc

    if result.probs is None:
        return None, None, []

    top_indices = [int(index) for index in result.probs.top5]
    top_confidences = [float(confidence) for confidence in result.probs.top5conf.tolist()]
    candidates = []
    for class_index, confidence in zip(top_indices[:5], top_confidences[:5]):
        label = class_name_from_result_names(result.names, class_index)
        portion_g, calories, nutrition_source = estimate_calories_from_reference(label)
        candidates.append(
            ClassificationCandidate(
                label=label,
                confidence=round(confidence, 4),
                estimated_portion_g=portion_g,
                estimated_calories_kcal=calories,
                nutrition_source=nutrition_source,
            )
        )

    if not candidates:
        return None, None, []

    best = candidates[0]
    return best.label, best.confidence, candidates


def build_detection(
    segmentation_label: str,
    segmentation_confidence: float,
    xyxy: list[float],
    mask_available: bool,
    crop: Image.Image,
) -> FoodDetection:
    x1, y1, x2, y2 = xyxy
    width = max(int(round(x2 - x1)), 0)
    height = max(int(round(y2 - y1)), 0)

    classification_label, classification_confidence, classification_candidates = classify_food_crop(crop)
    final_label = classification_label or segmentation_label
    final_confidence = classification_confidence or segmentation_confidence
    # Final calorie calculation is confirmed in the UI after the user chooses the correct crop label.
    portion_g, calories, nutrition_source = None, None, None

    return FoodDetection(
        label=final_label,
        confidence=round(float(final_confidence), 4),
        bbox=BoundingBox(
            x=max(int(round(x1)), 0),
            y=max(int(round(y1)), 0),
            width=width,
            height=height,
        ),
        mask_available=mask_available,
        segmentation_label=segmentation_label,
        segmentation_confidence=round(float(segmentation_confidence), 4),
        classification_label=classification_label,
        classification_confidence=classification_confidence,
        classification_candidates=classification_candidates,
        estimated_portion_g=portion_g,
        estimated_calories_kcal=calories,
        nutrition_source=nutrition_source,
    )


def bbox_intersection(first: BoundingBox, second: BoundingBox) -> tuple[int, int, int]:
    first_x2 = first.x + first.width
    first_y2 = first.y + first.height
    second_x2 = second.x + second.width
    second_y2 = second.y + second.height

    inter_left = max(first.x, second.x)
    inter_top = max(first.y, second.y)
    inter_right = min(first_x2, second_x2)
    inter_bottom = min(first_y2, second_y2)
    inter_width = max(inter_right - inter_left, 0)
    inter_height = max(inter_bottom - inter_top, 0)
    return inter_width, inter_height, inter_width * inter_height


def bbox_area(box: BoundingBox) -> int:
    return max(box.width, 0) * max(box.height, 0)


def bbox_iou(first: BoundingBox, second: BoundingBox) -> float:
    _, _, intersection = bbox_intersection(first, second)
    first_area = bbox_area(first)
    second_area = bbox_area(second)
    union = first_area + second_area - intersection
    if union <= 0:
        return 0.0
    return intersection / union


def bbox_containment_ratio(first: BoundingBox, second: BoundingBox) -> float:
    """Return how much the smaller box is covered by the larger overlap area."""
    _, _, intersection = bbox_intersection(first, second)
    smaller_area = min(bbox_area(first), bbox_area(second))
    if smaller_area <= 0:
        return 0.0
    return intersection / smaller_area


def select_display_detections(raw_detections: list[FoodDetection]) -> tuple[list[FoodDetection], int]:
    filtered = [
        detection
        for detection in raw_detections
        if (detection.segmentation_confidence or 0) >= SEGMENTATION_CONFIDENCE_THRESHOLD
    ]

    sorted_detections = sorted(
        filtered,
        key=lambda detection: detection.segmentation_confidence or 0,
        reverse=True,
    )

    selected: list[FoodDetection] = []
    for detection in sorted_detections:
        duplicates_existing = any(
            bbox_iou(detection.bbox, existing.bbox) >= OVERLAP_DEDUP_IOU_THRESHOLD
            or bbox_containment_ratio(detection.bbox, existing.bbox) >= CONTAINMENT_DEDUP_THRESHOLD
            for existing in selected
        )
        if duplicates_existing:
            continue

        selected.append(detection)
        if len(selected) >= MAX_DETECTIONS:
            break

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

    segmentation_model = get_segmentation_model()

    try:
        result = segmentation_model.predict(
            image_array,
            imgsz=SEGMENTATION_IMAGE_SIZE,
            conf=SEGMENTATION_CONFIDENCE_THRESHOLD,
            iou=SEGMENTATION_IOU_THRESHOLD,
            max_det=SEGMENTATION_MAX_RAW_DETECTIONS,
            verbose=False,
            device="cpu",
        )[0]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AI segmentation failed: {exc}") from exc
    raw_detections: list[FoodDetection] = []
    if result.boxes is not None and len(result.boxes) > 0:
        boxes_xyxy = result.boxes.xyxy.tolist()
        confidences = result.boxes.conf.tolist()
        class_ids = result.boxes.cls.tolist()
        class_names = result.names

        for index, (xyxy, confidence, class_id) in enumerate(zip(boxes_xyxy, confidences, class_ids)):
            class_index = int(class_id)
            segmentation_label = class_name_from_result_names(class_names, class_index)
            mask = get_mask_for_detection(result, index, processed_image.size)
            crop = crop_food_region(processed_image, xyxy, mask)
            raw_detections.append(
                build_detection(
                    segmentation_label=segmentation_label,
                    segmentation_confidence=confidence,
                    xyxy=xyxy,
                    mask_available=mask is not None,
                    crop=crop,
                )
            )
    detections, hidden_detection_count = select_display_detections(raw_detections)
    annotated_image_base64, annotated_image_mime = encode_annotated_result(processed_image, detections)

    total_calories = None

    segmentation_model_name = get_segmentation_model_path().stem
    classifier_model_name = get_classifier_model_path().stem
    notes = [
        f"Received {content_type} image successfully.",
        f"Loaded segmentation model from {get_segmentation_model_path().name}.",
        f"Loaded classifier model from {get_classifier_model_path().name}.",
        f"Running segmentation at imgsz={SEGMENTATION_IMAGE_SIZE}, confidence >= {SEGMENTATION_CONFIDENCE_THRESHOLD:.2f}, IoU={SEGMENTATION_IOU_THRESHOLD:.2f}.",
        f"Showing up to {MAX_DETECTIONS} strongest detections after overlap and containment filtering.",
        "Segmentation creates natural padded food crops; each crop returns the top 5 classifier labels for user confirmation.",
        "Calorie estimates are calculated after the user selects the correct label for each detected crop.",
    ]
    if annotated_image_base64:
        notes.append("Generated a clean annotated preview with numbered boxes and no mask color overlay.")
    if hidden_detection_count > 0:
        notes.append(f"Filtered out {hidden_detection_count} lower-confidence or duplicate detections.")
    if raw_detections and not detections:
        notes.append("The segmentation model produced only low-confidence regions for this image, so no detection is being shown.")
    if not raw_detections:
        notes.append("No food instances were detected in the uploaded image.")

    return PredictionResponse(
        status="success",
        filename=filename,
        image_width=width,
        image_height=height,
        model_name=f"{segmentation_model_name} + {classifier_model_name}",
        model_version="yolov8m-segmentation-plus-yolov8m-classification",
        dataset_note="FoodInsSeg-trained YOLO segmentation model for masks/boxes plus FoodInsSeg-crop YOLO classification model for label refinement. Calories use a Nutrition5k-derived local reference.",
        detections=detections,
        total_estimated_calories_kcal=total_calories,
        annotated_image_base64=annotated_image_base64,
        annotated_image_mime=annotated_image_mime,
        preprocessing_notes=preprocessing_notes,
        notes=notes,
    )