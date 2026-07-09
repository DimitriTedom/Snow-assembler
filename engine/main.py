from __future__ import annotations

import asyncio
import json
import os
import shutil
import tempfile
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from assemble import (
    AssemblyResult,
    assemble_image_episode,
    assemble_video_episode,
    cleanup_temp_dir,
)
from captions import write_srt
from ffmpeg_util import QualityPreset, ensure_ffmpeg
from images import ImageNaming, match_scenes_to_images
from jobs import create_job, get_job, launch_job, request_cancel
from presets import get_preset, list_presets
from project import discover_images_dir, discover_scenes_json, resolve_project_paths
from scenes import SceneSource, load_scenes_json, normalize_scenes_payload
from system import get_system_stats
from filename import sanitize_output_filename
from transitions import TransitionMode
from videos import match_scenes_to_videos

MediaType = Literal["images", "videos"]

app = FastAPI(title="Snow Assembler Engine", version="0.1.0")

def _default_cors_origins() -> list[str]:
    origins: list[str] = []
    for port in range(3000, 3006):
        origins.append(f"http://localhost:{port}")
        origins.append(f"http://127.0.0.1:{port}")
    return origins


_raw_cors = os.getenv("ENGINE_CORS_ORIGINS", "").strip()
allowed_origins = (
    [origin.strip() for origin in _raw_cors.split(",") if origin.strip()]
    if _raw_cors
    else _default_cors_origins()
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OUTPUT_ROOT = Path(os.getenv("ASSEMBLER_OUTPUT_DIR", "/tmp/snow-assembler-output"))
OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)


def resolve_writable_output_path(project_dir: Path, output_filename: str) -> Path:
    preferred = project_dir / output_filename
    if os.access(project_dir, os.W_OK):
        return preferred

    slug = project_dir.name or "episode"
    parent = project_dir.parent.name
    if parent and parent not in {".", "/"}:
        slug = f"{parent}-{slug}"

    out_dir = OUTPUT_ROOT / slug
    out_dir.mkdir(parents=True, exist_ok=True)
    return out_dir / output_filename


class ProjectAssemblyRequest(BaseModel):
    project_dir: str
    scenes_json_path: str | None = None
    images_dir: str | None = None
    videos_dir: str | None = None
    audio_path: str | None = None
    output_filename: str = "assembled.mp4"
    media_type: MediaType = "images"
    image_naming: ImageNaming = "auto"
    width: int = Field(default=1920, ge=640, le=3840)
    height: int = Field(default=1080, ge=360, le=2160)
    fps: int = Field(default=30, ge=24, le=60)
    motion: Literal["none", "ken_burns"] = "none"
    transition: TransitionMode = "none"
    transition_duration: float = Field(default=0.4, ge=0.1, le=2.0)
    quality: QualityPreset = "standard"
    export_captions: bool = False
    scene_range_start: int | None = Field(default=None, ge=1)
    scene_range_end: int | None = Field(default=None, ge=1)
    preset_id: str | None = None


class SceneMatchSummary(BaseModel):
    id: int
    start: float
    end: float
    duration: float
    match_key: str
    image: str | None
    text: str


class ValidationResponse(BaseModel):
    sceneSource: SceneSource
    sceneCount: int
    totalDuration: float
    matchedCount: int
    missingCount: int
    unusedImageCount: int
    imageNaming: ImageNaming
    mediaType: MediaType = "images"
    scenes: list[SceneMatchSummary]
    missingScenes: list[SceneMatchSummary]
    unusedImages: list[str]


class AssemblyResponse(BaseModel):
    sceneSource: SceneSource
    sceneCount: int
    totalDuration: float
    outputPath: str
    captionsPath: str | None = None
    downloadUrl: str | None = None


