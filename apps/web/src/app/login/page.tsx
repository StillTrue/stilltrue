"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextPath = useMemo(() => searchParams.get("next") ?? "/", [searchParams]);

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  // If Supabase lands on /login?code=..., forward to /auth/callback so the server can exchange it for cookies.
  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) return;

    const next = searchParams.get("next") ?? "/";
    router.replace(
      `/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent(next)}`
    );
  }, [router, searchParams]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setMessage(null);

    const supabase = supabaseBrowser();
    const origin = window.location.origin;

    // ✅ Preserve where the user was trying to go
    const emailRedirectTo = `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo }
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("sent");
    setMessage("Check your email for a sign-in link. You can close this tab.");
  };

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-2xl font-semibold">Login</h1>
      <p className="mt-2 text-sm text-neutral-600">We use email sign-in links. No passwords.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === "sending" || status === "sent"}
            className="mt-2 w-full rounded-xl border px-3 py-2 text-sm disabled:opacity-60"
            placeholder="you@example.com"
          />
        </label>

        <button
          type="submit"
          disabled={status === "sending" || status === "sent"}
          className="w-full rounded-xl border px-3 py-2 text-sm font-medium disabled:opacity-60"
        >
          {status === "sending"
            ? "Sending…"
            : status === "sent"
              ? "Link sent ✓"
              : "Send sign-in link"}
        </button>

        {message ? (
          <div className="rounded-xl border p-3 text-sm text-neutral-700">{message}</div>
        ) : null}
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div />}>
      <LoginInner />
    </Suspense>
  );
}
