"use client";

import * as React from "react";
import { animate, useInView, useMotionValue } from "framer-motion";
import { cn } from "@/lib/utils";

interface NumberTickerProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: number;
  startValue?: number;
  duration?: number;
  delay?: number;
  decimalPlaces?: number;
  locale?: string;
}

const NumberTicker = ({
  value,
  startValue = 0,
  duration = 1.4,
  delay = 0,
  decimalPlaces = 0,
  locale = "en-US",
  className,
  ...props
}: NumberTickerProps) => {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.7 });
  const motionValue = useMotionValue(startValue);
  const [display, setDisplay] = React.useState(startValue);

  React.useEffect(() => {
    const unsubscribe = motionValue.on("change", (latest) => setDisplay(latest));
    return () => unsubscribe();
  }, [motionValue]);

  React.useEffect(() => {
    if (!inView) return;

    const controls = animate(motionValue, value, {
      duration,
      delay,
      ease: "easeOut",
    });

    return () => controls.stop();
  }, [inView, motionValue, value, duration, delay]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)} {...props}>
      {Number(display).toLocaleString(locale, {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
      })}
    </span>
  );
};

export default NumberTicker;
