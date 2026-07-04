import { Suspense } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex justify-center">
      <AuthCard title="Welcome back" description="Sign in with your email and password.">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </AuthCard>
    </div>
  );
}
