export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main style={{ maxWidth: 420, margin: "48px auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Log in</h1>
      <p style={{ marginTop: 0, marginBottom: 24, opacity: 0.8 }}>
        Email + password only.
      </p>

      {/* We will wire this to a server-side route handler next step */}
      <form method="post" action="/auth/login" style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            style={{ padding: 10, fontSize: 16 }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Password</span>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            style={{ padding: 10, fontSize: 16 }}
          />
        </label>

        <input type="hidden" name="next" value="/" />

        <button type="submit" style={{ padding: 10, fontSize: 16 }}>
          Log in
        </button>
      </form>
    </main>
  );
}
