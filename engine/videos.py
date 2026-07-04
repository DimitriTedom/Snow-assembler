from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

from scenes import AssemblerScene

VIDEO_EXTENSIONS = {".mp4", ".mov", ".webm", ".mkv", ".m4v"}


@dataclass(frozen=True)
class VideoAsset:
    scene: AssemblerScene
    video_path: Path


@dataclass(frozen=True)
class VideoValidation:
    matched: list[VideoAsset]
    missing: list[AssemblerScene]
    unused_videos: list[Path]


def list_videos(videos_dir: Path) -> list[Path]:
    if not videos_dir.exists():
        raise FileNotFoundError(f"Videos directory not found: {videos_dir}")

    videos = [
        path
        for path in videos_dir.iterdir()
        if path.is_file() and path.suffix.lower() in VIDEO_EXTENSIONS
    ]
    return sorted(videos, key=_sequence_sort_key)


def match_scenes_to_videos(
    scenes: list[AssemblerScene],
    videos_dir: Path,
) -> VideoValidation:
    videos = list_videos(videos_dir)
    if not videos:
        raise FileNotFoundError(f"No video clips found in {videos_dir}")

    matched: list[VideoAsset] = []
    missing: list[AssemblerScene] = []
    used: set[Path] = set()

    for scene in scenes:
        video = _find_sequence_video(scene.id, videos, used)
        if video is None:
            missing.append(scene)
            continue
        matched.append(VideoAsset(scene=scene, video_path=video))
        used.add(video)

    unused = [video for video in videos if video not in used]
    return VideoValidation(matched=matched, missing=missing, unused_videos=unused)


def _sequence_sort_key(path: Path) -> tuple[int, str]:
    match = re.search(r"(?:scene[_\-.]?|clip[_\-.]?)?(\d+)", path.stem, re.IGNORECASE)
    if match:
        return int(match.group(1)), path.name.lower()
    return 10_000, path.name.lower()


def _find_sequence_video(
    scene_id: int,
    videos: list[Path],
    used: set[Path],
) -> Path | None:
    candidates = [
        rf"^scene[_\-.]?0*{scene_id}(?:[_\-.]|$)",
        rf"^0*{scene_id}[_\-.]",
        rf"^0*{scene_id}\.",
    ]

    for video in videos:
        if video in used:
            continue
        stem = video.stem.lower()
        if any(re.match(pattern, stem, re.IGNORECASE) for pattern in candidates):
            return video

    unused = [video for video in videos if video not in used]
    index = scene_id - 1
    if 0 <= index < len(videos) and videos[index] not in used:
        return videos[index]

    return None