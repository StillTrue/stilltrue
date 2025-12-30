import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

function safeNextPath(url: URL) {
  const p = url.pathname + url.search;
  // prevent weirdness like // or absolute
  if (!p.startsWith("/")) return "/";
  if (p.startsWith("//")) return "/";
  return p;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow auth endpoints + login page + Next static assets
  if (
    pathname.startsWith("/auth/") ||
    pathname === "/login" ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }> = [];

  const supabase = createServerClient(
    mustEnv("NEXT_PUBLIC_SUPABASE_URL"),
    mustEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(toSet) {
          cookiesToSet.push(...toSet);
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Build the response we will return (and attach any refreshed cookies)
  const res = user
    ? NextResponse.next()
    : NextResponse.redirect(
        new URL(`/login?next=${encodeURIComponent(safeNextPath(request.nextUrl))}`, request.url),
        307
      );

  for (const { name, value, options } of cookiesToSet) {
    res.cookies.set(name, value, options);
  }

  return res;
}

// Apply to everything except Next internals
export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
