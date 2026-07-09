"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function SettingsForm({
  userName,
  userEmail,
}: {
  userName: string;
  userEmail: string;
}) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }
    if (newPassword === currentPassword) {
      setError("New password must be different from the current one");
      return;
    }

    setLoading(true);
    const { error } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    });
    setLoading(false);

    if (error) {
      setError(error.message ?? "Something went wrong");
      return;
    }

    setSuccess(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  const fieldClass =
    "w-full border border-border bg-surface px-3 py-3 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-primary";

  return (
    <main className="grain relative flex min-h-dvh w-full flex-col bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10 sm:px-6">
        <p className="mono-label text-primary">Curator settings</p>
        <h1 className="mt-2 text-balance text-5xl font-black uppercase leading-[0.9] tracking-normal">
          Amend the record
        </h1>

        <div className="mt-6 border border-border">
          <div className="flex items-baseline justify-between gap-3 border-b border-border px-3 py-2.5">
            <span className="mono-label text-muted">Curator</span>
            <span className="font-mono text-sm font-bold">{userName}</span>
          </div>
          <div className="flex items-baseline justify-between gap-3 px-3 py-2.5">
            <span className="mono-label text-muted">Email</span>
            <span className="truncate font-mono text-sm">{userEmail}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <p className="mono-label border-b border-border pb-2 text-muted">
            Change password
          </p>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="current-password" className="mono-label text-muted">
              Current password
            </label>
            <input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
              className={fieldClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="new-password" className="mono-label text-muted">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className={fieldClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirm-password" className="mono-label text-muted">
              Confirm new password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className={fieldClass}
            />
          </div>

          {error && (
            <p
              className="border border-[#5C2A2A] bg-[#1A0D0D] px-3 py-2 font-mono text-xs text-[#E88]"
              role="alert"
            >
              {error}
            </p>
          )}
          {success && (
            <p
              className="border border-primary/40 bg-primary/10 px-3 py-2 font-mono text-xs text-primary"
              role="status"
            >
              Password updated. Other sessions have been signed out.
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 bg-primary px-4 py-4 text-sm font-black uppercase tracking-widest text-primary-ink transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Filing..." : "Update password →"}
          </button>
        </form>

        <div className="mt-8 flex items-baseline justify-between border-t border-border pt-4">
          <Link href="/" className="mono-label text-foreground underline-offset-4 hover:underline">
            ← Back to district
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="mono-label text-muted transition-colors hover:text-foreground"
          >
            Sign out
          </button>
        </div>
      </div>
    </main>
  );
}
