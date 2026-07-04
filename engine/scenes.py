from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal


SceneSource = Literal["snow_transcriber", "zenn_timeline", "generic"]


@dataclass(frozen=True)
class AssemblerScene:
    id: int
    start: float
    end: float
    duration: float
    text: str
    match_key: str


def parse_timestamp(value: str | float | int) -> float:
    if isinstance(value, (int, float)):
        return float(value)

    raw = str(value).strip()
    if not raw:
        raise ValueError("Empty timestamp value.")

    if ":" not in raw:
        return float(raw)

    parts = raw.split(":")
    if len(parts) == 2:
        minutes, seconds = parts
        return int(minutes) * 60 + float(seconds)
    if len(parts) == 3:
        hours, minutes, seconds = parts
        return int(hours) * 3600 + int(minutes) * 60 + float(seconds)

    raise ValueError(f"Unsupported timestamp format: {value}")


def format_match_key(seconds: float) -> str:
    total = max(0, int(round(seconds)))
    minutes, secs = divmod(total, 60)
    return f"{minutes:02d}{secs:02d}"


def load_scenes_json(path: Path) -> tuple[list[AssemblerScene], SceneSource, dict[str, Any]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    return normalize_scenes_payload(payload), detect_scene_source(payload), payload


def detect_scene_source(payload: dict[str, Any]) -> SceneSource:
    if isinstance(payload.get("timeline"), list):
        return "zenn_timeline"
    if isinstance(payload.get("scenes"), list):
        return "snow_transcriber"
    if isinstance(payload.get("agentJson"), dict) and isinstance(payload["agentJson"].get("scenes"), list):
        return "snow_transcriber"
    return "generic"


def normalize_scenes_payload(payload: dict[str, Any]) -> list[AssemblerScene]:
    source = detect_scene_source(payload)

    if source == "zenn_timeline":
        return _from_zenn_timeline(payload["timeline"])
    if source == "snow_transcriber":
        scenes = payload.get("scenes")
        if not isinstance(scenes, list):
            scenes = payload.get("agentJson", {}).get("scenes", [])
        return _from_snow_transcriber(scenes)

    raise ValueError(
        "Unsupported scenes JSON. Expected Snow-transcriber export or Zenn timeline format."
    )


def _from_zenn_timeline(timeline: list[dict[str, Any]]) -> list[AssemblerScene]:
    scenes: list[AssemblerScene] = []

    for index, entry in enumerate(timeline, start=1):
        start = parse_timestamp(entry["start_time"])
        end = parse_timestamp(entry["end_time"])
        duration = round(end - start, 3)
        if duration <= 0:
            raise ValueError(f"Scene {index} has non-positive duration ({duration}s).")

        scenes.append(
            AssemblerScene(
                id=index,
                start=round(start, 3),
                end=round(end, 3),
                duration=duration,
                text=str(entry.get("narration", "")).strip(),
                match_key=format_match_key(start),
            )
        )

    return scenes


def _from_snow_transcriber(scenes: list[dict[str, Any]]) -> list[AssemblerScene]:
    normalized: list[AssemblerScene] = []

    for entry in scenes:
        scene_id = int(entry["id"])
        start = float(entry["start"])
        end = float(entry["end"])
        duration = float(entry.get("duration", end - start))
        if duration <= 0:
            raise ValueError(f"Scene {scene_id} has non-positive duration ({duration}s).")

        normalized.append(
            AssemblerScene(
                id=scene_id,
                start=round(start, 3),
                end=round(end, 3),
                duration=round(duration, 3),
                text=str(entry.get("text", "")).strip(),
                match_key=format_match_key(start),
            )
        )

    return normalized