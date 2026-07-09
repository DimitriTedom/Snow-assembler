import { Clapperboard, FileJson, Film, ImageIcon, Music2, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

export type WorkflowVariant = "slideshow" | "video-clips" | "all";

const slideshowSteps = [
  {
    icon: ImageIcon,
    title: "Scene images",
    description: "Batch stills with sequential (SCENE_01) or timestamp (0000_) prefixes.",
  },
  {
    icon: FileJson,
    title: "Timeline JSON",
    description: "Scene durations from any transcriber export or custom timeline file.",
  },
  {
    icon: Sparkles,
    title: "Assemble",
    description: "Trim each still, apply transitions, and mux narration audio.",
  },
];

const videoClipSteps = [
  {
    icon: Film,
    title: "Scene clips",
    description: "One video file per scene (SCENE_01.mp4, clip_01.mp4, etc.).",
  },
  {
    icon: FileJson,
    title: "Timeline JSON",
    description: "Scene timestamps that define how long each clip stays on screen.",
  },
  {
    icon: Music2,
    title: "Render",
    description: "Trim clips, crossfade optional, mux voiceover underneath.",
  },
];

export function WorkflowSteps({
  variant = "slideshow",
  compact = false,
}: {
  variant?: WorkflowVariant;
  compact?: boolean;
}) {
  if (variant === "all") {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <WorkflowGroup label="Image slideshow" steps={slideshowSteps} compact={compact} />
        <WorkflowGroup label="Video clips" steps={videoClipSteps} compact={compact} />
      </div>
    );
  }

  const steps = variant === "video-clips" ? videoClipSteps : slideshowSteps;
  return <WorkflowGroup steps={steps} compact={compact} />;
}

function WorkflowGroup({
  label,
  steps,
  compact,
}: {
  label?: string;
  steps: typeof slideshowSteps;
  compact?: boolean;
}) {
  return (
    <div className="space-y-3">
      {label ? (
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      ) : null}
      <div className={cn(compact ? "grid gap-3" : "grid gap-4 md:grid-cols-3")}>
        {steps.map((step, index) => (
          <div
            key={step.title}
            className="rounded-xl border border-white/8 bg-secondary/30 p-4 backdrop-blur-sm"
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 font-mono text-xs text-primary">
                {index + 1}
              </span>
              <step.icon className="h-4 w-4 text-accent" />
              <p className="text-sm font-medium">{step.title}</p>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">{step.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}