from __future__ import annotations

from pathlib import Path

from scenes import AssemblerScene


def _format_srt_time(seconds: float) -> str:
    total_ms = max(0, int(round(seconds * 1000)))
    hours, remainder = divmod(total_ms, 3_600_000)
    minutes, remainder = divmod(remainder, 60_000)
    secs, millis = divmod(remainder, 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def write_srt(scenes: list[AssemblerScene], output_path: Path) -> Path:
    lines: list[str] = []
    for index, scene in enumerate(scenes, start=1):
        text = scene.text.strip()
        if not text:
            continue
        lines.extend(
            [
                str(index),
                f"{_format_srt_time(scene.start)} --> {_format_srt_time(scene.end)}",
                text,
                "",
            ]
        )

    output_path.write_text("\n".join(lines), encoding="utf-8")
    return output_path