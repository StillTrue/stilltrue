"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [msg, setMsg] = useState("Signing you in…");

  useEffect(() => {
    const run = async () => {
      const supabase = supabaseBrowser();

      // Handle both styles:
      // 1) PKCE: /auth/callback?code=...
      // 2) Implicit: /auth/callback#access_token=...&refresh_token=...
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (window.location.hash?.includes("access_token=")) {
          const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
          const access_token = hash.get("access_token");
          const refresh_token = hash.get("refresh_token");

          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({ access_token, refresh_token });
            if (error) throw error;
          }
        }

        setMsg("Signed in. Redirecting…");
        router.replace("/");
      } catch (e: any) {
        setMsg(e?.message ?? "Sign-in failed.");
      }
    };

    run();
  }, [router]);

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-2xl font-semibold">StillTrue</h1>
      <p className="mt-3 text-sm text-neutral-700">{msg}</p>
    </main>
  );
}
