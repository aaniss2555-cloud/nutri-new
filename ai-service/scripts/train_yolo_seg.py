import argparse
import os
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
LOCAL_ULTRALYTICS_CONFIG = PROJECT_ROOT / ".ultralytics"
os.environ.setdefault("YOLO_CONFIG_DIR", str(LOCAL_ULTRALYTICS_CONFIG))
os.environ.setdefault("ULTRALYTICS_CONFIG_DIR", str(LOCAL_ULTRALYTICS_CONFIG))
LOCAL_ULTRALYTICS_CONFIG.mkdir(parents=True, exist_ok=True)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train a YOLO segmentation model on FoodInsSeg.")
    parser.add_argument(
        "--data",
        default=str(PROJECT_ROOT / "datasets" / "FoodInsSeg" / "yolo" / "foodinsseg_yolo.yaml"),
        help="Path to the dataset YAML file.",
    )
    parser.add_argument(
        "--model",
        default="yolov8n-seg.pt",
        help="Base Ultralytics segmentation checkpoint to fine-tune.",
    )
    parser.add_argument("--epochs", type=int, default=50, help="Number of training epochs.")
    parser.add_argument("--imgsz", type=int, default=640, help="Training image size.")
    parser.add_argument("--batch", type=int, default=8, help="Batch size.")
    parser.add_argument("--device", default="cpu", help="Training device, for example cpu or 0.")
    parser.add_argument("--project", default="runs/foodinsseg", help="Output project directory.")
    parser.add_argument("--name", default="yolov8n_seg_foodinsseg", help="Run name.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    try:
        from ultralytics import YOLO
    except ImportError as exc:
        raise SystemExit(
            "Ultralytics is not installed. Run 'pip install ultralytics' inside ai-service/.venv first."
        ) from exc

    model = YOLO(args.model)
    model.train(
        data=args.data,
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        device=args.device,
        project=args.project,
        name=args.name,
    )


if __name__ == "__main__":
    main()
