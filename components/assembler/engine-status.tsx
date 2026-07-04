"use client";

import { useEffect, useState } from "react";
import { Activity, AlertCircle, CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type EngineHealth = {
  status: string;
  service?: string;
  ffmpeg?: string;
};

export function EngineStatus() {
  const [health, setHealth] = useState<EngineHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function checkHealth() {
      try {
        const response = await fetch("/api/engine-health", { cache: "no-store" });
        const payload = await response.json();
        if (mounted) {
          setHealth(payload);
        }
      } catch {
        if (mounted) {
          setHealth({ status: "offline", ffmpeg: "Cannot reach engine." });
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    checkHealth();
    const interval = window.setInterval(checkHealth, 15000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const isOnline = health?.status === "ok";
  const ffmpegReady = health?.ffmpeg === "ok";

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-xl border px-4 py-3",
        isOnline ? "border-emerald-500/20 bg-emerald-500/5" : "border-amber-500/20 bg-amber-500/5",
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg",
            isOnline ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400",
          )}
        >
          {isLoading ? (
            <Activity className="h-4 w-4 animate-pulse" />
          ) : isOnline ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium">FFmpeg assembler engine</p>
          <p className="text-xs text-muted-foreground">
            {isLoading
              ? "Checking engine..."
              : isOnline
                ? ffmpegReady
                  ? "Online — ready to render image timelines"
                  : `Online — ${health?.ffmpeg}`
                : health?.ffmpeg ?? "Offline — run npm run engine:up"}
          </p>
        </div>
      </div>
      <Badge variant={isOnline && ffmpegReady ? "success" : "warning"}>
        {isLoading ? "..." : isOnline && ffmpegReady ? "Ready" : "Unavailable"}
      </Badge>
    </div>
  );
}