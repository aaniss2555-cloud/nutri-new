import json
from collections import Counter
from pathlib import Path


DATASET_ROOT = Path(__file__).resolve().parents[1] / "datasets" / "FoodInsSeg"


def summarize_split(annotation_name: str, image_dir_name: str) -> None:
    annotation_path = DATASET_ROOT / "annotations" / annotation_name
    image_dir = DATASET_ROOT / "images" / image_dir_name

    with annotation_path.open("r", encoding="utf-8") as file:
        data = json.load(file)

    images = data.get("images", [])
    annotations = data.get("annotations", [])
    categories = data.get("categories", [])

    category_lookup = {category["id"]: category["name"] for category in categories}
    counts = Counter(annotation["category_id"] for annotation in annotations)
    top_categories = counts.most_common(10)

    print(f"=== {annotation_name} ===")
    print(f"Images folder exists: {image_dir.exists()}")
    print(f"Images: {len(images)}")
    print(f"Annotations: {len(annotations)}")
    print(f"Categories: {len(categories)}")

    if images:
        sample_image = images[0]
        print("Sample image:")
        print(
            {
                "id": sample_image.get("id"),
                "file_name": sample_image.get("file_name"),
                "width": sample_image.get("width"),
                "height": sample_image.get("height"),
            }
        )

    if annotations:
        sample_annotation = annotations[0]
        print("Sample annotation:")
        print(
            {
                "id": sample_annotation.get("id"),
                "image_id": sample_annotation.get("image_id"),
                "category_id": sample_annotation.get("category_id"),
                "bbox": sample_annotation.get("bbox"),
                "area": sample_annotation.get("area"),
                "polygon_count": len(sample_annotation.get("segmentation", [])),
            }
        )

    print("Top 10 categories by annotation count:")
    for category_id, count in top_categories:
        print(f"- {category_lookup.get(category_id, category_id)}: {count}")
    print()


def main() -> None:
    print(f"Dataset root: {DATASET_ROOT}")
    print(f"README exists: {(DATASET_ROOT / 'README.md').exists()}")
    print()

    summarize_split("Train.json", "train")
    summarize_split("Test.json", "test")


if __name__ == "__main__":
    main()
