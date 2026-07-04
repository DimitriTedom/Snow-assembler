import Link from "next/link";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export async function SiteHeader() {
  const supabase = await createSupabaseServerClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;

  return (
    <header className="border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="font-semibold tracking-tight">
          Next.js Template
        </Link>
        <nav className="flex items-center gap-2">
          {user ? (
            <>
              <Button asChild variant="ghost">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/account">Account</Link>
              </Button>
              <form action="/logout" method="post">
                <Button type="submit" variant="outline">
                  Log out
                </Button>
              </form>
            </>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link href="/auth/login">Log in</Link>
              </Button>
              <Button asChild>
                <Link href="/auth/register">Create account</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
