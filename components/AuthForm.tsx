"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isSignUp = mode === "sign-up";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = isSignUp
      ? await authClient.signUp.email({ email, password, name })
      : await authClient.signIn.email({ email, password });

    setLoading(false);

    if (error) {
      setError(error.message ?? "Something went wrong");
      return;
    }

    router.push("/");
    router.refresh();
  }

  const fieldClass =
    "w-full border border-border bg-surface px-3 py-3 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-primary";

  return (
    <main className="grain relative flex min-h-dvh w-full flex-col bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10 sm:px-6">
        <p className="mono-label text-primary">
          {isSignUp ? "New curator record" : "Returning curator"}
        </p>
        <h1 className="mt-2 text-balance text-5xl font-black uppercase leading-[0.9] tracking-tight">
          {isSignUp ? "Register the archive" : "Open the archive"}
        </h1>
        <p className="mono-label mt-3 text-muted">
          {isSignUp
            ? "Save your district, museums + discovery progress"
            : "Your saved district is waiting"}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          {isSignUp && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="mono-label text-muted">
                Curator name
              </label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                className={fieldClass}
              />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="mono-label text-muted">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className={fieldClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="mono-label text-muted">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              className={fieldClass}
            />
          </div>

          {error && (
            <p className="border border-[#5C2A2A] bg-[#1A0D0D] px-3 py-2 font-mono text-xs text-[#E88] " role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 bg-primary px-4 py-4 text-sm font-black uppercase tracking-widest text-primary-ink transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Filing..." : isSignUp ? "Create record →" : "Sign in →"}
          </button>
        </form>

        <div className="mt-8 border-t border-border pt-4">
          <p className="mono-label text-muted">
            {isSignUp ? "Already registered? " : "No record on file? "}
            <Link
              href={isSignUp ? "/sign-in" : "/sign-up"}
              className="text-primary underline-offset-4 hover:underline"
            >
              {isSignUp ? "Sign in" : "Sign up"}
            </Link>
            {" · "}
            <Link href="/" className="text-foreground underline-offset-4 hover:underline">
              Back to district
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
