"use client";

import { Timer } from "lucide-react";

import { formatElapsed } from "@/lib/format-elapsed";
import { cn } from "@/lib/utils";

type OperationTimerProps = {
  label: string;
  elapsedMs: number;
  active?: boolean;
  className?: string;
  variant?: "inline" | "badge" | "panel";
};

export function OperationTimer({
  label,
  elapsedMs,
  active = false,
  className,
  variant = "inline",
}: OperationTimerProps) {
  const value = (
    <>
      {formatElapsed(elapsedMs)}
      {active ? "…" : ""}
    </>
  );

  if (variant === "panel") {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-secondary/30 px-3 py-2 font-mono text-sm",
          className,
        )}
      >
        <span className="flex items-center gap-2 text-muted-foreground">
          <Timer className="h-4 w-4" />
          {label}
        </span>
        <span className={cn("tabular-nums", active && "text-amber-300")}>{value}</span>
      </div>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-xs tabular-nums text-muted-foreground",
        active && "text-amber-200",
        className,
      )}
    >
      <Timer className="h-3.5 w-3.5" />
      {label}: {value}
    </span>
  );
}