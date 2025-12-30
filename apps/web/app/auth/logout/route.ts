import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { supabase, applyCookiesToResponse } = createSupabaseRouteClient(request);

  await supabase.auth.signOut();

  const response = NextResponse.redirect(new URL("/login", request.url), 303);
  return applyCookiesToResponse(response);
}
