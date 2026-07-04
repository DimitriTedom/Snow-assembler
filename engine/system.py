from __future__ import annotations

import os
import platform
import time
from pathlib import Path

import psutil

# Warm up CPU sampling so the first reading is meaningful.
psutil.cpu_percent(interval=None)


def _format_bytes(value: int) -> dict[str, float | str]:
    gib = value / (1024**3)
    return {
        "bytes": value,
        "gib": round(gib, 2),
        "display": f"{gib:.1f} GiB",
    }


def get_system_stats() -> dict:
    memory = psutil.virtual_memory()
    disk_path = os.getenv("ASSEMBLER_OUTPUT_DIR", "/tmp/snow-assembler-output")
    disk = psutil.disk_usage(disk_path)

    cpu_percent = psutil.cpu_percent(interval=0.1)
    cpu_count = psutil.cpu_count(logical=True) or 1

    load_avg: list[float] | None = None
    if hasattr(os, "getloadavg"):
        load_avg = [round(value, 2) for value in os.getloadavg()]

    return {
        "timestamp": time.time(),
        "host": platform.node(),
        "platform": platform.system(),
        "cpu": {
            "percent": round(cpu_percent, 1),
            "count": cpu_count,
            "loadAverage": load_avg,
        },
        "memory": {
            "total": _format_bytes(memory.total),
            "used": _format_bytes(memory.used),
            "available": _format_bytes(memory.available),
            "percent": round(memory.percent, 1),
        },
        "disk": {
            "path": disk_path,
            "total": _format_bytes(disk.total),
            "used": _format_bytes(disk.used),
            "free": _format_bytes(disk.free),
            "percent": round(disk.percent, 1),
        },
        "process": {
            "pid": os.getpid(),
            "memoryPercent": round(psutil.Process().memory_percent(), 2),
        },
        "context": "docker" if Path("/.dockerenv").exists() else "host",
    }