"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setMessage(null);

    const supabase = supabaseBrowser();

    // 🔑 CRITICAL FIX:
    // Codespaces sometimes reports an origin with :3000 appended.
    // Supabase must NEVER receive a redirect URL with :3000 on github.dev.
    const origin = window.location.origin.replace(":3000", "");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback`
      }
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("sent");
    setMessage("Check your email for a sign-in link.");
  };

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-2xl font-semibold">Login</h1>
      <p className="mt-2 text-sm text-neutral-600">
        We use email sign-in links. No passwords.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
            placeholder="you@example.com"
          />
        </label>

        <button
          type="submit"
          disabled={status === "sending"}
          className="w-full rounded-xl border px-3 py-2 text-sm font-medium"
        >
          {status === "sending" ? "Sending…" : "Send sign-in link"}
        </button>

        {message ? (
          <div className="rounded-xl border p-3 text-sm text-neutral-700">
            {message}
          </div>
        ) : null}
      </form>
    </main>
  );
}
