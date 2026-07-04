import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AccountPage() {
  const supabase = await createSupabaseServerClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;

  if (!user) {
    redirect("/auth/login?next=/account");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { profile: true },
  });

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
      <p className="text-muted-foreground">Email: {user.email}</p>
      <p className="text-muted-foreground">Display name: {dbUser?.profile?.displayName ?? "—"}</p>
    </div>
  );
}
