from __future__ import annotations

import shutil
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Literal

from ffmpeg_util import QualityPreset, encode_args, ensure_ffmpeg, run_command
from images import SceneAsset
from transitions import TransitionMode, concat_clips
from videos import VideoAsset

MotionMode = Literal["none", "ken_burns"]
ProgressCallback = Callable[[int, int, str], None] | None


@dataclass(frozen=True)
class AssemblyResult:
    output_path: Path
    scene_count: int
    total_duration: float
    temp_dir: Path
    captions_path: Path | None = None


def build_scale_filter(width: int, height: int, motion: MotionMode, duration: float, fps: int) -> str:
    base = (
        f"scale={width}:{height}:force_original_aspect_ratio=decrease,"
        f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:color=black"
    )

    if motion != "ken_burns":
        return base

    frames = max(1, int(round(duration * fps)))
    zoom = (
        f"zoompan=z='min(zoom+0.0008,1.08)':x='iw/2-(iw/zoom/2)':"
        f"y='ih/2-(ih/zoom/2)':d={frames}:s={width}x{height}:fps={fps}"
    )
    return f"{base},{zoom}"


def image_to_clip(
    ffmpeg: str,
    asset: SceneAsset,
    output_path: Path,
    *,
    width: int,
    height: int,
    fps: int,
    motion: MotionMode,
    quality: QualityPreset = "standard",
) -> None:
    duration = asset.scene.duration
    video_filter = build_scale_filter(width, height, motion, duration, fps)

    command = [
        ffmpeg,
        "-y",
        "-loop",
        "1",
        "-i",
        str(asset.image_path),
        "-t",
        f"{duration:.3f}",
        "-vf",
        video_filter,
        "-c:v",
        "libx264",
        *encode_args(quality),
        "-pix_fmt",
        "yuv420p",
        "-r",
        str(fps),
        "-an",
        str(output_path),
    ]

    run_command(command, f"Failed to render scene {asset.scene.id:02d}")


def video_to_clip(
    ffmpeg: str,
    asset: VideoAsset,
    output_path: Path,
    *,
    width: int,
    height: int,
    fps: int,
    quality: QualityPreset = "standard",
) -> None:
    duration = asset.scene.duration
    video_filter = build_scale_filter(width, height, "none", duration, fps)

    command = [
        ffmpeg,
        "-y",
        "-i",
        str(asset.video_path),
        "-t",
        f"{duration:.3f}",
        "-vf",
        video_filter,
        "-c:v",
        "libx264",
        *encode_args(quality),
        "-pix_fmt",
        "yuv420p",
        "-r",
        str(fps),
        "-an",
        str(output_path),
    ]

    run_command(command, f"Failed to trim scene {asset.scene.id:02d} ({asset.video_path.name})")


def mux_audio(
    ffmpeg: str,
    video_path: Path,
    audio_path: Path,
    output_path: Path,
) -> None:
    command = [
        ffmpeg,
        "-y",
        "-i",
        str(video_path),
        "-i",
        str(audio_path),
        "-map",
        "0:v:0",
        "-map",
        "1:a:0",
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-shortest",
        str(output_path),
    ]

    run_command(command, "Failed to mux narration audio.")


def assemble_video_episode(
    assets: list[VideoAsset],
    audio_path: Path,
    output_path: Path,
    *,
    width: int = 1920,
    height: int = 1080,
    fps: int = 30,
    transition: TransitionMode = "none",
    transition_duration: float = 0.4,
    quality: QualityPreset = "standard",
    on_progress: ProgressCallback = None,
) -> AssemblyResult:
    if not assets:
        raise ValueError("No matched scene videos to assemble.")

    if not audio_path.exists():
        raise FileNotFoundError(f"Narration audio not found: {audio_path}")

    ffmpeg = ensure_ffmpeg()
    output_path.parent.mkdir(parents=True, exist_ok=True)

    temp_dir = Path(tempfile.mkdtemp(prefix="snow-assembler-video-"))
    clip_paths: list[Path] = []
    durations: list[float] = []

    try:
        total = len(assets)
        for index, asset in enumerate(assets, start=1):
            if on_progress:
                on_progress(index, total, "rendering_clips")
            clip_path = temp_dir / f"scene_{asset.scene.id:04d}.mp4"
            video_to_clip(
                ffmpeg,
                asset,
                clip_path,
                width=width,
                height=height,
                fps=fps,
                quality=quality,
            )
            clip_paths.append(clip_path)
            durations.append(asset.scene.duration)

        if on_progress:
            on_progress(total, total, "concatenating")

        silent_video = temp_dir / "video_only.mp4"
        concat_clips(
            clip_paths,
            silent_video,
            transition=transition,
            transition_duration=transition_duration,
            scene_durations=durations,
            fps=fps,
        )

        if on_progress:
            on_progress(total, total, "muxing_audio")

        mux_audio(ffmpeg, silent_video, audio_path, output_path)

        total_duration = round(sum(asset.scene.duration for asset in assets), 3)
        return AssemblyResult(
            output_path=output_path,
            scene_count=len(assets),
            total_duration=total_duration,
            temp_dir=temp_dir,
        )
    except Exception:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise


def assemble_image_episode(
    assets: list[SceneAsset],
    audio_path: Path,
    output_path: Path,
    *,
    width: int = 1920,
    height: int = 1080,
    fps: int = 30,
    motion: MotionMode = "none",
    transition: TransitionMode = "none",
    transition_duration: float = 0.4,
    quality: QualityPreset = "standard",
    on_progress: ProgressCallback = None,
) -> AssemblyResult:
    if not assets:
        raise ValueError("No matched scene assets to assemble.")

    if not audio_path.exists():
        raise FileNotFoundError(f"Narration audio not found: {audio_path}")

    ffmpeg = ensure_ffmpeg()
    output_path.parent.mkdir(parents=True, exist_ok=True)

    temp_dir = Path(tempfile.mkdtemp(prefix="snow-assembler-"))
    clip_paths: list[Path] = []
    durations: list[float] = []

    try:
        total = len(assets)
        for index, asset in enumerate(assets, start=1):
            if on_progress:
                on_progress(index, total, "rendering_clips")
            clip_path = temp_dir / f"scene_{asset.scene.id:04d}.mp4"
            image_to_clip(
                ffmpeg,
                asset,
                clip_path,
                width=width,
                height=height,
                fps=fps,
                motion=motion,
                quality=quality,
            )
            clip_paths.append(clip_path)
            durations.append(asset.scene.duration)

        if on_progress:
            on_progress(total, total, "concatenating")

        silent_video = temp_dir / "video_only.mp4"
        concat_clips(
            clip_paths,
            silent_video,
            transition=transition,
            transition_duration=transition_duration,
            scene_durations=durations,
            fps=fps,
        )

        if on_progress:
            on_progress(total, total, "muxing_audio")

        mux_audio(ffmpeg, silent_video, audio_path, output_path)

        total_duration = round(sum(asset.scene.duration for asset in assets), 3)
        return AssemblyResult(
            output_path=output_path,
            scene_count=len(assets),
            total_duration=total_duration,
            temp_dir=temp_dir,
        )
    except Exception:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise


def cleanup_temp_dir(temp_dir: Path) -> None:
    shutil.rmtree(temp_dir, ignore_errors=True)