"use server";

import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signInSchema, signUpSchema } from "@/lib/validations";

export async function signInAction(input: z.infer<typeof signInSchema> & { next?: string }) {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Invalid input." };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { ok: false as const, error: "Missing Supabase environment variables." };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { ok: false as const, error: error.message };
  }

  return { ok: true as const, redirectTo: input.next ?? "/dashboard" };
}

export async function signUpAction(input: z.infer<typeof signUpSchema>) {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Invalid input." };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { ok: false as const, error: "Missing Supabase environment variables." };
  }

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { ok: false as const, error: error.message };
  }

  const user = data.user;
  if (user) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: { email: parsed.data.email },
      create: {
        id: user.id,
        email: parsed.data.email,
        profile: {
          create: {
            displayName: parsed.data.displayName?.trim() || null,
          },
        },
      },
    });
  }

  return { ok: true as const, redirectTo: "/dashboard" };
}
