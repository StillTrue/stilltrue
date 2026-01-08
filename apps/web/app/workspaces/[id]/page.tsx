"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import ViewClaimModal from "./ViewClaimModal";

type ClaimVisibility = "private" | "workspace";
type ClaimState = "Affirmed" | "Unconfirmed" | "Challenged" | "Retired";

type ClaimRow = {
  claim_id: string;
  visibility: ClaimVisibility;
  owner_profile_id: string;
  created_at: string;
  retired_at: string | null;
  current_text: string | null;
};

type FilterKey = "all" | "mine" | "private" | "workspace";

type ClaimTextVersionRow = {
  id: string;
  claim_id: string;
  text: string;
  created_at: string;
  created_by_profile_id?: string | null;
};

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

  const badgeBase: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 800,
    border: `1px solid ${border}`,
    padding: "6px 10px",
    borderRadius: 999,
    height: "fit-content",
    whiteSpace: "nowrap",
  };

  const [email, setEmail] = useState("Signed in");
  const [myProfileIds, setMyProfileIds] = useState<string[]>([]);
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [claimStateById, setClaimStateById] = useState<Record<string, ClaimState>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // New claim modal
  const [newClaimModalOpen, setNewClaimModalOpen] = useState(false);
  const [newText, setNewText] = useState("");
  const [newVisibility, setNewVisibility] = useState<ClaimVisibility>("private");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // View claim modal
  const [viewClaimModalOpen, setViewClaimModalOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<ClaimRow | null>(null);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionsError, setVersionsError] = useState<string | null>(null);
  const [versions, setVersions] = useState<ClaimTextVersionRow[]>([]);

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

    // Signed-in label
    supabase.auth.getUser().then(({ data }) => {
      const u = data?.user;
      setEmail(u?.email ? `Signed in as ${u.email}` : "Signed in");
    });

    // My profile ids
    const profileRes = await supabase.rpc("my_profile_ids");
    if (!profileRes.error) {
      setMyProfileIds((profileRes.data as unknown as string[]) || []);
    }

    /**
     * IMPORTANT:
     * Use the member-safe view (claims_visible_to_member),
     * NOT the raw claims table.
     */
    const { data, error } = await supabase
      .from("claims_visible_to_member")
      .select(
        "claim_id, workspace_id, visibility, owner_profile_id, review_cadence, validation_mode, created_at, retired_at, current_text"
      )
      .eq("workspace_id", workspaceId)
      .is("retired_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      setClaims([]);
      setClaimStateById({});
      setLoadError(error.message);
      setLoading(false);
      return;
    }

    const rows = (data || []) as any[];
    const mapped: ClaimRow[] = rows.map((c) => ({
      claim_id: String(c.claim_id),
      visibility: c.visibility as ClaimVisibility,
      owner_profile_id: String(c.owner_profile_id),
      created_at: String(c.created_at),
      retired_at: c.retired_at ? String(c.retired_at) : null,
      current_text: c.current_text ?? null,
    }));

    setClaims(mapped);

    // Owner-only derived claim state (RPC returns only my owned claims)
    const statesRes = await supabase.rpc("get_my_claim_states_for_workspace", {
      _workspace_id: workspaceId,
    });

    if (!statesRes.error && Array.isArray(statesRes.data)) {
      const next: Record<string, ClaimState> = {};
      for (const row of statesRes.data as any[]) {
        if (row?.claim_id && row?.state) next[String(row.claim_id)] = row.state as ClaimState;
      }
      setClaimStateById(next);
    } else {
      // Never block rendering if this fails
      setClaimStateById({});
    }

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
      _visibility: newVisibility,
      _review_cadence: "monthly",
      _validation_mode: "any",
      _text: newText.trim(),
    });

    setSubmitting(false);

    if (error) {
      setSubmitError(error.message);
      return;
    }

    setNewClaimModalOpen(false);
    setNewText("");
    setNewVisibility("private");
    await loadAll();
  }

  function pill(active: boolean): React.CSSProperties {
    return {
      ...pillBase,
      background: active ? "#eef2f7" : "#ffffff",
      borderColor: active ? "#cbd5e1" : border,
      color: text,
    };
  }

  function visibilityBadgeStyle(vis: ClaimVisibility): React.CSSProperties {
    if (vis === "workspace") return { ...badgeBase, color: "#0f766e", background: "#ecfeff" };
    return { ...badgeBase, color: "#334155", background: "#f1f5f9" };
  }

  function stateBadgeStyle(state: ClaimState): React.CSSProperties {
    if (state === "Affirmed") return { ...badgeBase, color: "#166534", background: "#ecfdf5" };
    if (state === "Unconfirmed") return { ...badgeBase, color: "#0f172a", background: "#f1f5f9" };
    if (state === "Challenged") return { ...badgeBase, color: "#991b1b", background: "#fef2f2" };
    return { ...badgeBase, color: "#334155", background: "#f8fafc" }; // Retired
  }

  async function openViewClaimModal(claim: ClaimRow) {
    setSelectedClaim(claim);
    setViewClaimModalOpen(true);

    setVersions([]);
    setVersionsError(null);
    setVersionsLoading(true);

    try {
      const { data, error } = await supabase
        .from("claim_text_versions")
        .select("id, claim_id, text, created_at, created_by_profile_id")
        .eq("claim_id", claim.claim_id)
        .order("created_at", { ascending: false });

      if (error) {
        setVersionsError(error.message);
        setVersions([]);
        return;
      }

      setVersions((data || []) as ClaimTextVersionRow[]);
    } finally {
      setVersionsLoading(false);
    }
  }

  function closeViewClaimModal() {
    setViewClaimModalOpen(false);
    setSelectedClaim(null);
    setVersions([]);
    setVersionsError(null);
    setVersionsLoading(false);
  }

  const countAll = claims.length;
  const countMine = claims.filter((c) => myProfileIds.includes(c.owner_profile_id)).length;
  const countPriv = claims.filter((c) => c.visibility === "private").length;
  const countWs = claims.filter((c) => c.visibility === "workspace").length;

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
                Public workspace claims + your private claims. Claim state is shown only for claims you own.
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

            <button type="button" onClick={() => setNewClaimModalOpen(true)} style={primaryStyle}>
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
                {filteredClaims.map((c) => {
                  const derivedState = claimStateById[c.claim_id]; // only exists for claims you own
                  const title = (c.current_text || "").trim() || "(no text)";
                  return (
                    <button
                      key={c.claim_id}
                      type="button"
                      onClick={() => void openViewClaimModal(c)}
                      style={{
                        textAlign: "left",
                        padding: 14,
                        border: `1px solid ${border}`,
                        borderRadius: 10,
                        background: "#ffffff",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: text, lineHeight: 1.35 }}>
                          {title}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {/* Owner-only derived state */}
                          {derivedState ? <div style={stateBadgeStyle(derivedState)}>{derivedState}</div> : null}

                          {/* Visibility */}
                          <div style={visibilityBadgeStyle(c.visibility)}>
                            {c.visibility === "workspace" ? "Public" : "Private"}
                          </div>
                        </div>
                      </div>

                      <div style={{ marginTop: 8, fontSize: 12, color: muted }}>
                        Created {new Date(c.created_at).toLocaleString()}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <ViewClaimModal
        open={viewClaimModalOpen}
        claim={selectedClaim}
        versionsLoading={versionsLoading}
        versionsError={versionsError}
        versions={versions}
        borderColor={border}
        textColor={text}
        mutedColor={muted}
        muted2Color={muted2}
        pillBaseStyle={pillBase}
        onClose={closeViewClaimModal}
      />

      {/* New Claim Modal */}
      {newClaimModalOpen && (
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
              onChange={(e) => setNewVisibility(e.target.value as ClaimVisibility)}
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
              <option value="workspace">Public (workspace)</option>
            </select>

            {submitError && <div style={{ marginBottom: 12, fontSize: 13, color: "#b91c1c" }}>{submitError}</div>}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => {
                  setNewClaimModalOpen(false);
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
                type="button"
                onClick={() => void submitNewClaim()}
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
