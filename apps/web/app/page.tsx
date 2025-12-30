// apps/web/app/page.tsx
export default function HomePage() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
      <h1 style={{ margin: 0, fontSize: 24 }}>StillTrue</h1>
      <p style={{ marginTop: 8 }}>You are seeing the home page.</p>

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
