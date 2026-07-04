from __future__ import annotations

from pathlib import Path

from scenes import load_scenes_json

AUDIO_EXTENSIONS = {".mp3", ".m4a", ".wav", ".aac", ".ogg", ".flac"}
SCENES_FILENAMES = (
    "scenes.json",
    "transcriber.json",
    "agent.json",
    "snow-transcriber-agent.json",
)
SCENES_GLOBS = (
    "*transcriber*.json",
    "*agent*.json",
)
IMAGE_DIR_NAMES = ("images", "image", "frames", "assets")
VIDEO_DIR_NAMES = ("videos", "clips", "veo3", "scenes", "episode")
VIDEO_EXTENSIONS = {".mp4", ".mov", ".webm", ".mkv", ".m4v"}


def _resolve_optional_path(project_dir: Path, raw_path: str | None) -> Path | None:
    if raw_path is None:
        return None

    cleaned = raw_path.strip()
    if not cleaned or cleaned in {".", "./", "images/", "images", "image/", "image"}:
        return None

    candidate = Path(cleaned)
    if not candidate.is_absolute():
        candidate = project_dir / candidate

    return candidate


def resolve_project_paths(
    project_dir: Path,
    *,
    scenes_json_path: Path | None = None,
    images_dir: Path | str | None = None,
    videos_dir: Path | str | None = None,
    audio_path: Path | str | None = None,
    output_filename: str = "assembled.mp4",
    media_type: str = "images",
) -> tuple[Path, Path, Path, Path]:
    if not project_dir.exists():
        raise FileNotFoundError(f"Project directory not found: {project_dir}")

    scenes_path = scenes_json_path or discover_scenes_json(project_dir)

    resolved_images = (
        _resolve_optional_path(project_dir, str(images_dir))
        if isinstance(images_dir, str)
        else images_dir
    )
    resolved_videos = (
        _resolve_optional_path(project_dir, str(videos_dir))
        if isinstance(videos_dir, str)
        else videos_dir
    )
    resolved_audio = (
        _resolve_optional_path(project_dir, str(audio_path))
        if isinstance(audio_path, str)
        else audio_path
    )

    if media_type == "videos":
        media_path = resolved_videos or discover_videos_dir(project_dir)
        if media_path is None:
            raise FileNotFoundError(
                f"No Veo3 clips folder found in {project_dir}. "
                f"Add a subfolder with SCENE_XX.mp4 files or set videos_dir."
            )
    else:
        media_path = resolved_images or discover_images_dir(project_dir)

    narration_path = resolved_audio if resolved_audio and resolved_audio.exists() else discover_audio_file(project_dir)
    output_path = project_dir / output_filename

    return scenes_path, media_path, narration_path, output_path


def discover_scenes_json(project_dir: Path) -> Path:
    for name in SCENES_FILENAMES:
        candidate = project_dir / name
        if candidate.exists():
            return candidate

    for pattern in SCENES_GLOBS:
        for candidate in sorted(project_dir.glob(pattern)):
            try:
                load_scenes_json(candidate)
                return candidate
            except Exception:
                continue

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


def discover_videos_dir(project_dir: Path, *, required: bool = True) -> Path | None:
    for name in VIDEO_DIR_NAMES:
        candidate = project_dir / name
        if candidate.exists() and candidate.is_dir() and _has_scene_videos(candidate):
            return candidate

    subdirs = sorted(
        [path for path in project_dir.iterdir() if path.is_dir()],
        key=lambda path: path.name.lower(),
    )
    for candidate in subdirs:
        if _has_scene_videos(candidate):
            return candidate

    root_videos = [
        path
        for path in project_dir.iterdir()
        if path.is_file() and path.suffix.lower() in VIDEO_EXTENSIONS
    ]
    if root_videos:
        return project_dir

    if required:
        raise FileNotFoundError(
            f"No Veo3 clips folder found in {project_dir}. "
            "Expected a subfolder with SCENE_XX.mp4 files."
        )
    return None


def _has_scene_videos(directory: Path) -> bool:
    videos = [
        path
        for path in directory.iterdir()
        if path.is_file() and path.suffix.lower() in VIDEO_EXTENSIONS
    ]
    if not videos:
        return False
    scene_named = sum(1 for path in videos if path.stem.upper().startswith("SCENE_"))
    return scene_named >= max(1, len(videos) // 4)