import Link from "next/link";
import { Clapperboard, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between rounded-2xl border border-white/10 bg-card/70 px-4 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <Link href="/" className="group flex items-center gap-2.5 font-semibold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary transition-colors group-hover:bg-primary/25">
            <Clapperboard className="h-4 w-4" />
          </span>
          <span>
            Snow <span className="text-muted-foreground">Assembler</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden cursor-pointer sm:inline-flex">
            <Link href="/assembler">Workspace</Link>
          </Button>
          <Button asChild size="sm" className="cursor-pointer snow-glow">
            <Link href="/assembler" className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Open workspace
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}