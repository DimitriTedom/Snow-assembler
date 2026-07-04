from __future__ import annotations

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

from assemble import AssemblyResult, assemble_image_episode, cleanup_temp_dir, ensure_ffmpeg
from images import ImageNaming, match_scenes_to_images
from project import discover_images_dir, discover_scenes_json, resolve_project_paths
from scenes import SceneSource, load_scenes_json, normalize_scenes_payload
from system import get_system_stats

app = FastAPI(title="Snow Assembler Engine", version="0.1.0")

allowed_origins = os.getenv("ENGINE_CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in allowed_origins if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OUTPUT_ROOT = Path(os.getenv("ASSEMBLER_OUTPUT_DIR", "/tmp/snow-assembler-output"))
OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)


class ProjectAssemblyRequest(BaseModel):
    project_dir: str
    scenes_json_path: str | None = None
    images_dir: str | None = None
    audio_path: str | None = None
    output_filename: str = "assembled.mp4"
    image_naming: ImageNaming = "auto"
    width: int = Field(default=1920, ge=640, le=3840)
    height: int = Field(default=1080, ge=360, le=2160)
    fps: int = Field(default=30, ge=24, le=60)
    motion: Literal["none", "ken_burns"] = "none"


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
    scenes: list[SceneMatchSummary]
    missingScenes: list[SceneMatchSummary]
    unusedImages: list[str]


class AssemblyResponse(BaseModel):
    sceneSource: SceneSource
    sceneCount: int
    totalDuration: float
    outputPath: str
    downloadUrl: str | None = None


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
        scenes=scene_summaries,
        missingScenes=missing_summaries,
        unusedImages=[path.name for path in validation.unused_images],
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
        scenes_path, images_path, _, _ = resolve_project_paths(
            project_dir,
            scenes_json_path=Path(request.scenes_json_path) if request.scenes_json_path else None,
            images_dir=request.images_dir,
            audio_path=request.audio_path,
            output_filename=request.output_filename,
        )

        if images_path is None or not images_path.exists():
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
                scenes=scene_summaries,
                missingScenes=scene_summaries,
                unusedImages=[],
            )

        return build_validation(scenes_path, images_path, request.image_naming)
    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@app.post("/assemble/images/project", response_model=AssemblyResponse)
def assemble_images_project(request: ProjectAssemblyRequest) -> AssemblyResponse:
    try:
        scenes_path, images_path, audio_path, output_path = resolve_project_paths(
            Path(request.project_dir),
            scenes_json_path=Path(request.scenes_json_path) if request.scenes_json_path else None,
            images_dir=request.images_dir,
            audio_path=request.audio_path,
            output_filename=request.output_filename,
        )

        scenes, source, _ = load_scenes_json(scenes_path)
        validation = match_scenes_to_images(scenes, images_path, naming=request.image_naming)

        if validation.missing:
            missing_keys = ", ".join(scene.match_key for scene in validation.missing[:8])
            suffix = "..." if len(validation.missing) > 8 else ""
            raise ValueError(
                f"{len(validation.missing)} scenes are missing images "
                f"(timestamp keys: {missing_keys}{suffix})."
            )

        result = assemble_image_episode(
            validation.matched,
            audio_path,
            output_path,
            width=request.width,
            height=request.height,
            fps=request.fps,
            motion=request.motion,
        )
        cleanup_temp_dir(result.temp_dir)

        return AssemblyResponse(
            sceneSource=source,
            sceneCount=result.scene_count,
            totalDuration=result.total_duration,
            outputPath=str(result.output_path),
        )
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
) -> FileResponse:
    temp_dir = Path(tempfile.mkdtemp(prefix="snow-assembler-upload-"))
    job_id = temp_dir.name.split("-")[-1]
    output_path = OUTPUT_ROOT / f"assembled_{job_id}.mp4"

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

        result = assemble_image_episode(
            validation.matched,
            narration_path,
            output_path,
            width=width,
            height=height,
            fps=fps,
            motion=motion,
        )
        cleanup_temp_dir(result.temp_dir)

        return FileResponse(
            path=result.output_path,
            media_type="video/mp4",
            filename="assembled.mp4",
            headers={
                "X-Snow-Scene-Count": str(result.scene_count),
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