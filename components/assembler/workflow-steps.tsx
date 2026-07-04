import { Clapperboard, FileJson, Film, ImageIcon, Music2 } from "lucide-react";

import { cn } from "@/lib/utils";

export type WorkflowVariant = "zenn" | "crave" | "all";

const zennSteps = [
  {
    icon: ImageIcon,
    title: "Batch images",
    description: "Zapi exports with timestamp prefixes (0000_, 0002_…) or SCENE_XX naming.",
  },
  {
    icon: FileJson,
    title: "Scene JSON",
    description: "Snow-transcriber export or Zenn episode timeline with exact durations.",
  },
  {
    icon: Clapperboard,
    title: "Auto assemble",
    description: "Trim each still to its timestamp, concat, mux Google TTS narration.",
  },
];

const craveSteps = [
  {
    icon: Film,
    title: "Veo3 clips",
    description: "SCENE_01.mp4 … SCENE_XX.mp4 in an episode subfolder (one clip per scene).",
  },
  {
    icon: FileJson,
    title: "Transcriber JSON",
    description: "snow-transcriber-agent.json with fixed or pause-based scene timestamps.",
  },
  {
    icon: Music2,
    title: "Mux & render",
    description: "Trim each clip to scene duration, concat timeline, lay voiceover underneath.",
  },
];

export function WorkflowSteps({
  variant = "zenn",
  compact = false,
}: {
  variant?: WorkflowVariant;
  compact?: boolean;
}) {
  if (variant === "all") {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <WorkflowGroup label="Zenn / SnowAgeBrain" steps={zennSteps} compact={compact} />
        <WorkflowGroup label="CRAVE & CONQUER / Veo3" steps={craveSteps} compact={compact} />
      </div>
    );
  }

  const steps = variant === "crave" ? craveSteps : zennSteps;
  return <WorkflowGroup steps={steps} compact={compact} />;
}

function WorkflowGroup({
  label,
  steps,
  compact,
}: {
  label?: string;
  steps: typeof zennSteps;
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
            className="group cursor-default rounded-xl border border-white/8 bg-secondary/40 p-4 transition-colors duration-200 hover:border-primary/25 hover:bg-secondary/70"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary transition-colors group-hover:bg-primary/25">
                <step.icon className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-accent">0{index + 1}</span>
                  <h3 className="text-sm font-semibold">{step.title}</h3>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}