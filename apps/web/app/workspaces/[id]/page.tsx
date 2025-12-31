// apps/web/app/workspaces/[id]/page.tsx
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type VisibleClaimRow = {
  id: string;
  workspace_id: string;
  visibility: string;
  owner_profile_id: string;
  created_at: string;
  retired_at: string | null;
  text: string | null; // depending on view shape
};

type FilterKey = "all" | "my" | "public" | "private";

function chipStyle(active: boolean, border: string, muted2: string): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "9px 12px",
    borderRadius: 999,
    border: `1px solid ${border}`,
    background: active ? "#eef2f7" : "#ffffff",
    color: muted2,
    fontWeight: 800,
    fontSize: 12,
    cursor: "pointer",
    lineHeight: 1,
    whiteSpace: "nowrap",
    userSelect: "none",
  };
}

function badgeStyle(border: string, muted2: string): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 10px",
    borderRadius: 999,
    border: `1px solid ${border}`,
    background: "#f9fafb",
    color: muted2,
    fontSize: 12,
    fontWeight: 800,
    lineHeight: 1,
    whiteSpace: "nowrap",
  };
}

export default async function WorkspaceClaimsPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { filter?: string };
}) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Workspace (member-safe via RLS)
  const { data: ws } = await supabase
    .from("workspaces")
    .select("id, name, status")
    .eq("id", params.id)
    .maybeSingle();

  // Determine "my" profile id for this workspace (used for owner-only UI)
  const { data: myProfiles } = await supabase
    .from("profiles")
    .select("id, workspace_id")
    .eq("workspace_id", params.id);

  const myProfileId = myProfiles?.[0]?.id ?? null;

  // Claims list (member-safe view)
  // NOTE: If `text` does not exist in the view, you’ll see the fallback line.
  const { data: claims, error: claimsError } = (await supabase
    .from("claims_visible_to_member")
    .select("id, workspace_id, visibility, owner_profile_id, created_at, retired_at, text")
    .eq("workspace_id", params.id)
    .order("created_at", { ascending: false })) as unknown as {
    data: VisibleClaimRow[] | null;
    error: { message: string } | null;
  };

  // Filter selection from querystring (server component safe)
  const raw = (searchParams?.filter ?? "all").toLowerCase();
  const filter: FilterKey =
    raw === "my" || raw === "public" || raw === "private" || raw === "all" ? (raw as FilterKey) : "all";

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

  const filtered = (claims ?? []).filter((c) => {
    const isMine = myProfileId ? c.owner_profile_id === myProfileId : false;
    const vis = (c.visibility ?? "").toLowerCase();

    if (filter === "my") return isMine;
    if (filter === "public") return vis === "public";
    if (filter === "private") return isMine && vis === "private";
    return true; // all
  });

  const counts = {
    all: (claims ?? []).length,
    my: (claims ?? []).filter((c) => (myProfileId ? c.owner_profile_id === myProfileId : false)).length,
    public: (claims ?? []).filter((c) => (c.visibility ?? "").toLowerCase() === "public").length,
    private: (claims ?? []).filter((c) => {
      const isMine = myProfileId ? c.owner_profile_id === myProfileId : false;
      return isMine && (c.visibility ?? "").toLowerCase() === "private";
    }).length,
  };

  // Owner-only state badge placeholder (no derived logic yet)
  function ownerStateBadgePlaceholder() {
    return (
      <span style={{ ...badgeStyle(border, muted2), opacity: 0.75 }} title="Claim state (owner-only) will be derived later">
        State: —
      </span>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: pageBg,
        padding: "40px 16px",
      }}
    >
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
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
              <div style={{ fontSize: 20, fontWeight: 800, color: text }}>
                {ws?.name ?? "Workspace"}
              </div>
              <div style={{ fontSize: 13, color: muted }}>
                {user?.email ? `Signed in as ${user.email}` : "Signed in"}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link href="/" style={pillStyle}>
              Workspaces
            </Link>

            {/* Settings page will come later (owner/admin only). Placeholder for now. */}
            <button
              type="button"
              disabled
              style={{
                ...pillStyle,
                opacity: 0.6,
                cursor: "not-allowed",
                background: "#f9fafb",
              }}
              title="Workspace settings (coming soon)"
            >
              Settings
            </button>

            <form action="/auth/logout" method="post" style={{ margin: 0 }}>
              <button type="submit" style={primaryStyle}>
                Logout
              </button>
            </form>
          </div>
        </div>

        {/* Claims card */}
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
              padding: "16px 22px",
              borderBottom: `1px solid ${border}`,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: muted2 }}>
                Claims
              </div>
              <div style={{ marginTop: 4, fontSize: 13, color: muted, maxWidth: 680 }}>
                Public workspace claims + your private claims. Claim state is shown only for claims you own (later).
              </div>

              {/* Filters */}
              <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link href={`/workspaces/${params.id}?filter=all`} style={chipStyle(filter === "all", border, muted2)}>
                  All ({counts.all})
                </Link>
                <Link href={`/workspaces/${params.id}?filter=my`} style={chipStyle(filter === "my", border, muted2)}>
                  My Claims ({counts.my})
                </Link>
                <Link href={`/workspaces/${params.id}?filter=private`} style={chipStyle(filter === "private", border, muted2)}>
                  Private (Mine) ({counts.private})
                </Link>
                <Link href={`/workspaces/${params.id}?filter=public`} style={chipStyle(filter === "public", border, muted2)}>
                  Public (Workspace) ({counts.public})
                </Link>
              </div>
            </div>

            <button
              type="button"
              disabled
              style={{
                ...primaryStyle,
                opacity: 0.65,
                cursor: "not-allowed",
                alignSelf: "flex-start",
              }}
              title="New claim (modal flow coming soon)"
            >
              + New claim
            </button>
          </div>

          {claimsError ? (
            <div style={{ padding: "18px 22px" }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: text }}>
                Couldn’t load claims
              </div>
              <div style={{ marginTop: 6, fontSize: 13, color: muted }}>
                {claimsError.message}
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "22px" }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: text }}>
                No claims in this view
              </div>
              <div style={{ marginTop: 6, fontSize: 13, color: muted }}>
                Try a different filter. Claim creation will be added later via a modal.
              </div>
            </div>
          ) : (
            <div>
              {filtered.map((c, idx) => {
                const isMine = myProfileId ? c.owner_profile_id === myProfileId : false;
                const vis = (c.visibility ?? "").toLowerCase();

                return (
                  <div
                    key={c.id}
                    style={{
                      padding: "16px 22px",
                      borderTop: idx === 0 ? "none" : `1px solid ${border}`,
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 14,
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          color: text,
                          lineHeight: 1.25,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                        title={c.text ?? undefined}
                      >
                        {c.text ?? "(Claim text hidden by view shape — will be wired next)"}
                      </div>

                      <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span style={badgeStyle(border, muted2)}>
                          Visibility: {vis || "—"}
                        </span>

                        {isMine ? <span style={badgeStyle(border, muted2)}>Mine</span> : null}

                        {/* Owner-only state placeholder */}
                        {isMine ? ownerStateBadgePlaceholder() : null}

                        {c.retired_at ? <span style={badgeStyle(border, muted2)}>Retired</span> : null}
                      </div>
                    </div>

                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 12, color: muted }}>
                        {new Date(c.created_at).toLocaleDateString()}
                      </div>

                      {/* Placeholder for modal actions later */}
                      <div style={{ marginTop: 10 }}>
                        <button
                          type="button"
                          disabled
                          style={{
                            ...pillStyle,
                            opacity: 0.6,
                            cursor: "not-allowed",
                            padding: "8px 10px",
                            fontSize: 12,
                          }}
                          title="Open claim (modal coming soon)"
                        >
                          Open
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
