from __future__ import annotations

import shutil
import subprocess
from typing import Literal

QualityPreset = Literal["draft", "standard", "high"]


def ensure_ffmpeg() -> str:
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("FFmpeg is not installed or not available on PATH.")
    return ffmpeg


def encode_args(quality: QualityPreset = "standard") -> list[str]:
    if quality == "draft":
        return ["-preset", "ultrafast", "-crf", "28"]
    if quality == "high":
        return ["-preset", "slow", "-crf", "18"]
    return ["-preset", "medium", "-crf", "23"]


def run_command(command: list[str], error_prefix: str) -> None:
    result = subprocess.run(
        command,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        stderr = (result.stderr or result.stdout or "Unknown FFmpeg error.").strip()
        raise RuntimeError(f"{error_prefix}: {stderr}")