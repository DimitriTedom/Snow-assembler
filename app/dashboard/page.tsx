import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;

  if (!user) {
    redirect("/auth/login?next=/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">You are signed in as {user.email}.</p>
      </div>

      <div className="flex gap-2">
        <Button asChild variant="outline">
          <Link href="/account">Go to account</Link>
        </Button>
      </div>
    </div>
  );
}
