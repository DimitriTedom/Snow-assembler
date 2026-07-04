import { Clapperboard, FolderOpen, ImageIcon } from "lucide-react";

const steps = [
  {
    icon: ImageIcon,
    title: "Batch images",
    description: "Zapi/Flow exports named with timestamp prefixes (0000_, 0002_…).",
  },
  {
    icon: FolderOpen,
    title: "Scene JSON",
    description: "Snow-transcriber export or Zenn episode timeline JSON with durations.",
  },
  {
    icon: Clapperboard,
    title: "Auto assemble",
    description: "Trim each still to its timestamp, concat, mux Google TTS narration.",
  },
];

export function WorkflowSteps({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "grid gap-3" : "grid gap-4 md:grid-cols-3"}>
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
  );
}