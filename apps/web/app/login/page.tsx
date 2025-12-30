// apps/web/app/login/page.tsx
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: { next?: string };
}) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookies) =>
          cookies.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          ),
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect(searchParams?.next || "/");
  }

  // Shared input styles to keep fields white and consistent.
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "11px 12px",
    borderRadius: 6,
    border: "1px solid #d1d5db",
    fontSize: 14,
    backgroundColor: "#ffffff",
    color: "#111827",
    outline: "none",
    // Avoid odd OS/browser appearance changes
    appearance: "none",
    WebkitAppearance: "none",
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f3f4f6",
      }}
    >
      {/* Inline CSS to neutralize browser autofill tinting */}
      <style>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        textarea:-webkit-autofill,
        select:-webkit-autofill {
          -webkit-text-fill-color: #111827 !important;
          -webkit-box-shadow: 0 0 0px 1000px #ffffff inset !important;
          box-shadow: 0 0 0px 1000px #ffffff inset !important;
          transition: background-color 9999s ease-out 0s !important;
        }
      `}</style>

      <div
        style={{
          width: 420,
          background: "#ffffff",
          borderRadius: 12,
          boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "28px 32px 20px",
            borderBottom: "1px solid #e5e7eb",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              color: "#374151",
              marginBottom: 6,
            }}
          >
            StillTrue
          </div>
          <div style={{ fontSize: 15, color: "#6b7280" }}>
            Sign in to StillTrue
          </div>
        </div>

        <form
          action="/auth/login"
          method="post"
          style={{ padding: "28px 32px 32px" }}
        >
          <div style={{ marginBottom: 18 }}>
            <label
              htmlFor="email"
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "#374151",
                marginBottom: 6,
              }}
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="yourname@example.com"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label
              htmlFor="password"
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "#374151",
                marginBottom: 6,
              }}
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              // Explicitly ensure password masking behaves normally
              inputMode="text"
              style={inputStyle}
            />
          </div>

          <input
            type="hidden"
            name="next"
            value={searchParams?.next || "/"}
          />

          <button
            type="submit"
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 6,
              border: "none",
              background: "#5b7fa6",
              color: "#ffffff",
              fontWeight: 600,
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            Sign in
          </button>
        </form>

        <div
          style={{
            padding: "14px 32px",
            borderTop: "1px solid #e5e7eb",
            textAlign: "center",
            fontSize: 13,
            color: "#6b7280",
          }}
        >
          Don’t have an account? Contact your administrator
        </div>
      </div>
    </main>
  );
}
