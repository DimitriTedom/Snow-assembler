"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { signUpSchema } from "@/lib/validations";
import { signUpAction } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

type Values = z.infer<typeof signUpSchema>;

export function RegisterForm() {
  const router = useRouter();
  const form = useForm<Values>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: "", password: "", displayName: "" },
  });

  const [pending, startTransition] = React.useTransition();

  const onSubmit = (values: Values) => {
    startTransition(async () => {
      const res = await signUpAction(values);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Account created!");
      router.push(res.redirectTo);
      router.refresh();
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="you@example.com" type="email" autoComplete="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display name (optional)</FormLabel>
              <FormControl>
                <Input placeholder="Jane" autoComplete="nickname" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  placeholder="At least 8 characters"
                  type="password"
                  autoComplete="new-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button className="w-full" type="submit" disabled={pending}>
          {pending ? "Creating account..." : "Create account"}
        </Button>

        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-foreground underline underline-offset-4">
            Log in
          </Link>
          .
        </p>
      </form>
    </Form>
  );
}
