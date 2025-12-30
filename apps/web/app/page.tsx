import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
      <h1 style={{ margin: 0, fontSize: 24 }}>StillTrue</h1>

      {user ? (
        <p style={{ marginTop: 8 }}>
          ✅ Logged in as <strong>{user.email}</strong>
        </p>
      ) : (
        <p style={{ marginTop: 8 }}>
          ❌ Not logged in
        </p>
      )}

      <form action="/auth/logout" method="post" style={{ marginTop: 16 }}>
        <button
          type="submit"
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #ccc",
            background: "white",
            cursor: "pointer",
          }}
        >
          Log out
        </button>
      </form>
    </main>
  );
}
