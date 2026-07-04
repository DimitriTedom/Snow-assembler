import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <div className="flex justify-center">
      <AuthCard
        title="Create your account"
        description="Email/password sign-up backed by Supabase Auth."
      >
        <RegisterForm />
      </AuthCard>
    </div>
  );
}
