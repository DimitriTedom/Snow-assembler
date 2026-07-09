from __future__ import annotations

from typing import Any, Literal

MediaType = Literal["images", "videos"]
ImageNaming = Literal["auto", "timestamp", "sequential"]
MotionMode = Literal["none", "ken_burns"]
TransitionMode = Literal["none", "crossfade", "fade_black", "wipe_left", "slide_left"]
QualityPreset = Literal["draft", "standard", "high"]

PRESETS: dict[str, dict[str, Any]] = {
    "slideshow-static": {
        "id": "slideshow-static",
        "label": "Slideshow — static cuts",
        "description": "Still images with hard cuts. Best for explainer and documentary episodes.",
        "mediaType": "images",
        "imageNaming": "sequential",
        "motion": "none",
        "transition": "none",
        "transitionDuration": 0.4,
        "quality": "standard",
        "fps": 30,
    },
    "slideshow-ken-burns": {
        "id": "slideshow-ken-burns",
        "label": "Slideshow — Ken Burns",
        "description": "Subtle zoom on stills with optional crossfades between scenes.",
        "mediaType": "images",
        "imageNaming": "sequential",
        "motion": "ken_burns",
        "transition": "crossfade",
        "transitionDuration": 0.5,
        "quality": "standard",
        "fps": 30,
    },
    "slideshow-cinematic": {
        "id": "slideshow-cinematic",
        "label": "Slideshow — cinematic fades",
        "description": "Fade-to-black between scenes for a film-trailer rhythm.",
        "mediaType": "images",
        "imageNaming": "auto",
        "motion": "ken_burns",
        "transition": "fade_black",
        "transitionDuration": 0.6,
        "quality": "high",
        "fps": 30,
    },
    "video-clips-standard": {
        "id": "video-clips-standard",
        "label": "Video clips — standard",
        "description": "Trim generated clips to scene timestamps and mux narration.",
        "mediaType": "videos",
        "imageNaming": "sequential",
        "motion": "none",
        "transition": "none",
        "transitionDuration": 0.4,
        "quality": "standard",
        "fps": 30,
    },
    "video-clips-smooth": {
        "id": "video-clips-smooth",
        "label": "Video clips — smooth crossfade",
        "description": "Crossfade between AI-generated clips for smoother pacing.",
        "mediaType": "videos",
        "imageNaming": "sequential",
        "motion": "none",
        "transition": "crossfade",
        "transitionDuration": 0.35,
        "quality": "standard",
        "fps": 30,
    },
    "draft-preview": {
        "id": "draft-preview",
        "label": "Draft preview (fast)",
        "description": "Low-quality fast encode for timing checks before final render.",
        "mediaType": "images",
        "imageNaming": "sequential",
        "motion": "none",
        "transition": "none",
        "transitionDuration": 0.3,
        "quality": "draft",
        "fps": 24,
    },
}


def list_presets() -> list[dict[str, Any]]:
    return list(PRESETS.values())


def get_preset(preset_id: str) -> dict[str, Any]:
    preset = PRESETS.get(preset_id)
    if preset is None:
        raise KeyError(f"Unknown preset: {preset_id}")
    return preset