def apply_preset(request: ProjectAssemblyRequest) -> ProjectAssemblyRequest:
    if not request.preset_id:
        return request

    preset = get_preset(request.preset_id)
    return request.model_copy(
        update={
            "media_type": preset.get("mediaType", request.media_type),
            "image_naming": preset.get("imageNaming", request.image_naming),
            "motion": preset.get("motion", request.motion),
            "transition": preset.get("transition", request.transition),
            "transition_duration": preset.get("transitionDuration", request.transition_duration),
            "quality": preset.get("quality", request.quality),
            "fps": preset.get("fps", request.fps),
        }
    )


def filter_assets_by_range(assets, scene_range_start: int | None, scene_range_end: int | None):
    if scene_range_start is None and scene_range_end is None:
        return assets

    filtered = []
    for asset in assets:
        scene_id = asset.scene.id
        if scene_range_start is not None and scene_id < scene_range_start:
            continue
        if scene_range_end is not None and scene_id > scene_range_end:
            continue
        filtered.append(asset)

    if not filtered:
        raise ValueError("No scenes matched the requested scene range.")
    return filtered


def build_validation(
    scenes_json: Path,
    images_dir: Path,
    image_naming: ImageNaming,
) -> ValidationResponse:
    scenes, source, _ = load_scenes_json(scenes_json)
    validation = match_scenes_to_images(scenes, images_dir, naming=image_naming)

    matched_lookup = {asset.scene.id: asset.image_path.name for asset in validation.matched}

    scene_summaries = [
        SceneMatchSummary(
            id=scene.id,
            start=scene.start,
            end=scene.end,
            duration=scene.duration,
            match_key=scene.match_key,
            image=matched_lookup.get(scene.id),
            text=scene.text,
        )
        for scene in scenes
    ]

    missing_summaries = [
        SceneMatchSummary(
            id=scene.id,
            start=scene.start,
            end=scene.end,
            duration=scene.duration,
            match_key=scene.match_key,
            image=None,
            text=scene.text,
        )
        for scene in validation.missing
    ]

    total_duration = round(sum(scene.duration for scene in scenes), 3)
    effective_naming: ImageNaming = image_naming
    if image_naming == "auto":
        from images import list_images, looks_timestamp_named

        effective_naming = "timestamp" if looks_timestamp_named(list_images(images_dir)) else "sequential"

    return ValidationResponse(
        sceneSource=source,
        sceneCount=len(scenes),
        totalDuration=total_duration,
        matchedCount=len(validation.matched),
        missingCount=len(validation.missing),
        unusedImageCount=len(validation.unused_images),
        imageNaming=effective_naming,
        mediaType="images",
        scenes=scene_summaries,
        missingScenes=missing_summaries,
        unusedImages=[path.name for path in validation.unused_images],
    )


def build_video_validation(scenes_json: Path, videos_dir: Path) -> ValidationResponse:
    scenes, source, _ = load_scenes_json(scenes_json)
    validation = match_scenes_to_videos(scenes, videos_dir)

    matched_lookup = {asset.scene.id: asset.video_path.name for asset in validation.matched}

    scene_summaries = [
        SceneMatchSummary(
            id=scene.id,
            start=scene.start,
            end=scene.end,
            duration=scene.duration,
            match_key=scene.match_key,
            image=matched_lookup.get(scene.id),
            text=scene.text,
        )
        for scene in scenes
    ]

    missing_summaries = [
        SceneMatchSummary(
            id=scene.id,
            start=scene.start,
            end=scene.end,
            duration=scene.duration,
            match_key=scene.match_key,
            image=None,
            text=scene.text,
        )
        for scene in validation.missing
    ]

    total_duration = round(sum(scene.duration for scene in scenes), 3)

    return ValidationResponse(
        sceneSource=source,
        sceneCount=len(scenes),
        totalDuration=total_duration,
        matchedCount=len(validation.matched),
        missingCount=len(validation.missing),
        unusedImageCount=len(validation.unused_videos),
        imageNaming="sequential",
        mediaType="videos",
        scenes=scene_summaries,
        missingScenes=missing_summaries,
        unusedImages=[path.name for path in validation.unused_videos],
    )


@app.get("/system/stats")
def system_stats() -> dict:
    return get_system_stats()


