from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str
    service: str


class BoundingBox(BaseModel):
    x: int = Field(ge=0)
    y: int = Field(ge=0)
    width: int = Field(ge=0)
    height: int = Field(ge=0)


class FoodDetection(BaseModel):
    label: str
    confidence: float = Field(ge=0, le=1)
    bbox: BoundingBox
    mask_available: bool
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
    notes: list[str]
