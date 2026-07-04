"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TypingAnimationProps extends React.HTMLAttributes<HTMLDivElement> {
  text: string;
  speed?: number;
  startDelay?: number;
  loop?: boolean;
  pauseMs?: number;
  showCursor?: boolean;
}

const TypingAnimation = ({
  text,
  speed = 36,
  startDelay = 0,
  loop = true,
  pauseMs = 1500,
  showCursor = true,
  className,
  ...props
}: TypingAnimationProps) => {
  const [displayText, setDisplayText] = React.useState("");
  const [isDone, setIsDone] = React.useState(false);

  React.useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let intervalId: ReturnType<typeof setInterval> | undefined;
    let index = 0;

    const startTyping = () => {
      setDisplayText("");
      setIsDone(false);
      index = 0;

      intervalId = setInterval(() => {
        index += 1;
        setDisplayText(text.slice(0, index));
        if (index >= text.length) {
          if (intervalId) clearInterval(intervalId);
          setIsDone(true);

          if (loop) {
            timeoutId = setTimeout(startTyping, pauseMs);
          }
        }
      }, speed);
    };

    timeoutId = setTimeout(startTyping, startDelay);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [text, speed, startDelay, loop, pauseMs]);

  return (
    <div className={cn("inline-flex items-center", className)} {...props}>
      <span>{displayText}</span>
      {showCursor && (
        <span
          className={cn(
            "ml-1 inline-block h-[1em] w-[2px] animate-pulse bg-accent",
            isDone && !loop ? "opacity-0" : "opacity-100",
          )}
        />
      )}
    </div>
  );
};

export default TypingAnimation;
