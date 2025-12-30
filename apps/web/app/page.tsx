// apps/web/app/page.tsx
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type WorkspaceRow = {
  workspace_id: string | null;
  workspaces?: {
    id: string;
    name: string | null;
    status?: string | null;
  } | null;
};

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: memberships, error } = (await supabase
    .from("profiles")
    .select("workspace_id, workspaces(id, name, status)")
    .order("created_at", { ascending: true })) as unknown as {
    data: WorkspaceRow[] | null;
    error: { message: string } | null;
  };

  const unique = new Map<string, { id: string; name: string; status?: string | null }>();
  for (const m of memberships ?? []) {
    const ws = m.workspaces ?? null;
    if (!ws?.id) continue;
    unique.set(ws.id, {
      id: ws.id,
      name: (ws.name ?? "Untitled workspace").trim() || "Untitled workspace",
      status: ws.status ?? null,
    });
  }
  const workspaces = Array.from(unique.values());

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
                Home
              </div>
              <div style={{ fontSize: 13, color: muted }}>
                {user?.email ? `Signed in as ${user.email}` : "Signed in"}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link href="/claims" style={pillStyle}>
              View claims
            </Link>

            <form action="/auth/logout" method="post" style={{ margin: 0 }}>
              <button type="submit" style={primaryStyle}>
                Logout
              </button>
            </form>
          </div>
        </div>

        {/* Workspaces */}
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
              Workspaces
            </div>
            <div style={{ marginTop: 6, fontSize: 13, color: muted }}>
              Choose a context. Claims will be scoped under a workspace later.
            </div>
          </div>

          {error ? (
            <div style={{ padding: "18px 22px" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: text }}>
                Couldn’t load workspaces
              </div>
              <div style={{ marginTop: 6, fontSize: 13, color: muted }}>
                {error.message}
              </div>
            </div>
          ) : workspaces.length === 0 ? (
            <div style={{ padding: "22px" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: text }}>
                No workspaces yet
              </div>
              <div style={{ marginTop: 6, fontSize: 13, color: muted }}>
                This is a valid state. You’ll be able to create or accept an invite later.
              </div>
            </div>
          ) : (
            <div>
              {workspaces.map((ws, idx) => (
                <Link
                  key={ws.id}
                  href={`/workspaces/${ws.id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "16px 22px",
                    borderTop: idx === 0 ? "none" : `1px solid ${border}`,
                    textDecoration: "none",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: text,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {ws.name}
                    </div>
                    <div style={{ marginTop: 2, fontSize: 12, color: muted }}>
                      Workspace{ws.status ? ` • ${ws.status}` : ""}
                    </div>
                  </div>

                  <span
                    style={{
                      padding: "10px 12px",
                      borderRadius: 6,
                      border: `1px solid ${border}`,
                      background: "#f9fafb",
                      color: muted2,
                      fontWeight: 600,
                      fontSize: 13,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Open
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
