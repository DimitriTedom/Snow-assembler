import Link from "next/link";

import InteractiveGridPattern from "@/components/ui/interactive-grid-pattern";
import TypingAnimation from "@/components/ui/typing-animation";
import NumberTicker from "@/components/ui/number-ticker";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="relative overflow-hidden rounded-2xl border bg-card p-8">
      <InteractiveGridPattern interactive className="opacity-100" />
      <div className="relative">
        <p className="text-sm text-muted-foreground">
          Next.js 15 • Supabase Auth • Prisma • shadcn/ui
        </p>
        <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight">
          Build faster with a clean full-stack starter.
        </h1>
        <div className="mt-2 text-muted-foreground">
          <TypingAnimation
            text="Email/password auth, protected routes, and a minimal User/Profile schema."
            loop={false}
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/auth/register">Create account</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/auth/login">Log in</Link>
          </Button>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-background p-4">
            <div className="text-sm text-muted-foreground">Setup time</div>
            <div className="mt-2 text-2xl font-semibold">
              <NumberTicker value={5} /> min
            </div>
          </div>
          <div className="rounded-xl border bg-background p-4">
            <div className="text-sm text-muted-foreground">Starter tables</div>
            <div className="mt-2 text-2xl font-semibold">User + Profile</div>
          </div>
          <div className="rounded-xl border bg-background p-4">
            <div className="text-sm text-muted-foreground">Deploy</div>
            <div className="mt-2 text-2xl font-semibold">Vercel / Docker</div>
          </div>
        </div>
      </div>
    </div>
  );
}
