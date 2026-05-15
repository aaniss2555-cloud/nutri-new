from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str
    service: str


class BoundingBox(BaseModel):
    x: int = Field(ge=0)
    y: int = Field(ge=0)
    width: int = Field(ge=0)
    height: int = Field(ge=0)


class ClassificationCandidate(BaseModel):
    label: str
    confidence: float = Field(ge=0, le=1)
    estimated_portion_g: float | None = Field(default=None, ge=0)
    estimated_calories_kcal: float | None = Field(default=None, ge=0)
    nutrition_source: str | None = None


class FoodDetection(BaseModel):
    label: str
    confidence: float = Field(ge=0, le=1)
    bbox: BoundingBox
    mask_available: bool
    segmentation_label: str | None = None
    segmentation_confidence: float | None = Field(default=None, ge=0, le=1)
    classification_label: str | None = None
    classification_confidence: float | None = Field(default=None, ge=0, le=1)
    classification_candidates: list[ClassificationCandidate] = Field(default_factory=list)
    estimated_portion_g: float | None = Field(default=None, ge=0)
    estimated_calories_kcal: float | None = Field(default=None, ge=0)
    nutrition_source: str | None = None


class PredictionResponse(BaseModel):
    status: str
    filename: str
    image_width: int
    image_height: int
    model_name: str
    model_version: str
    dataset_note: str
    detections: list[FoodDetection]
    total_estimated_calories_kcal: float | None = Field(default=None, ge=0)
    annotated_image_base64: str | None = None
    annotated_image_mime: str | None = None
    preprocessing_notes: list[str] = Field(default_factory=list)
    notes: list[str]