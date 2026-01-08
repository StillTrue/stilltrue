"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import ViewClaimModal from "./ViewClaimModal";
import ClaimsList from "./ClaimsList";
import NewClaimModal from "./NewClaimModal";

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

  const [email, setEmail] = useState("Signed in");
  const [myProfileIds, setMyProfileIds] = useState<string[]>([]);
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [claimStateById, setClaimStateById] = useState<Record<string, ClaimState>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // New claim modal (open/close only; modal owns its own form state)
  const [newClaimModalOpen, setNewClaimModalOpen] = useState(false);

  // View claim modal (page owns selection + loaded versions)
  const [viewClaimModalOpen, setViewClaimModalOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<ClaimRow | null>(null);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionsError, setVersionsError] = useState<string | null>(null);
  const [versions, setVersions] = useState<ClaimTextVersionRow[]>([]);

  const [filter, setFilter] = useState<FilterKey>("all");

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

        <ClaimsList
          claims={claims}
          myProfileIds={myProfileIds}
          claimStateById={claimStateById}
          filter={filter}
          setFilter={setFilter}
          loading={loading}
          loadError={loadError}
          borderColor={border}
          cardBg={cardBg}
          textColor={text}
          mutedColor={muted}
          muted2Color={muted2}
          pillBaseStyle={pillBase}
          primaryStyle={primaryStyle}
          onNewClaim={() => setNewClaimModalOpen(true)}
          onOpenClaim={(c) => void openViewClaimModal(c)}
        />
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

      <NewClaimModal
        open={newClaimModalOpen}
        onClose={() => setNewClaimModalOpen(false)}
        onCreated={loadAll}
        supabase={supabase as any}
        workspaceId={workspaceId}
        borderColor={border}
        textColor={text}
        muted2Color={muted2}
        buttonBlue={buttonBlue}
      />
    </main>
  );
}
