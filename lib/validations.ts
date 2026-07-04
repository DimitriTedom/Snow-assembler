import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().email("Please enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export const signUpSchema = signInSchema.extend({
  displayName: z.string().min(2, "Display name must be at least 2 characters.").max(64).optional(),
});
