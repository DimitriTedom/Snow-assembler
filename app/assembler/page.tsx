import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft, Plug } from "lucide-react";

import { AssemblerWorkspace } from "@/components/assembler/assembler-workspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Workspace",
  description: "Assemble Zenn image episodes or CRAVE Veo3 clip timelines with FFmpeg.",
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
            <Badge variant="default">Zenn images</Badge>
            <Badge variant="secondary">CRAVE Veo3</Badge>
            <Badge variant="outline">FFmpeg local</Badge>
          </div>
          <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Episode <span className="text-primary">assembler</span>
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Pick a workflow below — batch images for Zenn, or Veo3 clips for CRAVE &amp; CONQUER.
            Validate scene matching, then render a synced MP4 with your narration.
          </p>
          <Button asChild variant="outline" size="sm" className="cursor-pointer">
            <Link href="/mcp" className="flex items-center gap-1.5">
              <Plug className="h-3.5 w-3.5" />
              Connect your AI agent (MCP)
            </Link>
          </Button>
        </div>
      </div>

      <Suspense fallback={<WorkspaceSkeleton />}>
        <AssemblerWorkspace />
      </Suspense>
    </div>
  );
}

function WorkspaceSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-14 animate-pulse rounded-xl border border-white/8 bg-secondary/30" />
      <div className="h-96 animate-pulse rounded-2xl border border-white/8 bg-secondary/20" />
    </div>
  );
}