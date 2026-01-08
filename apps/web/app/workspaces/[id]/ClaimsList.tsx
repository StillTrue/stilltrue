"use client";

import { useMemo } from "react";

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

type FilterKey = "all" | "mine" | "private" | "workspace" | "retired";

export default function ClaimsList(props: {
  claims: ClaimRow[];
  myProfileIds: string[];
  claimStateById: Record<string, ClaimState>;

  filter: FilterKey;
  setFilter: (k: FilterKey) => void;

  loading: boolean;
  loadError: string | null;

  borderColor: string;
  cardBg: string;
  textColor: string;
  mutedColor: string;
  muted2Color: string;
  pillBaseStyle: React.CSSProperties;
  primaryStyle: React.CSSProperties;

  onNewClaim: () => void;
  onOpenClaim: (c: ClaimRow) => void;
}) {
  const {
    claims,
    myProfileIds,
    claimStateById,
    filter,
    setFilter,
    loading,
    loadError,
    borderColor,
    cardBg,
    textColor,
    mutedColor,
    muted2Color,
    pillBaseStyle,
    primaryStyle,
    onNewClaim,
    onOpenClaim,
  } = props;

  const badgeBase: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 800,
    border: `1px solid ${borderColor}`,
    padding: "6px 10px",
    borderRadius: 999,
    height: "fit-content",
    whiteSpace: "nowrap",
  };

  function pill(active: boolean): React.CSSProperties {
    return {
      ...pillBaseStyle,
      background: active ? "#eef2f7" : "#ffffff",
      borderColor: active ? "#cbd5e1" : borderColor,
      color: textColor,
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

  // Counts are derived from the list provided (page already pre-filters for active vs retired when needed)
  const counts = useMemo(() => {
    const all = claims.length;
    const mine = claims.filter((c) => myProfileIds.includes(c.owner_profile_id)).length;
    const priv = claims.filter((c) => c.visibility === "private").length;
    const ws = claims.filter((c) => c.visibility === "workspace").length;
    const retired = claims.filter((c) => !!c.retired_at).length;
    return { all, mine, priv, ws, retired };
  }, [claims, myProfileIds]);

  return (
    <div
      style={{
        background: cardBg,
        borderRadius: 12,
        boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
        overflow: "hidden",
        border: `1px solid ${borderColor}`,
      }}
    >
      <div
        style={{
          padding: "16px 22px",
          borderBottom: `1px solid ${borderColor}`,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: muted2Color }}>Claims</div>
          <div style={{ marginTop: 4, fontSize: 13, color: mutedColor, maxWidth: 720 }}>
            Public workspace claims + your private claims. Claim state is shown only for claims you own.
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" onClick={() => setFilter("all")} style={pill(filter === "all")}>
              All ({counts.all})
            </button>
            <button type="button" onClick={() => setFilter("mine")} style={pill(filter === "mine")}>
              My Claims ({counts.mine})
            </button>
            <button type="button" onClick={() => setFilter("private")} style={pill(filter === "private")}>
              Private (Mine) ({counts.priv})
            </button>
            <button type="button" onClick={() => setFilter("workspace")} style={pill(filter === "workspace")}>
              Public (Workspace) ({counts.ws})
            </button>
            <button type="button" onClick={() => setFilter("retired")} style={pill(filter === "retired")}>
              Retired ({counts.retired})
            </button>
          </div>
        </div>

        <button type="button" onClick={onNewClaim} style={primaryStyle}>
          + New claim
        </button>
      </div>

      <div style={{ padding: "18px 22px" }}>
        {loading ? (
          <div style={{ fontSize: 13, color: mutedColor }}>Loading…</div>
        ) : loadError ? (
          <div style={{ fontSize: 13, color: "#b91c1c" }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Couldn’t load claims</div>
            {loadError}
          </div>
        ) : claims.length === 0 ? (
          <div style={{ fontSize: 13, color: mutedColor }}>
            {filter === "retired" ? "No retired claims." : "No claims yet for this workspace."}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {claims.map((c) => {
              const derivedState = claimStateById[c.claim_id]; // only exists for claims you own
              const title = (c.current_text || "").trim() || "(no text)";
              const isRetired = !!c.retired_at;

              return (
                <div
                  key={c.claim_id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpenClaim(c)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") onOpenClaim(c);
                  }}
                  style={{
                    padding: 14,
                    border: `1px solid ${borderColor}`,
                    borderRadius: 10,
                    background: "#ffffff",
                    cursor: "pointer",
                    opacity: isRetired ? 0.75 : 1,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: textColor, lineHeight: 1.35 }}>
                      {title}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      {/* Owner-only derived state */}
                      {derivedState ? <div style={stateBadgeStyle(derivedState)}>{derivedState}</div> : null}

                      {/* Retired tag for clarity (not a derived state exposure; just reflects retired_at) */}
                      {isRetired ? <div style={{ ...badgeBase, color: "#6b7280", background: "#f3f4f6" }}>Retired</div> : null}

                      {/* Visibility */}
                      <div style={visibilityBadgeStyle(c.visibility)}>{c.visibility === "workspace" ? "Public" : "Private"}</div>
                    </div>
                  </div>

                  <div style={{ marginTop: 8, fontSize: 12, color: mutedColor }}>
                    Created {new Date(c.created_at).toLocaleString()}
                    {c.retired_at ? ` · Retired ${new Date(c.retired_at).toLocaleString()}` : ""}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
