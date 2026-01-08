"use client";

import { useMemo, useState } from "react";

type ClaimRow = {
  claim_id: string;
  current_text: string | null;
  retired_at?: string | null;
};

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

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function safeNum(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function ViewClaimModal(props: {
  open: boolean;
  claim: ClaimRow | null;
  versionsLoading: boolean;
  versionsError: string | null;
  versions: ClaimTextVersionRow[];

  canEdit: boolean;
  onEdit: () => void;

  onRetire: () => Promise<void>;

  // Optional (wired later from parent): owner-only validation summary
  validationSummaryLoading?: boolean;
  validationSummaryError?: string | null;
  validationSummary?: ClaimValidationSummary | null;

  borderColor: string;
  textColor: string;
  mutedColor: string;
  muted2Color: string;
  pillBaseStyle: React.CSSProperties;
  onClose: () => void;
}) {
  const {
    open,
    claim,
    versionsLoading,
    versionsError,
    versions,
    canEdit,
    onEdit,
    onRetire,
    validationSummaryLoading,
    validationSummaryError,
    validationSummary,
    borderColor,
    textColor,
    mutedColor,
    muted2Color,
    pillBaseStyle,
    onClose,
  } = props;

  const [retiring, setRetiring] = useState(false);
  const [retireError, setRetireError] = useState<string | null>(null);

  const claimIsRetired = !!claim?.retired_at;

  const selectedCurrentText = useMemo(() => {
    if (!claim) return "";
    if (versions && versions.length > 0) return versions[0]?.text ?? "";
    return claim.current_text ?? "";
  }, [claim, versions]);

  async function doRetire() {
    if (retiring) return;
    if (claimIsRetired) return; // safety
    setRetireError(null);

    const ok = window.confirm("Retire this claim?");
    if (!ok) return;

    setRetiring(true);
    try {
      await onRetire();
      onClose();
    } catch (e: any) {
      setRetireError(e?.message ? String(e.message) : "Failed to retire claim.");
    } finally {
      setRetiring(false);
    }
  }

  if (!open || !claim) return null;

  const summary = validationSummary || null;

  const totalRequests = safeNum(summary?.total_requests);
  const openRequests = safeNum(summary?.open_requests);
  const closedRequests = safeNum(summary?.closed_requests);

  const totalResponses = safeNum(summary?.total_responses);
  const yesCount = safeNum(summary?.yes_count);
  const unsureCount = safeNum(summary?.unsure_count);
  const noCount = safeNum(summary?.no_count);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 60,
        padding: 16,
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "min(820px, 100%)",
          background: "#ffffff",
          borderRadius: 12,
          boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
          overflow: "hidden",
          border: `1px solid ${borderColor}`,
        }}
      >
        <div
          style={{
            padding: "14px 16px",
            borderBottom: `1px solid ${borderColor}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 900, color: textColor }}>View claim</div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Hide action buttons on retired claims */}
            {canEdit && !claimIsRetired ? (
              <>
                <button
                  type="button"
                  onClick={doRetire}
                  disabled={retiring}
                  style={{
                    ...pillBaseStyle,
                    borderRadius: 8,
                    padding: "8px 10px",
                    fontWeight: 900,
                    borderColor: "#fecaca",
                    color: "#b91c1c",
                  }}
                >
                  {retiring ? "Retiring…" : "Retire"}
                </button>

                <button
                  type="button"
                  onClick={onEdit}
                  style={{
                    ...pillBaseStyle,
                    borderRadius: 8,
                    padding: "8px 10px",
                    fontWeight: 900,
                  }}
                >
                  Edit
                </button>
              </>
            ) : null}

            <button
              type="button"
              onClick={onClose}
              style={{
                ...pillBaseStyle,
                borderRadius: 8,
                padding: "8px 10px",
                fontWeight: 900,
              }}
            >
              Close
            </button>
          </div>
        </div>

        <div style={{ padding: 16, display: "grid", gap: 14 }}>
          {retireError ? <div style={{ fontSize: 13, color: "#b91c1c" }}>{retireError}</div> : null}

          <div style={{ border: `1px solid ${borderColor}`, borderRadius: 12, padding: 14, background: "#ffffff" }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 900,
                color: muted2Color,
                marginBottom: 10,
                textTransform: "uppercase",
              }}
            >
              Current wording
            </div>

            {versionsLoading ? (
              <div style={{ fontSize: 13, color: mutedColor }}>Loading…</div>
            ) : versionsError ? (
              <div style={{ fontSize: 13, color: "#b91c1c" }}>{versionsError}</div>
            ) : (
              <div style={{ fontSize: 14, color: textColor, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {(selectedCurrentText || "").trim() || "(no text)"}
              </div>
            )}
          </div>

          <div style={{ border: `1px solid ${borderColor}`, borderRadius: 12, padding: 14, background: "#ffffff" }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 900,
                color: muted2Color,
                marginBottom: 10,
                textTransform: "uppercase",
              }}
            >
              History
            </div>

            {versionsLoading ? (
              <div style={{ fontSize: 13, color: mutedColor }}>Loading…</div>
            ) : versionsError ? (
              <div style={{ fontSize: 13, color: "#b91c1c" }}>{versionsError}</div>
            ) : versions.length === 0 ? (
              <div style={{ fontSize: 13, color: mutedColor }}>No versions found.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {versions.map((v) => (
                  <div
                    key={v.id}
                    style={{
                      border: `1px solid ${borderColor}`,
                      borderRadius: 10,
                      padding: 12,
                      background: "#ffffff",
                    }}
                  >
                    <div style={{ fontSize: 12, color: mutedColor, marginBottom: 6 }}>
                      {formatDateTime(v.created_at)}
                    </div>
                    <div style={{ fontSize: 14, color: textColor, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
                      {v.text}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ border: `1px solid ${borderColor}`, borderRadius: 12, padding: 14, background: "#ffffff" }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 900,
                color: muted2Color,
                marginBottom: 10,
                textTransform: "uppercase",
              }}
            >
              Validation summary
            </div>

            {!canEdit ? (
              <div style={{ fontSize: 13, color: mutedColor, lineHeight: 1.6 }}>
                Validation signals are visible only to the claim owner.
              </div>
            ) : validationSummaryLoading ? (
              <div style={{ fontSize: 13, color: mutedColor }}>Loading…</div>
            ) : validationSummaryError ? (
              <div style={{ fontSize: 13, color: "#b91c1c" }}>{validationSummaryError}</div>
            ) : !summary || totalRequests === 0 ? (
              <div style={{ fontSize: 13, color: mutedColor, lineHeight: 1.6 }}>
                No validation requests yet. When requests are created, this will show response counts (signals only).
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ fontSize: 13, color: mutedColor, lineHeight: 1.6 }}>
                  These counts are signals from validators, not truth.
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  <div style={{ border: `1px solid ${borderColor}`, borderRadius: 10, padding: 12 }}>
                    <div style={{ fontSize: 12, color: mutedColor }}>Requests</div>
                    <div style={{ marginTop: 4, fontSize: 18, fontWeight: 900, color: textColor }}>
                      {totalRequests}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12, color: mutedColor }}>
                      Open: {openRequests} · Closed: {closedRequests}
                    </div>
                  </div>

                  <div style={{ border: `1px solid ${borderColor}`, borderRadius: 10, padding: 12 }}>
                    <div style={{ fontSize: 12, color: mutedColor }}>Responses</div>
                    <div style={{ marginTop: 4, fontSize: 18, fontWeight: 900, color: textColor }}>
                      {totalResponses}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12, color: mutedColor }}>
                      Yes: {yesCount} · Unsure: {unsureCount} · No: {noCount}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
