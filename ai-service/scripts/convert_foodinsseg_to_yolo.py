import json
import random
import shutil
from pathlib import Path


DATASET_ROOT = Path(__file__).resolve().parents[1] / "datasets" / "FoodInsSeg"
ANNOTATIONS_DIR = DATASET_ROOT / "annotations"
IMAGES_DIR = DATASET_ROOT / "images"
LABELS_DIR = DATASET_ROOT / "labels"
YOLO_META_DIR = DATASET_ROOT / "yolo"
VAL_RATIO = 0.1
SEED = 42


def polygon_area(points: list[float]) -> float:
    coords = list(zip(points[0::2], points[1::2]))
    if len(coords) < 3:
        return 0.0
    area = 0.0
    for index, (x1, y1) in enumerate(coords):
        x2, y2 = coords[(index + 1) % len(coords)]
        area += x1 * y2 - x2 * y1
    return abs(area) / 2.0


def normalize_polygon(points: list[float], width: int, height: int) -> list[float]:
    normalized = []
    for index, value in enumerate(points):
        scale = width if index % 2 == 0 else height
        normalized.append(min(max(value / scale, 0.0), 1.0))
    return normalized


def select_polygon(segmentation: list) -> list[float] | None:
    valid_segments = [segment for segment in segmentation if isinstance(segment, list) and len(segment) >= 6]
    if not valid_segments:
        return None
    if len(valid_segments) == 1:
        return valid_segments[0]
    return max(valid_segments, key=polygon_area)


def convert_split(annotation_file: Path, split_name: str, image_id_to_split: dict[int, str], image_lookup: dict[int, dict], skipped_stats: dict[str, int]) -> None:
    with annotation_file.open("r", encoding="utf-8") as file:
        data = json.load(file)

    categories = sorted(data["categories"], key=lambda category: category["id"])
    category_map = {category["id"]: category["id"] - 1 for category in categories}

    for target_split in {"train", "val", "test"}:
        (LABELS_DIR / target_split).mkdir(parents=True, exist_ok=True)

    label_rows: dict[tuple[str, int], list[str]] = {}

    for annotation in data["annotations"]:
        if annotation.get("iscrowd", 0) != 0:
            skipped_stats["crowd_annotations"] += 1
            continue

        image_id = annotation["image_id"]
        target_split = image_id_to_split[image_id]
        image_info = image_lookup[image_id]
        polygon = select_polygon(annotation.get("segmentation", []))
        if polygon is None:
            skipped_stats["invalid_segmentations"] += 1
            continue

        if len(annotation.get("segmentation", [])) > 1:
            skipped_stats["multi_polygon_annotations"] += 1

        normalized_polygon = normalize_polygon(
            polygon,
            width=image_info["width"],
            height=image_info["height"],
        )
        class_id = category_map[annotation["category_id"]]
        row = " ".join([
            str(class_id),
            *[f"{value:.6f}" for value in normalized_polygon],
        ])
        label_rows.setdefault((target_split, image_id), []).append(row)

    for image_id, image_info in image_lookup.items():
        target_split = image_id_to_split[image_id]
        label_path = LABELS_DIR / target_split / f"{Path(image_info['file_name']).stem}.txt"
        rows = label_rows.get((target_split, image_id), [])
        label_path.write_text("\n".join(rows), encoding="utf-8")

    names = [category["name"] for category in categories]
    return names


def main() -> None:
    random.seed(SEED)
    YOLO_META_DIR.mkdir(parents=True, exist_ok=True)
    if LABELS_DIR.exists():
        shutil.rmtree(LABELS_DIR)
    LABELS_DIR.mkdir(parents=True, exist_ok=True)

    train_annotation_path = ANNOTATIONS_DIR / "Train.json"
    test_annotation_path = ANNOTATIONS_DIR / "Test.json"

    with train_annotation_path.open("r", encoding="utf-8") as file:
        train_data = json.load(file)
    with test_annotation_path.open("r", encoding="utf-8") as file:
        test_data = json.load(file)

    train_images = train_data["images"]
    test_images = test_data["images"]

    shuffled_train_ids = [image["id"] for image in train_images]
    random.shuffle(shuffled_train_ids)
    val_count = max(1, int(len(shuffled_train_ids) * VAL_RATIO))
    val_ids = set(shuffled_train_ids[:val_count])

    train_image_lookup = {image["id"]: image for image in train_images}
    test_image_lookup = {image["id"]: image for image in test_images}

    train_split_lookup = {
        image_id: ("val" if image_id in val_ids else "train")
        for image_id in train_image_lookup
    }
    test_split_lookup = {image_id: "test" for image_id in test_image_lookup}

    skipped_stats = {
        "crowd_annotations": 0,
        "invalid_segmentations": 0,
        "multi_polygon_annotations": 0,
    }

    names = convert_split(
        train_annotation_path,
        split_name="train",
        image_id_to_split=train_split_lookup,
        image_lookup=train_image_lookup,
        skipped_stats=skipped_stats,
    )
    convert_split(
        test_annotation_path,
        split_name="test",
        image_id_to_split=test_split_lookup,
        image_lookup=test_image_lookup,
        skipped_stats=skipped_stats,
    )

    train_list = sorted(
        str((IMAGES_DIR / "train" / image["file_name"]).resolve())
        for image in train_images
        if image["id"] not in val_ids
    )
    val_list = sorted(
        str((IMAGES_DIR / "train" / image["file_name"]).resolve())
        for image in train_images
        if image["id"] in val_ids
    )
    test_list = sorted(
        str((IMAGES_DIR / "test" / image["file_name"]).resolve())
        for image in test_images
    )

    (YOLO_META_DIR / "train.txt").write_text("\n".join(train_list), encoding="utf-8")
    (YOLO_META_DIR / "val.txt").write_text("\n".join(val_list), encoding="utf-8")
    (YOLO_META_DIR / "test.txt").write_text("\n".join(test_list), encoding="utf-8")

    names_block = "\n".join(f"  {index}: {name}" for index, name in enumerate(names))
    dataset_yaml = (
        f"path: {DATASET_ROOT.as_posix()}\n"
        f"train: yolo/train.txt\n"
        f"val: yolo/val.txt\n"
        f"test: yolo/test.txt\n\n"
        f"names:\n{names_block}\n"
    )
    (YOLO_META_DIR / "foodinsseg_yolo.yaml").write_text(dataset_yaml, encoding="utf-8")

    summary = {
        "train_images": len(train_list),
        "val_images": len(val_list),
        "test_images": len(test_list),
        "class_count": len(names),
        **skipped_stats,
    }
    (YOLO_META_DIR / "conversion_summary.json").write_text(
        json.dumps(summary, indent=2),
        encoding="utf-8",
    )

    print("FoodInsSeg conversion complete.")
    print(json.dumps(summary, indent=2))
    print(f"Dataset YAML: {(YOLO_META_DIR / 'foodinsseg_yolo.yaml').resolve()}")


if __name__ == "__main__":
    main()
