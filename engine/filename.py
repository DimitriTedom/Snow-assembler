from __future__ import annotations

import re
from pathlib import Path

DEFAULT_OUTPUT_FILENAME = "assembled.mp4"
_INVALID_CHARS = re.compile(r'[<>:"/\\|?*\x00-\x1f]')


def sanitize_output_filename(raw: str | None) -> str:
    trimmed = (raw or "").strip()
    if not trimmed:
        return DEFAULT_OUTPUT_FILENAME

    safe = _INVALID_CHARS.sub("", trimmed)
    safe = re.sub(r"\s+", " ", safe).strip()
    if not safe:
        return DEFAULT_OUTPUT_FILENAME

    path = Path(safe)
    stem = path.stem or "assembled"
    return f"{stem}.mp4"