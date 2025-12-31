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

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "WS";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default async function WorkspaceSelectorPage() {
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

  // Palette (kept aligned with login page)
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

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
    padding: 22,
  };

  const tileStyle: React.CSSProperties = {
    height: 148,
    borderRadius: 12,
    border: `1px solid ${border}`,
    background: "#ffffff",
    boxShadow: "0 8px 18px rgba(0,0,0,0.06)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    color: text,
    position: "relative",
    overflow: "hidden",
  };

  const badgeStyle: React.CSSProperties = {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: "#eef2f7",
    border: `1px solid ${border}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    color: muted2,
    marginBottom: 12,
    letterSpacing: 0.5,
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: pageBg,
        padding: "40px 16px",
      }}
    >
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        {/* Header */}
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
              <div style={{ fontSize: 22, fontWeight: 800, color: text }}>
                Select a workspace
              </div>
              <div style={{ fontSize: 13, color: muted }}>
                {user?.email ? `Signed in as ${user.email}` : "Signed in"}
              </div>
            </div>
          </div>

          <form action="/auth/logout" method="post" style={{ margin: 0 }}>
            <button type="submit" style={primaryStyle}>
              Logout
            </button>
          </form>
        </div>

        {/* Main card */}
        <div
          style={{
            background: cardBg,
            borderRadius: 12,
            boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
            overflow: "hidden",
            border: `1px solid ${border}`,
          }}
        >
          {/* Subheader */}
          <div
            style={{
              padding: "16px 22px",
              borderBottom: `1px solid ${border}`,
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: muted2 }}>
                Workspaces
              </div>
              <div style={{ marginTop: 4, fontSize: 13, color: muted }}>
                Choose where you want to work.
              </div>
            </div>

            {/* Placeholder: search later */}
            <div style={{ fontSize: 12, color: muted }}>
              {workspaces.length > 0 ? `${workspaces.length} available` : ""}
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
          ) : (
            <div style={gridStyle}>
              {workspaces.map((ws) => (
                <Link key={ws.id} href={`/workspaces/${ws.id}`} style={tileStyle}>
                  <div style={badgeStyle}>{initials(ws.name)}</div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: text,
                      textAlign: "center",
                      padding: "0 14px",
                      lineHeight: 1.2,
                      maxWidth: "100%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={ws.name}
                  >
                    {ws.name}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, color: muted }}>
                    Select
                  </div>
                </Link>
              ))}

              {/* Create workspace placeholder tile */}
              <div
                style={{
                  ...tileStyle,
                  background: "#f9fafb",
                  cursor: "not-allowed",
                  opacity: 0.8,
                }}
                aria-disabled="true"
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    border: `1px solid ${border}`,
                    background: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 34,
                    fontWeight: 300,
                    color: "#93a3b8",
                    marginBottom: 12,
                    lineHeight: 1,
                  }}
                >
                  +
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: muted2 }}>
                  Create workspace
                </div>
                <div style={{ marginTop: 6, fontSize: 12, color: muted }}>
                  Coming soon
                </div>
              </div>

              {workspaces.length === 0 && (
                <div
                  style={{
                    gridColumn: "1 / -1",
                    padding: "8px 2px 0",
                    fontSize: 13,
                    color: muted,
                  }}
                >
                  No workspaces yet. You’ll be able to create or join a workspace later.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
