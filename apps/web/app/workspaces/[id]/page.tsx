"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import ViewClaimModal from "./ViewClaimModal";
import ClaimsList from "./ClaimsList";
import NewClaimModal from "./NewClaimModal";
import EditClaimModal from "./EditClaimModal";

type ClaimVisibility = "private" | "workspace";
type ClaimState = "Affirmed" | "Unconfirmed" | "Challenged" | "Retired";

type ReviewCadence = "weekly" | "monthly" | "quarterly" | "custom";
type ValidationMode = "any" | "all";

type ClaimRow = {
  claim_id: string;
  visibility: ClaimVisibility;
  owner_profile_id: string;
  created_at: string;
  retired_at: string | null;
  current_text: string | null;
  review_cadence: ReviewCadence;
  validation_mode: ValidationMode;
};

type FilterKey = "all" | "mine" | "private" | "workspace" | "retired";

type ClaimTextVersionRow = {
  id: string;
  claim_id: string;
  text: string;
  created_at: string;
  created_by_profile_id?: string | null;
};

type ClaimValidationSummary = {
  claim_id: string;
  total_requests: number;
  open_requests: number;
  closed_requests: number;
  total_responses: number;
  yes_count: number;
  unsure_count: number;
  no_count: number;
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

  const [newClaimModalOpen, setNewClaimModalOpen] = useState(false);

  const [viewClaimModalOpen, setViewClaimModalOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<ClaimRow | null>(null);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionsError, setVersionsError] = useState<string | null>(null);
  const [versions, setVersions] = useState<ClaimTextVersionRow[]>([]);

  const [editClaimModalOpen, setEditClaimModalOpen] = useState(false);

  const [validationSummary, setValidationSummary] = useState<ClaimValidationSummary | null>(null);
  const [validationSummaryLoading, setValidationSummaryLoading] = useState(false);
  const [validationSummaryError, setValidationSummaryError] = useState<string | null>(null);

  const [filter, setFilter] = useState<FilterKey>("all");

  const canEditSelected = useMemo(() => {
    if (!selectedClaim) return false;
    return myProfileIds.includes(selectedClaim.owner_profile_id);
  }, [myProfileIds, selectedClaim]);

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
      .from("claims_visible_to_member")
      .select(
        "claim_id, workspace_id, visibility, owner_profile_id, review_cadence, validation_mode, created_at, retired_at, current_text"
      )
      .eq("workspace_id", workspaceId)
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
      review_cadence: c.review_cadence as ReviewCadence,
      validation_mode: c.validation_mode as ValidationMode,
    }));

    setClaims(mapped);

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
      setClaimStateById({});
    }

    setLoading(false);
  }

  async function loadVersionsForClaim(claimId: string) {
    setVersions([]);
    setVersionsError(null);
    setVersionsLoading(true);

    try {
      const { data, error } = await supabase
        .from("claim_text_versions")
        .select("id, claim_id, text, created_at, created_by_profile_id")
        .eq("claim_id", claimId)
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

  async function loadValidationSummary(claimId: string) {
    setValidationSummary(null);
    setValidationSummaryError(null);
    setValidationSummaryLoading(true);

    try {
      const { data, error } = await supabase
        .from("claim_validation_summary")
        .select("*")
        .eq("claim_id", claimId)
        .maybeSingle();

      if (error) {
        setValidationSummaryError(error.message);
        return;
      }

      setValidationSummary((data as any) || null);
    } finally {
      setValidationSummaryLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  async function openViewClaimModal(claim: ClaimRow) {
    setSelectedClaim(claim);
    setViewClaimModalOpen(true);
    setEditClaimModalOpen(false);

    await loadVersionsForClaim(claim.claim_id);

    if (myProfileIds.includes(claim.owner_profile_id)) {
      await loadValidationSummary(claim.claim_id);
    }
  }

  function closeViewClaimModal() {
    setViewClaimModalOpen(false);
    setSelectedClaim(null);
    setVersions([]);
    setVersionsError(null);
    setVersionsLoading(false);
    setEditClaimModalOpen(false);
    setValidationSummary(null);
    setValidationSummaryError(null);
    setValidationSummaryLoading(false);
  }

  async function afterEditSaved() {
    await loadAll();
    if (selectedClaim?.claim_id) {
      await loadVersionsForClaim(selectedClaim.claim_id);
    }
  }

  async function retireSelectedClaim() {
    if (!selectedClaim) return;

    const { error } = await supabase.rpc("retire_claim", {
      _claim_id: selectedClaim.claim_id,
    });

    if (error) throw new Error(error.message);

    await loadAll();
  }

  const countRetired = claims.filter((c) => !!c.retired_at).length;

  return (
    <main style={{ minHeight: "100vh", background: pageBg, padding: "40px 16px" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
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

        {countRetired > 0 ? (
          <div style={{ marginTop: 10, fontSize: 13, color: muted }}>
            {countRetired} retired claim{countRetired === 1 ? "" : "s"} available in filters.
          </div>
        ) : null}
      </div>

      <ViewClaimModal
        open={viewClaimModalOpen}
        claim={selectedClaim}
        versionsLoading={versionsLoading}
        versionsError={versionsError}
        versions={versions}
        canEdit={canEditSelected}
        onEdit={() => setEditClaimModalOpen(true)}
        onRetire={retireSelectedClaim}
        validationSummary={validationSummary}
        validationSummaryLoading={validationSummaryLoading}
        validationSummaryError={validationSummaryError}
        borderColor={border}
        textColor={text}
        mutedColor={muted}
        muted2Color={muted2}
        pillBaseStyle={pillBase}
        onClose={closeViewClaimModal}
      />

      <EditClaimModal
        open={editClaimModalOpen}
        claim={selectedClaim}
        versions={versions}
        supabase={supabase as any}
        onClose={() => setEditClaimModalOpen(false)}
        onSaved={afterEditSaved}
        borderColor={border}
        textColor={text}
        muted2Color={muted2}
        buttonBlue={buttonBlue}
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
