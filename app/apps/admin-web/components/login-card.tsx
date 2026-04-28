"use client";

import { useState } from "react";

import { Button, Input } from "@/components/admin-ui";
import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/lib/trpc";

export function LoginCard() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit() {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await authClient.signIn.email({ email, password, rememberMe: true });
      if (result.error) {
        setError(result.error.message ?? "Unable to sign in.");
        return;
      }
      await queryClient.invalidateQueries();
    } catch {
      setError("Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-card-body">
          <div>
            <p className="eyebrow">Joumla Admin</p>
            <h1>Back-office sign in</h1>
            <p className="muted">Use your admin email and password to manage Joumla Store operations.</p>
          </div>
          <Input label="Email" type="email" value={email} onValueChange={setEmail} autoComplete="email" />
          <Input label="Password" type="password" value={password} onValueChange={setPassword} autoComplete="current-password" onKeyDown={(event) => event.key === "Enter" && submit()} />
          {error ? <p className="form-error">{error}</p> : null}
          <Button color="primary" onPress={submit} isLoading={isSubmitting} isDisabled={!email || password.length < 6}>
            Sign in
          </Button>
        </div>
      </section>
    </main>
  );
}
