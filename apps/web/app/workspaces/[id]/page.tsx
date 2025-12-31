// apps/web/app/workspaces/[id]/page.tsx
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function WorkspacePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pageBg = "#f3f4f6";
  const cardBg = "#ffffff";
  const border = "#e5e7eb";
  const text = "#111827";
  const muted = "#6b7280";
  const muted2 = "#374151";
  const buttonBlue = "#5b7fa6";

  const pillStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 12px",
    borderRadius: 6,
    border: `1px solid ${border}`,
    background: "#ffffff",
    color: text,
    fontWeight: 600,
    fontSize: 13,
    textDecoration: "none",
    cursor: "pointer",
    lineHeight: 1,
    whiteSpace: "nowrap",
  };

  const primaryStyle: React.CSSProperties = {
    ...pillStyle,
    border: "none",
    background: buttonBlue,
    color: "#ffffff",
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: pageBg,
        padding: "40px 16px",
      }}
    >
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        {/* Top bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src="/brand/stilltrue-logo.svg" alt="StillTrue" height={32} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: text }}>
                Workspace
              </div>
              <div style={{ fontSize: 13, color: muted }}>
                {user?.email ? `Signed in as ${user.email}` : "Signed in"}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link href="/" style={pillStyle}>
              Home
            </Link>

            <Link href={`/workspaces/${params.id}/claims`} style={pillStyle}>
              Claims
            </Link>

            <Link href="/claims" style={pillStyle}>
              Global claims
            </Link>

            <form action="/auth/logout" method="post" style={{ margin: 0 }}>
              <button type="submit" style={primaryStyle}>
                Logout
              </button>
            </form>
          </div>
        </div>

        {/* Workspace card */}
        <div
          style={{
            background: cardBg,
            borderRadius: 12,
            boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
            overflow: "hidden",
            border: `1px solid ${border}`,
          }}
        >
          <div
            style={{
              padding: "18px 22px",
              borderBottom: `1px solid ${border}`,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: muted2 }}>
              Workspace shell
            </div>
            <div style={{ marginTop: 6, fontSize: 13, color: muted }}>
              ID: {params.id}
            </div>
          </div>

          <div style={{ padding: "22px" }}>
            <div style={{ fontSize: 13, color: muted, lineHeight: 1.6 }}>
              This page exists to establish navigation and structure.
              <br />
              Claims, members, and settings will be added later.
            </div>

            <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link href={`/workspaces/${params.id}/claims`} style={pillStyle}>
                Go to workspace claims
              </Link>
              <Link href="/claims" style={pillStyle}>
                View global member-safe claims
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