@app.get("/health")
def health() -> dict[str, str]:
    try:
        ensure_ffmpeg()
        ffmpeg_status = "ok"
    except RuntimeError as error:
        ffmpeg_status = str(error)

    return {
        "status": "ok",
        "service": "snow-assembler-engine",
        "ffmpeg": ffmpeg_status,
    }


@app.post("/validate/project", response_model=ValidationResponse)
def validate_project(request: ProjectAssemblyRequest) -> ValidationResponse:
    try:
        project_dir = Path(request.project_dir)
        scenes_path, media_path, _, _ = resolve_project_paths(
            project_dir,
            scenes_json_path=Path(request.scenes_json_path) if request.scenes_json_path else None,
            images_dir=request.images_dir,
            videos_dir=request.videos_dir,
            audio_path=request.audio_path,
            output_filename=request.output_filename,
            media_type=request.media_type,
        )

        if media_path is None or not media_path.exists():
            scenes, source, _ = load_scenes_json(scenes_path)
            total_duration = round(sum(scene.duration for scene in scenes), 3)
            scene_summaries = [
                SceneMatchSummary(
                    id=scene.id,
                    start=scene.start,
                    end=scene.end,
                    duration=scene.duration,
                    match_key=scene.match_key,
                    image=None,
                    text=scene.text,
                )
                for scene in scenes
            ]
            return ValidationResponse(
                sceneSource=source,
                sceneCount=len(scenes),
                totalDuration=total_duration,
                matchedCount=0,
                missingCount=len(scenes),
                unusedImageCount=0,
                imageNaming=request.image_naming,
                mediaType=request.media_type,
                scenes=scene_summaries,
                missingScenes=scene_summaries,
                unusedImages=[],
            )

        if request.media_type == "videos":
            return build_video_validation(scenes_path, media_path)

        return build_validation(scenes_path, media_path, request.image_naming)
    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


def _assemble_images_project(
    request: ProjectAssemblyRequest,
    on_progress=None,
) -> AssemblyResponse:
    request = apply_preset(request)
    project_dir = Path(request.project_dir)
    scenes_path, images_path, audio_path, _ = resolve_project_paths(
        project_dir,
        scenes_json_path=Path(request.scenes_json_path) if request.scenes_json_path else None,
        images_dir=request.images_dir,
        audio_path=request.audio_path,
        output_filename=request.output_filename,
    )
    output_filename = sanitize_output_filename(request.output_filename)
    output_path = resolve_writable_output_path(project_dir, output_filename)

    scenes, source, _ = load_scenes_json(scenes_path)
    validation = match_scenes_to_images(scenes, images_path, naming=request.image_naming)

    if validation.missing:
        missing_keys = ", ".join(scene.match_key for scene in validation.missing[:8])
        suffix = "..." if len(validation.missing) > 8 else ""
        raise ValueError(
            f"{len(validation.missing)} scenes are missing images "
            f"(timestamp keys: {missing_keys}{suffix})."
        )

    matched = filter_assets_by_range(
        validation.matched,
        request.scene_range_start,
        request.scene_range_end,
    )

    result = assemble_image_episode(
        matched,
        audio_path,
        output_path,
        width=request.width,
        height=request.height,
        fps=request.fps,
        motion=request.motion,
        transition=request.transition,
        transition_duration=request.transition_duration,
        quality=request.quality,
        on_progress=on_progress,
    )
    cleanup_temp_dir(result.temp_dir)

    captions_path = None
    if request.export_captions:
        captions_file = output_path.with_suffix(".srt")
        write_srt([asset.scene for asset in matched], captions_file)
        captions_path = str(captions_file)

    return AssemblyResponse(
        sceneSource=source,
        sceneCount=result.scene_count,
        totalDuration=result.total_duration,
        outputPath=str(result.output_path),
        captionsPath=captions_path,
    )


