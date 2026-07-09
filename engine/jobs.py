from __future__ import annotations

import asyncio
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Callable, Literal

JobStatus = Literal["queued", "running", "completed", "failed", "cancelled"]


@dataclass
class JobRecord:
    id: str
    status: JobStatus = "queued"
    phase: str = "queued"
    progress: float = 0.0
    current_scene: int = 0
    total_scenes: int = 0
    message: str = "Queued"
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)
    result: dict[str, Any] | None = None
    error: str | None = None
    cancel_requested: bool = False

    def to_dict(self) -> dict[str, Any]:
        return {
            "jobId": self.id,
            "status": self.status,
            "phase": self.phase,
            "progress": round(self.progress, 1),
            "currentScene": self.current_scene,
            "totalScenes": self.total_scenes,
            "message": self.message,
            "createdAt": self.created_at,
            "updatedAt": self.updated_at,
            "result": self.result,
            "error": self.error,
        }


_jobs: dict[str, JobRecord] = {}
_tasks: dict[str, asyncio.Task[None]] = {}


def create_job() -> JobRecord:
    job = JobRecord(id=uuid.uuid4().hex[:12])
    _jobs[job.id] = job
    return job


def get_job(job_id: str) -> JobRecord | None:
    return _jobs.get(job_id)


def request_cancel(job_id: str) -> bool:
    job = _jobs.get(job_id)
    if job is None:
        return False
    job.cancel_requested = True
    job.message = "Cancellation requested"
    job.updated_at = time.time()
    task = _tasks.get(job_id)
    if task and not task.done():
        task.cancel()
    return True


def make_progress_updater(job: JobRecord) -> Callable[[int, int, str], None]:
    def update(current: int, total: int, phase: str) -> None:
        if job.cancel_requested:
            raise asyncio.CancelledError("Assembly cancelled.")
        job.status = "running"
        job.phase = phase
        job.current_scene = current
        job.total_scenes = total
        job.progress = (current / total * 100.0) if total else 0.0
        job.message = f"{phase} — scene {current}/{total}"
        job.updated_at = time.time()

    return update


async def run_job(job: JobRecord, worker: Callable[[Callable[[int, int, str], None]], dict[str, Any]]) -> None:
    progress = make_progress_updater(job)

    try:
        job.status = "running"
        job.phase = "starting"
        job.message = "Starting assembly"
        job.updated_at = time.time()

        result = await asyncio.to_thread(worker, progress)
        job.result = result
        job.status = "completed"
        job.phase = "done"
        job.progress = 100.0
        job.message = "Assembly complete"
        job.updated_at = time.time()
    except asyncio.CancelledError:
        job.status = "cancelled"
        job.phase = "cancelled"
        job.message = "Assembly cancelled"
        job.updated_at = time.time()
    except Exception as error:  # noqa: BLE001
        job.status = "failed"
        job.phase = "failed"
        job.error = str(error)
        job.message = str(error)
        job.updated_at = time.time()
    finally:
        _tasks.pop(job.id, None)


def launch_job(job: JobRecord, worker: Callable[[Callable[[int, int, str], None]], dict[str, Any]]) -> None:
    task = asyncio.create_task(run_job(job, worker))
    _tasks[job.id] = task