import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { CookieOptions } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

const SUPABASE_URL = () => mustEnv("NEXT_PUBLIC_SUPABASE_URL");
const SUPABASE_ANON_KEY = () => mustEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

/**
 * For Server Components / Server Actions (uses next/headers cookies()).
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL(), SUPABASE_ANON_KEY(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet) {
        for (const { name, value, options } of toSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });
}

/**
 * For Route Handlers (e.g. app/auth/login/route.ts)
 * We must attach the auth cookies to the *returned* NextResponse.
 */
export function createSupabaseRouteClient(request: NextRequest) {
  const cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }> = [];

  const supabase = createServerClient(SUPABASE_URL(), SUPABASE_ANON_KEY(), {
    cookies: {
      getAll() {
        // Read cookies from the incoming request
        return request.cookies.getAll();
      },
      setAll(toSet) {
        // Collect cookies and apply them to whatever response we return
        cookiesToSet.push(...toSet);
      },
    },
  });

    function applyCookiesToResponse(response: NextResponse) {
    for (const { name, value, options } of cookiesToSet) {
      response.cookies.set(name, value, options);
    }
    return response;
  }


  return { supabase, applyCookiesToResponse };
}
