"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { formatElapsed } from "@/lib/format-elapsed";

export function useOperationTimer() {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const startedAtRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTick = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    clearTick();
    const now = Date.now();
    startedAtRef.current = now;
    setElapsedMs(0);
    setIsRunning(true);
    intervalRef.current = setInterval(() => {
      if (startedAtRef.current) {
        setElapsedMs(Date.now() - startedAtRef.current);
      }
    }, 250);
  }, [clearTick]);

  const stop = useCallback(() => {
    clearTick();
    const finalMs = startedAtRef.current ? Date.now() - startedAtRef.current : 0;
    setElapsedMs(finalMs);
    setIsRunning(false);
    startedAtRef.current = null;
    return finalMs;
  }, [clearTick]);

  const reset = useCallback(() => {
    clearTick();
    startedAtRef.current = null;
    setElapsedMs(0);
    setIsRunning(false);
  }, [clearTick]);

  useEffect(() => () => clearTick(), [clearTick]);

  return {
    elapsedMs,
    elapsedLabel: formatElapsed(elapsedMs),
    isRunning,
    start,
    stop,
    reset,
  };
}