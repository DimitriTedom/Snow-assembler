import Link from "next/link";
import { Clapperboard, Film, ImageIcon, Timer } from "lucide-react";

import { WorkflowSteps } from "@/components/assembler/workflow-steps";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-2xl border border-white/8 bg-card/60 p-8 backdrop-blur-sm">
        <p className="text-sm text-muted-foreground">Snow Assembler · Images & Veo3 clips</p>
        <h1 className="mt-3 max-w-3xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Automate CapCut for <span className="text-primary">timestamp-synced episodes</span>
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Two pipelines, one FFmpeg engine: Zenn stick-figure images (Zapi + timeline JSON) and CRAVE
          &amp; CONQUER Veo3 clips (SCENE_XX.mp4 + Snow-transcriber JSON). Match assets to scene
          durations, concat, mux narration — no manual trimming.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild className="cursor-pointer snow-glow">
            <Link href="/assembler">Open workspace</Link>
          </Button>
          <Button asChild variant="outline" className="cursor-pointer">
            <Link href="/assembler?workflow=crave">CRAVE test episode</Link>
          </Button>
          <Button asChild variant="outline" className="cursor-pointer">
            <Link href="/mcp">Connect AI (MCP)</Link>
          </Button>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon={ImageIcon}
            title="Zenn images"
            description="0000_ / SCENE_XX stills trimmed to Zenn or transcriber timestamps."
          />
          <FeatureCard
            icon={Film}
            title="Veo3 clips"
            description="SCENE_01.mp4 … matched to Snow-transcriber JSON — CRAVE workflow."
          />
          <FeatureCard
            icon={Timer}
            title="Exact durations"
            description="Scene lengths come from audio pacing, not guesswork or CapCut drag."
          />
          <FeatureCard
            icon={Clapperboard}
            title="Local FFmpeg"
            description="Hundreds of scenes assembled on your machine. System metrics while rendering."
          />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <WorkflowCard
          title="Zenn / SnowAgeBrain"
          description="Episode folder under Documents/Zenn with images/, timeline JSON, and TTS .m4a."
          href="/assembler?workflow=zenn"
          cta="Assemble images"
        />
        <WorkflowCard
          title="CRAVE & CONQUER"
          description="Videos folder with snow-transcriber-agent.json, narration .m4a, and SCENE_XX.mp4 clips."
          href="/assembler?workflow=crave"
          cta="Assemble Veo3 clips"
          accent
        />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Pipelines</h2>
        <WorkflowSteps variant="all" />
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

function WorkflowCard({
  title,
  description,
  href,
  cta,
  accent,
}: {
  title: string;
  description: string;
  href: string;
  cta: string;
  accent?: boolean;
}) {
  return (
    <div
      className={
        accent
          ? "rounded-2xl border border-primary/25 bg-primary/5 p-6"
          : "rounded-2xl border border-white/8 bg-card/60 p-6 backdrop-blur-sm"
      }
    >
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
      <Button asChild variant={accent ? "default" : "outline"} size="sm" className="mt-4 cursor-pointer">
        <Link href={href}>{cta}</Link>
      </Button>
    </div>
  );
}