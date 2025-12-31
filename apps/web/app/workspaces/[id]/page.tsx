// apps/web/app/workspaces/[id]/page.tsx
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type VisibleClaimRow = {
  id: string;
  workspace_id: string;
  visibility: string;
  owner_profile_id: string;
  created_at: string;
  retired_at: string | null;
  text?: string | null; // may or may not exist in view
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
    textDecoration: "none",
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

export default function WorkspaceClaimsPage({ params }: { params: { id: string } }) {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const searchParams = useSearchParams();

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

  const [wsName, setWsName] = useState<string>("Workspace");
  const [email, setEmail] = useState<string>("Signed in");
  const [myProfileId, setMyProfileId] = useState<string | null>(null);
  const [claims, setClaims] = useState<VisibleClaimRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingClaims, setLoadingClaims] = useState<boolean>(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [newText, setNewText] = useState("");
  const [newVisibility, setNewVisibility] = useState<"private" | "public">("private");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Load data (client-side so we can keep modal in this file without splitting components)
  useMemo(() => {
    let cancelled = false;

    async function load() {
      setLoadingClaims(true);
      setLoadError(null);

      const { data: userRes } = await supabase.auth.getUser();
      const u = userRes?.user;
      if (!cancelled) setEmail(u?.email ? `Signed in as ${u.email}` : "Signed in");

      const { data: ws } = await supabase
        .from("workspaces")
        .select("id, name")
        .eq("id", params.id)
        .maybeSingle();

      if (!cancelled) setWsName(ws?.name ?? "Workspace");

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id")
        .eq("workspace_id", params.id)
        .limit(1);

      if (!cancelled) setMyProfileId(profiles?.[0]?.id ?? null);

      // Claims view
      const { data: cData, error: cErr } = await supabase
        .from("claims_visible_to_member")
        .select("id, workspace_id, visibility, owner_profile_id, created_at, retired_at, text")
        .eq("workspace_id", params.id)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (cErr) {
        setLoadError(cErr.message);
        setClaims([]);
      } else {
        setClaims((cData ?? []) as VisibleClaimRow[]);
      }

      setLoadingClaims(false);
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const rawFilter = (searchParams.get("filter") ?? "all").toLowerCase();
  const filter: FilterKey =
    rawFilter === "my" || rawFilter === "public" || rawFilter === "private" || rawFilter === "all"
      ? (rawFilter as FilterKey)
      : "all";

  const counts = useMemo(() => {
    const isMine = (c: VisibleClaimRow) => (myProfileId ? c.owner_profile_id === myProfileId : false);
    const isPublic = (c: VisibleClaimRow) => (c.visibility ?? "").toLowerCase() === "public";
    const isPrivateMine = (c: VisibleClaimRow) => isMine(c) && (c.visibility ?? "").toLowerCase() === "private";

    return {
      all: claims.length,
      my: claims.filter(isMine).length,
      public: claims.filter(isPublic).length,
      private: claims.filter(isPrivateMine).length,
    };
  }, [claims, myProfileId]);

  const filtered = useMemo(() => {
    const isMine = (c: VisibleClaimRow) => (myProfileId ? c.owner_profile_id === myProfileId : false);
    const vis = (c: VisibleClaimRow) => (c.visibility ?? "").toLowerCase();

    return claims.filter((c) => {
      if (filter === "my") return isMine(c);
      if (filter === "public") return vis(c) === "public";
      if (filter === "private") return isMine(c) && vis(c) === "private";
      return true;
    });
  }, [claims, filter, myProfileId]);

  function ownerStateBadgePlaceholder() {
    return (
      <span
        style={{ ...badgeStyle(border, muted2), opacity: 0.75 }}
        title="Claim state (owner-only) will be derived later"
      >
        State: —
      </span>
    );
  }

  async function submitNewClaim() {
    setSubmitting(true);
    setSubmitError(null);

    // IMPORTANT: match the function's named parameters EXACTLY
    const { error } = await supabase.rpc("create_claim_with_text", {
      _workspace_id: params.id,
      _visibility: newVisibility,
      _review_cadence: "monthly",
      _validation_mode: "any",
      _text: newText,
    });

    setSubmitting(false);

    if (error) {
      setSubmitError(error.message);
      return;
    }

    setModalOpen(false);
    setNewText("");
    setNewVisibility("private");

    // Reload list (router.refresh does not reliably re-run client fetches)
    // so we just hard-reload the route to keep it simple and deterministic.
    router.refresh();
    window.location.reload();
  }

  return (
    <main style={{ minHeight: "100vh", background: pageBg, padding: "40px 16px" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        {/* Top bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 18,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src="/brand/stilltrue-logo.svg" alt="StillTrue" height={32} />
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: text }}>{wsName}</div>
              <div style={{ fontSize: 13, color: muted }}>{email}</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link href="/" style={pillStyle}>
              Workspaces
            </Link>

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
              <div style={{ fontSize: 13, fontWeight: 700, color: muted2 }}>Claims</div>
              <div style={{ marginTop: 4, fontSize: 13, color: muted, maxWidth: 680 }}>
                Public workspace claims + your private claims. Claim state is shown only for claims you own (later).
              </div>

              <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link href={`/workspaces/${params.id}?filter=all`} style={chipStyle(filter === "all", border, muted2)}>
                  All ({counts.all})
                </Link>
                <Link href={`/workspaces/${params.id}?filter=my`} style={chipStyle(filter === "my", border, muted2)}>
                  My Claims ({counts.my})
                </Link>
                <Link
                  href={`/workspaces/${params.id}?filter=private`}
                  style={chipStyle(filter === "private", border, muted2)}
                >
                  Private (Mine) ({counts.private})
                </Link>
                <Link
                  href={`/workspaces/${params.id}?filter=public`}
                  style={chipStyle(filter === "public", border, muted2)}
                >
                  Public (Workspace) ({counts.public})
                </Link>
              </div>
            </div>

            <button type="button" onClick={() => setModalOpen(true)} style={primaryStyle}>
              + New claim
            </button>
          </div>

          {loadError ? (
            <div style={{ padding: "18px 22px" }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: text }}>Couldn’t load claims</div>
              <div style={{ marginTop: 6, fontSize: 13, color: muted }}>{loadError}</div>
            </div>
          ) : loadingClaims ? (
            <div style={{ padding: "22px", color: muted, fontSize: 13 }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "22px" }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: text }}>No claims in this view</div>
              <div style={{ marginTop: 6, fontSize: 13, color: muted }}>
                Create a claim to begin testing filters and ownership behaviour.
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
                        <span style={badgeStyle(border, muted2)}>Visibility: {vis || "—"}</span>
                        {isMine ? <span style={badgeStyle(border, muted2)}>Mine</span> : null}
                        {isMine ? ownerStateBadgePlaceholder() : null}
                        {c.retired_at ? <span style={badgeStyle(border, muted2)}>Retired</span> : null}
                      </div>
                    </div>

                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 12, color: muted }}>{new Date(c.created_at).toLocaleDateString()}</div>
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

      {/* New Claim Modal */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: 16,
          }}
        >
          <div
            style={{
              width: "min(520px, 100%)",
              background: "#ffffff",
              borderRadius: 12,
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              padding: 24,
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 800, color: text, marginBottom: 14 }}>New claim</h2>

            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: muted2, marginBottom: 6 }}>
              Claim text
            </label>
            <textarea
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              rows={4}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 6,
                border: "1px solid #d1d5db",
                fontSize: 14,
                marginBottom: 14,
                background: "#ffffff",
                color: text,
                outline: "none",
              }}
            />

            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: muted2, marginBottom: 6 }}>
              Visibility
            </label>
            <select
              value={newVisibility}
              onChange={(e) => setNewVisibility(e.target.value as "private" | "public")}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 6,
                border: "1px solid #d1d5db",
                fontSize: 14,
                marginBottom: 16,
                background: "#ffffff",
                color: text,
                outline: "none",
              }}
            >
              <option value="private">Private (mine)</option>
              <option value="public">Public (workspace)</option>
            </select>

            {submitError && <div style={{ marginBottom: 12, fontSize: 13, color: "#b91c1c" }}>{submitError}</div>}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={() => {
                  setModalOpen(false);
                  setSubmitError(null);
                }}
                disabled={submitting}
                style={{
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: "1px solid #d1d5db",
                  background: "#ffffff",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              <button
                onClick={submitNewClaim}
                disabled={submitting || !newText.trim()}
                style={{
                  padding: "8px 14px",
                  borderRadius: 6,
                  border: "none",
                  background: buttonBlue,
                  color: "#ffffff",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {submitting ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
