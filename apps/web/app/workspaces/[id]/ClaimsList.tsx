"use client";

type ClaimVisibility = "private" | "workspace";
type ClaimState = "Affirmed" | "Unconfirmed" | "Challenged" | "Retired";
type FilterKey = "all" | "mine" | "private" | "workspace";

type ClaimRow = {
  claim_id: string;
  visibility: ClaimVisibility;
  owner_profile_id: string;
  created_at: string;
  retired_at: string | null;
  current_text: string | null;
};

export default function ClaimsList(props: {
  claims: ClaimRow[];
  myProfileIds: string[];
  claimStateById: Record<string, ClaimState>;
  filter: FilterKey;
  setFilter: (v: FilterKey) => void;
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
  onOpenClaim: (claim: ClaimRow) => void;
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

  const countAll = claims.length;
  const countMine = claims.filter((c) => myProfileIds.includes(c.owner_profile_id)).length;
  const countPriv = claims.filter((c) => c.visibility === "private").length;
  const countWs = claims.filter((c) => c.visibility === "workspace").length;

  const filteredClaims = (() => {
    if (filter === "all") return claims;
    if (filter === "private") return claims.filter((c) => c.visibility === "private");
    if (filter === "workspace") return claims.filter((c) => c.visibility === "workspace");
    if (filter === "mine") return claims.filter((c) => myProfileIds.includes(c.owner_profile_id));
    return claims;
  })();

  function pill(active: boolean): React.CSSProperties {
    return {
      ...pillBaseStyle,
      background: active ? "#eef2f7" : "#ffffff",
      borderColor: active ? "#cbd5e1" : borderColor,
      color: textColor,
    };
  }

  const badgeBase: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 800,
    border: `1px solid ${borderColor}`,
    padding: "6px 10px",
    borderRadius: 999,
    height: "fit-content",
    whiteSpace: "nowrap",
  };

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
        ) : filteredClaims.length === 0 ? (
          <div style={{ fontSize: 13, color: mutedColor }}>No claims yet for this workspace.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {filteredClaims.map((c) => {
              const derivedState = claimStateById[c.claim_id]; // only exists for claims you own
              const title = (c.current_text || "").trim() || "(no text)";

              return (
                <button
                  key={c.claim_id}
                  type="button"
                  onClick={() => onOpenClaim(c)}
                  style={{
                    textAlign: "left",
                    padding: 14,
                    border: `1px solid ${borderColor}`,
                    borderRadius: 10,
                    background: "#ffffff",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: textColor, lineHeight: 1.35 }}>{title}</div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {/* Owner-only derived state */}
                      {derivedState ? <div style={stateBadgeStyle(derivedState)}>{derivedState}</div> : null}

                      {/* Visibility */}
                      <div style={visibilityBadgeStyle(c.visibility)}>
                        {c.visibility === "workspace" ? "Public" : "Private"}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 8, fontSize: 12, color: mutedColor }}>
                    Created {new Date(c.created_at).toLocaleString()}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
