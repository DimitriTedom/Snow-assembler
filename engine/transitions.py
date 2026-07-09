from __future__ import annotations

from pathlib import Path
from typing import Literal

from ffmpeg_util import ensure_ffmpeg, run_command

TransitionMode = Literal["none", "crossfade", "fade_black", "wipe_left", "slide_left"]

_XFADE_MAP: dict[str, str] = {
    "crossfade": "fade",
    "fade_black": "fadeblack",
    "wipe_left": "wipeleft",
    "slide_left": "slideleft",
}


def concat_clips(
    clip_paths: list[Path],
    output_path: Path,
    *,
    transition: TransitionMode = "none",
    transition_duration: float = 0.4,
    scene_durations: list[float] | None = None,
    fps: int = 30,
) -> None:
    if not clip_paths:
        raise ValueError("No clips to concatenate.")

    ffmpeg = ensure_ffmpeg()

    if transition == "none" or len(clip_paths) == 1:
        _concat_copy(ffmpeg, clip_paths, output_path)
        return

    durations = scene_durations or [0.0] * len(clip_paths)
    if len(durations) != len(clip_paths):
        raise ValueError("scene_durations length must match clip_paths.")

    xfade_name = _XFADE_MAP.get(transition, "fade")
    _concat_xfade(
        ffmpeg,
        clip_paths,
        output_path,
        durations=durations,
        transition_name=xfade_name,
        transition_duration=transition_duration,
        fps=fps,
    )


def _concat_copy(ffmpeg: str, clip_paths: list[Path], output_path: Path) -> None:
    concat_file = output_path.with_suffix(".txt")
    lines = [f"file '{path.as_posix()}'" for path in clip_paths]
    concat_file.write_text("\n".join(lines) + "\n", encoding="utf-8")

    command = [
        ffmpeg,
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        str(concat_file),
        "-c",
        "copy",
        str(output_path),
    ]

    try:
        run_command(command, "Failed to concatenate scene clips.")
    finally:
        concat_file.unlink(missing_ok=True)


def _concat_xfade(
    ffmpeg: str,
    clip_paths: list[Path],
    output_path: Path,
    *,
    durations: list[float],
    transition_name: str,
    transition_duration: float,
    fps: int,
) -> None:
    transition_duration = max(0.1, min(transition_duration, 2.0))
    inputs: list[str] = []
    for path in clip_paths:
        inputs.extend(["-i", str(path)])

    filter_parts: list[str] = []
    current = "[0:v]"
    elapsed = durations[0]

    for index in range(1, len(clip_paths)):
        next_label = f"[{index}:v]"
        out_label = f"[v{index}]" if index < len(clip_paths) - 1 else "[vout]"
        offset = max(0.0, elapsed - transition_duration)
        filter_parts.append(
            f"{current}{next_label}xfade=transition={transition_name}"
            f":duration={transition_duration:.3f}:offset={offset:.3f}{out_label}"
        )
        current = out_label
        elapsed += durations[index] - transition_duration

    filter_complex = ";".join(filter_parts)
    command = [
        ffmpeg,
        "-y",
        *inputs,
        "-filter_complex",
        filter_complex,
        "-map",
        "[vout]",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-r",
        str(fps),
        str(output_path),
    ]
    run_command(command, f"Failed to concatenate clips with {transition_name} transition.")