import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function safeNextUrl(nextValue: string | null) {
  if (!nextValue) return "/";
  if (!nextValue.startsWith("/")) return "/";
  if (nextValue.startsWith("//")) return "/";
  return nextValue;
}

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const nextValue = String(form.get("next") ?? "/");
  const nextPath = safeNextUrl(nextValue);

  if (!email || !password) {
    return NextResponse.redirect(new URL("/login?error=missing", request.url), 303);
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.redirect(new URL("/login?error=invalid", request.url), 303);
  }

  return NextResponse.redirect(new URL(nextPath, request.url), 303);
}
