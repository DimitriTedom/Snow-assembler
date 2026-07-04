"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface InteractiveGridPatternProps extends React.HTMLAttributes<HTMLDivElement> {
  cellSize?: number;
  lineColor?: string;
  maxOpacity?: number;
  interactive?: boolean;
}

const InteractiveGridPattern = ({
  className,
  cellSize = 56,
  lineColor = "0, 0, 0",
  maxOpacity = 0.16,
  interactive = false,
  ...props
}: InteractiveGridPatternProps) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState<{ x: number; y: number } | null>(null);

  React.useEffect(() => {
    if (!interactive) return;

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointerQuery = window.matchMedia("(any-hover: hover) and (any-pointer: fine)");
    if (reducedMotionQuery.matches || !finePointerQuery.matches) return;

    let frameId = 0;

    const handlePointerMove = (event: PointerEvent) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (x < 0 || x > rect.width || y < 0 || y > rect.height) return;

      if (frameId) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => setPosition({ x, y }));
    };

    const handleLeave = () => setPosition(null);

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerleave", handleLeave);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handleLeave);
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [interactive]);

  const maskCenter = position ? `${position.x}px ${position.y}px` : "50% 50%";

  return (
    <div
      ref={ref}
      className={cn("pointer-events-none absolute inset-0", className)}
      style={{
        backgroundImage: `linear-gradient(rgba(${lineColor},0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(${lineColor},0.09) 1px, transparent 1px)`,
        backgroundSize: `${cellSize}px ${cellSize}px`,
        maskImage: `radial-gradient(320px circle at ${maskCenter}, rgba(0,0,0,${maxOpacity}), transparent 80%)`,
        WebkitMaskImage: `radial-gradient(320px circle at ${maskCenter}, rgba(0,0,0,${maxOpacity}), transparent 80%)`,
      }}
      aria-hidden="true"
      {...props}
    />
  );
};

export default InteractiveGridPattern;
