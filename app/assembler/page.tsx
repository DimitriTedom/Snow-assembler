import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AssemblerWorkspace } from "@/components/assembler/assembler-workspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Workspace",
  description: "Assemble batch images into timestamp-synced videos with FFmpeg.",
};

export default function AssemblerPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <Button asChild variant="ghost" size="sm" className="-ml-2 h-8 cursor-pointer px-2 text-muted-foreground">
            <Link href="/">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Home
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default">SnowAgeBrain / Zenn</Badge>
            <Badge variant="secondary">Image MVP</Badge>
            <Badge variant="outline">FFmpeg local</Badge>
          </div>
          <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Images → <span className="text-primary">synced episode</span>
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Replace CapCut assembly for stick-figure niches. Trim each batch image to its
            Snow-transcriber or Zenn timeline duration, concat, and mux Google TTS narration.
          </p>
        </div>
      </div>

      <AssemblerWorkspace />
    </div>
  );
}