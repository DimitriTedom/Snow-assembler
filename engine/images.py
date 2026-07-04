from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from scenes import AssemblerScene

ImageNaming = Literal["auto", "timestamp", "sequential"]

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".bmp"}


@dataclass(frozen=True)
class SceneAsset:
    scene: AssemblerScene
    image_path: Path


@dataclass(frozen=True)
class AssetValidation:
    matched: list[SceneAsset]
    missing: list[AssemblerScene]
    unused_images: list[Path]


def list_images(images_dir: Path) -> list[Path]:
    if not images_dir.exists():
        raise FileNotFoundError(f"Images directory not found: {images_dir}")

    images = [
        path
        for path in images_dir.iterdir()
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
    ]
    return sorted(images, key=lambda path: path.name.lower())


def match_scenes_to_images(
    scenes: list[AssemblerScene],
    images_dir: Path,
    naming: ImageNaming = "auto",
) -> AssetValidation:
    images = list_images(images_dir)
    if not images:
        raise FileNotFoundError(f"No images found in {images_dir}")

    effective_naming = naming
    if naming == "auto":
        effective_naming = "timestamp" if looks_timestamp_named(images) else "sequential"

    if effective_naming == "timestamp":
        matched, missing, unused = _match_by_timestamp(scenes, images)
    else:
        matched, missing, unused = _match_by_sequence(scenes, images)

    return AssetValidation(matched=matched, missing=missing, unused_images=unused)


def looks_timestamp_named(images: list[Path]) -> bool:
    timestamp_hits = 0
    for image in images[: min(12, len(images))]:
        if re.match(r"^\d{4}[_\-.]", image.name):
            timestamp_hits += 1
    return timestamp_hits >= max(1, len(images[:12]) // 2)


def _match_by_timestamp(
    scenes: list[AssemblerScene],
    images: list[Path],
) -> tuple[list[SceneAsset], list[AssemblerScene], list[Path]]:
    by_prefix: dict[str, Path] = {}
    for image in images:
        prefix = _timestamp_prefix(image.name)
        if prefix and prefix not in by_prefix:
            by_prefix[prefix] = image

    matched: list[SceneAsset] = []
    missing: list[AssemblerScene] = []
    used: set[Path] = set()

    for scene in scenes:
        image = by_prefix.get(scene.match_key)
        if image is None:
            missing.append(scene)
            continue
        matched.append(SceneAsset(scene=scene, image_path=image))
        used.add(image)

    unused = [image for image in images if image not in used]
    return matched, missing, unused


def _match_by_sequence(
    scenes: list[AssemblerScene],
    images: list[Path],
) -> tuple[list[SceneAsset], list[AssemblerScene], list[Path]]:
    indexed_images = sorted(images, key=_sequence_sort_key)

    matched: list[SceneAsset] = []
    missing: list[AssemblerScene] = []
    used: set[Path] = set()

    for scene in scenes:
        image = _find_sequence_image(scene.id, indexed_images, used)
        if image is None:
            missing.append(scene)
            continue
        matched.append(SceneAsset(scene=scene, image_path=image))
        used.add(image)

    unused = [image for image in images if image not in used]
    return matched, missing, unused


def _timestamp_prefix(filename: str) -> str | None:
    match = re.match(r"^(\d{4})[_\-.]", filename)
    if match:
        return match.group(1)
    match = re.match(r"^(\d{4})\.", filename)
    if match:
        return match.group(1)
    return None


def _sequence_sort_key(path: Path) -> tuple[int, str]:
    match = re.search(r"(?:scene[_\-.]?|img[_\-.]?)?(\d+)", path.stem, re.IGNORECASE)
    if match:
        return int(match.group(1)), path.name.lower()
    return 10_000, path.name.lower()


def _find_sequence_image(
    scene_id: int,
    images: list[Path],
    used: set[Path],
) -> Path | None:
    candidates = [
        rf"^scene[_\-.]?0*{scene_id}(?:[_\-.]|$)",
        rf"^0*{scene_id}[_\-.]",
        rf"^0*{scene_id}\.",
    ]

    for image in images:
        if image in used:
            continue
        stem = image.stem.lower()
        if any(re.match(pattern, stem, re.IGNORECASE) for pattern in candidates):
            return image

    unused = [image for image in images if image not in used]
    if len(unused) == 1:
        return unused[0]

    index = scene_id - 1
    if 0 <= index < len(images) and images[index] not in used:
        return images[index]

    return None