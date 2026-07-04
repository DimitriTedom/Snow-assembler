import Link from "next/link";
import { Clapperboard, ImageIcon, Timer } from "lucide-react";

import { WorkflowSteps } from "@/components/assembler/workflow-steps";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-2xl border border-white/8 bg-card/60 p-8 backdrop-blur-sm">
        <p className="text-sm text-muted-foreground">Snow Assembler · Image workflow MVP</p>
        <h1 className="mt-3 max-w-3xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Automate CapCut for <span className="text-primary">batch image episodes</span>
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Built for Zenn / SnowAgeBrain: Zapi batch images + Zenn timeline JSON + Google TTS. Snow-assembler
          trims each still to its timestamp, concatenates the timeline, and exports a ready MP4.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild className="cursor-pointer snow-glow">
            <Link href="/assembler">Open workspace</Link>
          </Button>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <FeatureCard
            icon={ImageIcon}
            title="Timestamp matching"
            description="Maps 0000_, 0002_ Zapi filenames to Zenn timeline start times automatically."
          />
          <FeatureCard
            icon={Timer}
            title="Exact durations"
            description="Reads Snow-transcriber JSON or Zenn episode timeline — no manual clip trimming."
          />
          <FeatureCard
            icon={Clapperboard}
            title="One-click render"
            description="FFmpeg engine assembles hundreds of stills and lays narration underneath."
          />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Pipeline</h2>
        <WorkflowSteps />
      </section>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-secondary/40 p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}