@app.post("/assemble/images/project", response_model=AssemblyResponse)
async def assemble_images_project(request: ProjectAssemblyRequest) -> AssemblyResponse:
    try:
        return await asyncio.to_thread(_assemble_images_project, request)
    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except RuntimeError as error:
        raise HTTPException(status_code=500, detail=str(error)) from error


def _assemble_videos_project(
    request: ProjectAssemblyRequest,
    on_progress=None,
) -> AssemblyResponse:
    request = apply_preset(request)
    project_dir = Path(request.project_dir)
    scenes_path, videos_path, audio_path, _ = resolve_project_paths(
        project_dir,
        scenes_json_path=Path(request.scenes_json_path) if request.scenes_json_path else None,
        videos_dir=request.videos_dir,
        audio_path=request.audio_path,
        output_filename=request.output_filename,
        media_type="videos",
    )
    output_filename = sanitize_output_filename(request.output_filename)
    output_path = resolve_writable_output_path(project_dir, output_filename)

    scenes, source, _ = load_scenes_json(scenes_path)
    validation = match_scenes_to_videos(scenes, videos_path)

    if validation.missing:
        missing_ids = ", ".join(f"SCENE_{scene.id:02d}" for scene in validation.missing[:8])
        suffix = "..." if len(validation.missing) > 8 else ""
        raise ValueError(
            f"{len(validation.missing)} scenes are missing video clips "
            f"({missing_ids}{suffix})."
        )

    matched = filter_assets_by_range(
        validation.matched,
        request.scene_range_start,
        request.scene_range_end,
    )

    result = assemble_video_episode(
        matched,
        audio_path,
        output_path,
        width=request.width,
        height=request.height,
        fps=request.fps,
        transition=request.transition,
        transition_duration=request.transition_duration,
        quality=request.quality,
        on_progress=on_progress,
    )
    cleanup_temp_dir(result.temp_dir)

    captions_path = None
    if request.export_captions:
        captions_file = output_path.with_suffix(".srt")
        write_srt([asset.scene for asset in matched], captions_file)
        captions_path = str(captions_file)

    return AssemblyResponse(
        sceneSource=source,
        sceneCount=result.scene_count,
        totalDuration=result.total_duration,
        outputPath=str(result.output_path),
        captionsPath=captions_path,
    )


@app.post("/assemble/videos/project", response_model=AssemblyResponse)
async def assemble_videos_project(request: ProjectAssemblyRequest) -> AssemblyResponse:
    try:
        return await asyncio.to_thread(_assemble_videos_project, request)
    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except RuntimeError as error:
        raise HTTPException(status_code=500, detail=str(error)) from error


@app.post("/validate/upload", response_model=ValidationResponse)
async def validate_upload(
    scenes_json: UploadFile = File(...),
    images: list[UploadFile] = File(...),
    image_naming: ImageNaming = Form("auto"),
) -> ValidationResponse:
    temp_dir = Path(tempfile.mkdtemp(prefix="snow-assembler-validate-"))

    try:
        scenes_path = temp_dir / "scenes.json"
        scenes_path.write_bytes(await scenes_json.read())

        images_dir = temp_dir / "images"
        images_dir.mkdir(parents=True, exist_ok=True)

        for upload in images:
            if not upload.filename:
                continue
            target = images_dir / Path(upload.filename).name
            target.write_bytes(await upload.read())

        return build_validation(scenes_path, images_dir, image_naming)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


