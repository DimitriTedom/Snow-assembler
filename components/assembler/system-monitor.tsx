"use client";

import { useEffect, useState } from "react";
import { Cpu, HardDrive, MemoryStick } from "lucide-react";

import { cn } from "@/lib/utils";
import type { SystemStats } from "@/lib/assembler/types";

type SystemMonitorProps = {
  active?: boolean;
  pollIntervalMs?: number;
};

function MetricBar({
  label,
  value,
  icon: Icon,
  detail,
  highlight,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  detail: string;
  highlight?: boolean;
}) {
  const tone =
    value >= 90 ? "bg-rose-500" : value >= 70 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </span>
        <span className={cn("font-medium tabular-nums", highlight && "text-accent")}>
          {value.toFixed(1)}%
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
        <div
          className={cn("h-full rounded-full transition-all duration-500", tone)}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground">{detail}</p>
    </div>
  );
}

export function SystemMonitor({ active = false, pollIntervalMs = 2500 }: SystemMonitorProps) {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function poll() {
      try {
        const response = await fetch("/api/system-stats", { cache: "no-store" });
        const payload = await response.json();

        if (!mounted) return;

        if (!response.ok) {
          setError(payload.error ?? "System stats unavailable.");
          setStats(null);
          return;
        }

        setStats(payload as SystemStats);
        setError(null);
      } catch {
        if (mounted) {
          setError("Cannot reach engine for system stats.");
          setStats(null);
        }
      }
    }

    poll();
    const interval = window.setInterval(poll, pollIntervalMs);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [pollIntervalMs]);

  if (error) {
    return (
      <div className="rounded-xl border border-white/8 bg-secondary/20 px-4 py-3 text-xs text-muted-foreground">
        {error}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-xl border border-white/8 bg-secondary/20 px-4 py-3 text-xs text-muted-foreground">
        Reading engine system metrics...
      </div>
    );
  }

  const contextLabel = stats.context === "docker" ? "Docker engine container" : "Engine host";

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 transition-colors",
        active
          ? "border-accent/30 bg-accent/5"
          : "border-white/8 bg-secondary/20",
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">System load</p>
          <p className="text-xs text-muted-foreground">
            {contextLabel}
            {active ? " · rendering in progress" : " · live while engine is online"}
          </p>
        </div>
        {stats.cpu.count > 0 ? (
          <span className="rounded-md border border-white/8 px-2 py-1 text-[11px] text-muted-foreground">
            {stats.cpu.count} CPU{stats.cpu.count === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricBar
          label="CPU"
          value={stats.cpu.percent}
          icon={Cpu}
          detail={
            stats.cpu.loadAverage
              ? `Load ${stats.cpu.loadAverage.map((v) => v.toFixed(2)).join(" / ")}`
              : "Higher CPU usually means faster FFmpeg encoding"
          }
          highlight={active}
        />
        <MetricBar
          label="RAM"
          value={stats.memory.percent}
          icon={MemoryStick}
          detail={`${stats.memory.used.display} / ${stats.memory.total.display}`}
          highlight={active}
        />
        <MetricBar
          label="Disk"
          value={stats.disk.percent}
          icon={HardDrive}
          detail={`${stats.disk.free.display} free on output volume`}
          highlight={active}
        />
      </div>
    </div>
  );
}