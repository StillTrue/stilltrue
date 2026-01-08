"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type ClaimRow = {
  claim_id: string;
  visibility: "private" | "workspace";
  owner_profile_id: string;
  created_at: string;
  text_preview: string;
};

type FilterKey = "all" | "mine" | "private" | "workspace";

export default function WorkspaceClaimsPage() {
  const supabase = createSupabaseBrowserClient();
  const params = useParams();
  const workspaceId = params?.id as string | undefined;

  const pageBg = "#f3f4f6";
  const cardBg = "#ffffff";
  const border = "#e5e7eb";
  const text = "#111827";
  const muted = "#6b7280";
  const muted2 = "#374151";
  const buttonBlue = "#5b7fa6";

  const pillBase: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 12px",
    borderRadius: 999,
    border: `1px solid ${border}`,
    background: "#ffffff",
    color: text,
    fontWeight: 700,
    fontSize: 13,
    textDecoration: "none",
    cursor: "pointer",
    lineHeight: 1,
    whiteSpace: "nowrap",
  };

  const primaryStyle: React.CSSProperties = {
    ...pillBase,
    border: "none",
    background: buttonBlue,
    color: "#ffffff",
    borderRadius: 8,
  };

  const [email, setEmail] = useState("Signed in");
  const [myProfileIds, setMyProfileIds] = useState<string[]>([]);
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // New claim modal
  const [modalOpen, setModalOpen] = useState(false);
  const [newText, setNewText] = useState("");
  // ✅ DB enum: claim_visibility = 'private' | 'workspace'
  const [newVisibility, setNewVisibility] = useState<"private" | "workspace">("private");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [filter, setFilter] = useState<FilterKey>("all");

  const filteredClaims = useMemo(() => {
    if (filter === "all") return claims;
    if (filter === "private") return claims.filter((c) => c.visibility === "private");
    if (filter === "workspace") return claims.filter((c) => c.visibility === "workspace");
    if (filter === "mine") return claims.filter((c) => myProfileIds.includes(c.owner_profile_id));
    return claims;
  }, [claims, filter, myProfileIds]);

  if (!workspaceId) {
    return (
      <main style={{ minHeight: "100vh", background: pageBg, padding: "40px 16px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", color: text }}>
          <strong>Workspace ID missing from route</strong>
        </div>
      </main>
    );
  }

  async function loadAll() {
    setLoading(true);
    setLoadError(null);

    supabase.auth.getUser().then(({ data }) => {
      const u = data?.user;
      setEmail(u?.email ? `Signed in as ${u.email}` : "Signed in");
    });

    const profileRes = await supabase.rpc("my_profile_ids");
    if (!profileRes.error) {
      setMyProfileIds((profileRes.data as unknown as string[]) || []);
    }

    const { data, error } = await supabase
      .from("claims")
      .select(
        `
        id,
        visibility,
        owner_profile_id,
        created_at,
        retired_at,
        claim_text_versions!inner (
          text,
          created_at
        )
      `
      )
      .eq("workspace_id", workspaceId)
      .is("retired_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      setClaims([]);
      setLoadError(error.message);
      setLoading(false);
      return;
    }

    const rows = (data || []) as any[];
    const mapped: ClaimRow[] = rows.map((c) => {
      const versions = Array.isArray(c.claim_text_versions) ? c.claim_text_versions : [];
      let latest = versions[0];
      for (const v of versions) {
        if (!latest || (v?.created_at && v.created_at > latest.created_at)) latest = v;
      }
      return {
        claim_id: c.id,
        visibility: c.visibility,
        owner_profile_id: c.owner_profile_id,
        created_at: c.created_at,
        text_preview: (latest?.text || "").toString(),
      };
    });

    setClaims(mapped);
    setLoading(false);
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  async function submitNewClaim() {
    setSubmitting(true);
    setSubmitError(null);

    const { error } = await supabase.rpc("create_claim_with_text", {
      _workspace_id: workspaceId,
      _visibility: newVisibility, // ✅ 'private' | 'workspace'
      _review_cadence: "monthly",
      _validation_mode: "any",
      _text: newText.trim(),
    });

    setSubmitting(false);

    if (error) {
      setSubmitError(error.message);
      return;
    }

    setModalOpen(false);
    setNewText("");
    setNewVisibility("private");
    await loadAll();
  }

  const countAll = claims.length;
  const countMine = claims.filter((c) => myProfileIds.includes(c.owner_profile_id)).length;
  const countPriv = claims.filter((c) => c.visibility === "private").length;
  const countWs = claims.filter((c) => c.visibility === "workspace").length;

  function pill(active: boolean): React.CSSProperties {
    return {
      ...pillBase,
      background: active ? "#eef2f7" : "#ffffff",
      borderColor: active ? "#cbd5e1" : border,
      color: text,
    };
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
              <div style={{ fontSize: 20, fontWeight: 800, color: text }}>Workspace</div>
              <div style={{ fontSize: 13, color: muted }}>{email}</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link href="/" style={{ ...pillBase, borderRadius: 8 }}>
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
              <div style={{ marginTop: 4, fontSize: 13, color: muted, maxWidth: 720 }}>
                Workspace-visible claims + your private claims. (Claim state will show only for claims you own later.)
              </div>

              <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button type="button" onClick={() => setFilter("all")} style={pill(filter === "all")}>
                  All ({countAll})
                </button>
                <button type="button" onClick={() => setFilter("mine")} style={pill(filter === "mine")}>
                  My Claims ({countMine})
                </button>
                <button type="button" onClick={() => setFilter("private")} style={pill(filter === "private")}>
                  Private (Mine) ({countPriv})
                </button>
                <button type="button" onClick={() => setFilter("workspace")} style={pill(filter === "workspace")}>
                  Public (Workspace) ({countWs})
                </button>
              </div>
            </div>

            <button type="button" onClick={() => setModalOpen(true)} style={primaryStyle}>
              + New claim
            </button>
          </div>

          <div style={{ padding: "18px 22px" }}>
            {loading ? (
              <div style={{ fontSize: 13, color: muted }}>Loading…</div>
            ) : loadError ? (
              <div style={{ fontSize: 13, color: "#b91c1c" }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Couldn’t load claims</div>
                {loadError}
              </div>
            ) : filteredClaims.length === 0 ? (
              <div style={{ fontSize: 13, color: muted }}>No claims yet for this workspace.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {filteredClaims.map((c) => (
                  <div
                    key={c.claim_id}
                    style={{
                      padding: 14,
                      border: `1px solid ${border}`,
                      borderRadius: 10,
                      background: "#ffffff",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: text, lineHeight: 1.35 }}>
                        {c.text_preview}
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          color: c.visibility === "workspace" ? "#0f766e" : "#334155",
                          background: c.visibility === "workspace" ? "#ecfeff" : "#f1f5f9",
                          border: `1px solid ${border}`,
                          padding: "6px 10px",
                          borderRadius: 999,
                          height: "fit-content",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {c.visibility === "workspace" ? "Public" : "Private"}
                      </div>
                    </div>

                    <div style={{ marginTop: 8, fontSize: 12, color: muted }}>
                      Created {new Date(c.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
              onChange={(e) => setNewVisibility(e.target.value as "private" | "workspace")}
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
              {/* ✅ Keep label “Public (workspace)” but send enum value 'workspace' */}
              <option value="workspace">Public (workspace)</option>
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