@app.post("/assemble/images/upload")
async def assemble_images_upload(
    scenes_json: UploadFile = File(...),
    narration: UploadFile = File(...),
    images: list[UploadFile] = File(...),
    image_naming: ImageNaming = Form("auto"),
    width: int = Form(1920),
    height: int = Form(1080),
    fps: int = Form(30),
    motion: Literal["none", "ken_burns"] = Form("none"),
    transition: TransitionMode = Form("none"),
    transition_duration: float = Form(0.4),
    quality: QualityPreset = Form("standard"),
    export_captions: bool = Form(False),
    output_filename: str = Form("assembled.mp4"),
) -> FileResponse:
    temp_dir = Path(tempfile.mkdtemp(prefix="snow-assembler-upload-"))
    job_id = temp_dir.name.split("-")[-1]
    safe_filename = sanitize_output_filename(output_filename)
    output_path = OUTPUT_ROOT / f"{Path(safe_filename).stem}_{job_id}.mp4"

    try:
        scenes_path = temp_dir / "scenes.json"
        scenes_path.write_bytes(await scenes_json.read())

        images_dir = temp_dir / "images"
        images_dir.mkdir(parents=True, exist_ok=True)
        for upload in images:
            if not upload.filename:
                continue
            target = images_dir / Path(upload.filename).name
            target.write_bytes(await upload.read())

        narration_path = temp_dir / (narration.filename or "narration.mp3")
        narration_path.write_bytes(await narration.read())

        scenes, source, _ = load_scenes_json(scenes_path)
        validation = match_scenes_to_images(scenes, images_dir, naming=image_naming)
        if validation.missing:
            raise HTTPException(
                status_code=400,
                detail=f"{len(validation.missing)} scenes are missing images.",
            )

        result = await asyncio.to_thread(
            assemble_image_episode,
            validation.matched,
            narration_path,
            output_path,
            width=width,
            height=height,
            fps=fps,
            motion=motion,
            transition=transition,
            transition_duration=transition_duration,
            quality=quality,
        )
        cleanup_temp_dir(result.temp_dir)

        if export_captions:
            captions_file = output_path.with_suffix(".srt")
            write_srt([asset.scene for asset in validation.matched], captions_file)

        return FileResponse(
            path=result.output_path,
            media_type="video/mp4",
            filename=safe_filename,
            headers={
                "X-Snow-Scene-Count": str(result.scene_count),
                "X-Snow-Output-Filename": safe_filename,
                "X-Snow-Scene-Source": source,
                "X-Snow-Total-Duration": str(result.total_duration),
            },
        )
    except HTTPException:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise
    except (ValueError, RuntimeError) as error:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=str(error)) from error


@app.get("/presets")
def presets() -> dict:
    return {"presets": list_presets()}


def _run_project_assembly_job(request: ProjectAssemblyRequest, on_progress):
    request = apply_preset(request)
    if request.media_type == "videos":
        response = _assemble_videos_project(request, on_progress=on_progress)
    else:
        response = _assemble_images_project(request, on_progress=on_progress)
    return response.model_dump()


@app.post("/assemble/jobs")
async def start_assembly_job(request: ProjectAssemblyRequest) -> dict:
    job = create_job()
    launch_job(job, lambda progress: _run_project_assembly_job(request, progress))
    return job.to_dict()


@app.get("/assemble/jobs/{job_id}")
def assembly_job_status(job_id: str) -> dict:
    job = get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job.to_dict()


@app.delete("/assemble/jobs/{job_id}")
def cancel_assembly_job(job_id: str) -> dict:
    if not request_cancel(job_id):
        raise HTTPException(status_code=404, detail="Job not found.")
    job = get_job(job_id)
    return job.to_dict() if job else {"jobId": job_id, "status": "cancelled"}


@app.post("/validate/json")
async def validate_json_payload(payload: dict) -> ValidationResponse:
    temp_dir = Path(tempfile.mkdtemp(prefix="snow-assembler-json-"))
    images_dir = temp_dir / "images"
    images_dir.mkdir(parents=True, exist_ok=True)

    try:
        scenes = normalize_scenes_payload(payload)
        scenes_path = temp_dir / "scenes.json"
        scenes_path.write_text(json.dumps(payload), encoding="utf-8")

        image_entries = payload.get("images", [])
        if isinstance(image_entries, list):
            for entry in image_entries:
                if not isinstance(entry, dict):
                    continue
                filename = entry.get("filename")
                content = entry.get("content_base64")
                if filename and content:
                    import base64

                    target = images_dir / filename
                    target.write_bytes(base64.b64decode(content))

        return build_validation(scenes_path, images_dir, "auto")
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)