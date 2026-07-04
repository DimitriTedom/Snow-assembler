from __future__ import annotations

from pathlib import Path

from scenes import load_scenes_json

AUDIO_EXTENSIONS = {".mp3", ".m4a", ".wav", ".aac", ".ogg", ".flac"}
SCENES_FILENAMES = (
    "scenes.json",
    "transcriber.json",
    "agent.json",
)
IMAGE_DIR_NAMES = ("images", "image", "frames", "assets")


def resolve_project_paths(
    project_dir: Path,
    *,
    scenes_json_path: Path | None = None,
    images_dir: Path | None = None,
    audio_path: Path | None = None,
    output_filename: str = "assembled.mp4",
) -> tuple[Path, Path, Path, Path]:
    if not project_dir.exists():
        raise FileNotFoundError(f"Project directory not found: {project_dir}")

    scenes_path = scenes_json_path or discover_scenes_json(project_dir)
    images_path = images_dir or discover_images_dir(project_dir)
    narration_path = audio_path or discover_audio_file(project_dir)
    output_path = project_dir / output_filename

    return scenes_path, images_path, narration_path, output_path


def discover_scenes_json(project_dir: Path) -> Path:
    for name in SCENES_FILENAMES:
        candidate = project_dir / name
        if candidate.exists():
            return candidate

    json_files = sorted(project_dir.glob("*.json"))
    for candidate in json_files:
        try:
            load_scenes_json(candidate)
            return candidate
        except Exception:
            continue

    raise FileNotFoundError(
        f"No scenes JSON found in {project_dir}. "
        "Expected Snow-transcriber export or Zenn episode JSON."
    )


def discover_images_dir(project_dir: Path, *, required: bool = True) -> Path | None:
    for name in IMAGE_DIR_NAMES:
        candidate = project_dir / name
        if candidate.exists() and candidate.is_dir():
            return candidate

    image_files = [
        path
        for path in project_dir.iterdir()
        if path.is_file() and path.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}
    ]
    if image_files:
        return project_dir

    if required:
        raise FileNotFoundError(
            f"No images directory found in {project_dir}. "
            f"Create one of: {', '.join(IMAGE_DIR_NAMES)}"
        )
    return None


def discover_audio_file(project_dir: Path) -> Path:
    audio_files = [
        path
        for path in project_dir.iterdir()
        if path.is_file() and path.suffix.lower() in AUDIO_EXTENSIONS
    ]

    if not audio_files:
        raise FileNotFoundError(
            f"No narration audio found in {project_dir}. "
            f"Supported: {', '.join(sorted(AUDIO_EXTENSIONS))}"
        )

    if len(audio_files) == 1:
        return audio_files[0]

    preferred = [path for path in audio_files if "narration" in path.stem.lower()]
    if preferred:
        return preferred[0]

    return sorted(audio_files, key=lambda path: path.stat().st_size, reverse=True)[0]