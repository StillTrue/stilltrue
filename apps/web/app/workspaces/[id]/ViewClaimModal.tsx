"use client";

import { useEffect, useMemo, useState } from "react";

type ClaimRow = {
  claim_id: string;
  current_text: string | null;
  retired_at?: string | null;

  review_cadence?: "weekly" | "monthly" | "quarterly" | "custom";
  validation_mode?: "any" | "all";
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

type PendingRecipientRow = {
  request_id: string;
  pending_validator_profile_id: string;
  pending_validator_email: string | null;
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function titleCase(s: string) {
  if (!s) return s;
  return s.slice(0, 1).toUpperCase() + s.slice(1);
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

  const [openingValidation, setOpeningValidation] = useState(false);
  const [openValidationError, setOpenValidationError] = useState<string | null>(null);

  const claimIsRetired = !!claim?.retired_at;

  // ESC key closes only this modal
  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const selectedCurrentText = useMemo(() => {
    if (!claim) return "";
    if (versions && versions.length > 0) return versions[0]?.text ?? "";
    return claim.current_text ?? "";
  }, [claim, versions]);

  const cadenceLabel = claim?.review_cadence ? titleCase(claim.review_cadence) : null;
  const modeLabel = claim?.validation_mode
    ? claim.validation_mode === "any"
      ? "Any validator"
      : "All validators"
    : null;

  async function doRetire() {
    if (retiring || claimIsRetired) return;
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

  async function validateNow() {
    if (!claim || openingValidation) return;
    if (claimIsRetired) return;

    setOpenValidationError(null);
    setOpeningValidation(true);

    try {
      const latestVersionId = versions?.[0]?.id;
      if (!latestVersionId) throw new Error("No claim text version found.");

      const { createSupabaseBrowserClient } = await import("@/lib/supabase/browser");
      const supabase = createSupabaseBrowserClient();

      // Try to open a new manual request (this will fail if one is already open)
      const openRes = await supabase.rpc("open_validation_request", {
        _claim_id: claim.claim_id,
        _kind: "manual",
        _claim_text_version_id: latestVersionId,
      });

      if (!openRes.error) {
        alert("Validation request created.");
        return;
      }

      const msg = String(openRes.error?.message || "");

      // If one already exists, remind only the validators who haven't responded yet.
      if (msg.toLowerCase().includes("open validation request already exists")) {
        const remindRes = await supabase.rpc("remind_open_validation_request", {
          _claim_id: claim.claim_id,
        });

        if (remindRes.error) throw remindRes.error;

        const rows = (Array.isArray(remindRes.data) ? remindRes.data : []) as PendingRecipientRow[];
        const uniqueEmails = Array.from(
          new Set(
            rows
              .map((r) => (r?.pending_validator_email ? String(r.pending_validator_email).trim() : ""))
              .filter((e) => !!e)
          )
        );

        if (rows.length === 0) {
          alert("An open request already exists, and all validators have already responded. No reminders needed.");
        } else if (uniqueEmails.length > 0) {
          alert(`Reminder queued for ${uniqueEmails.length} pending validator(s):\n\n${uniqueEmails.join("\n")}`);
        } else {
          alert(`Reminder queued for ${rows.length} pending validator(s).`);
        }

        return;
      }

      // Any other error: surface it
      throw openRes.error;
    } catch (e: any) {
      setOpenValidationError(e?.message ? String(e.message) : "Failed to create or remind validation request.");
    } finally {
      setOpeningValidation(false);
    }
  }

  if (!open || !claim) return null;

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
          width: "min(860px, 100%)",
          background: "#ffffff",
          borderRadius: 12,
          boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
          overflow: "hidden",
          border: `1px solid ${borderColor}`,
        }}
      >
        {/* Header */}
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

        {/* Body */}
        <div style={{ padding: 16, display: "grid", gap: 14 }}>
          {retireError ? <div style={{ fontSize: 13, color: "#b91c1c" }}>{retireError}</div> : null}

          <div style={{ display: "grid", gap: 14 }}>
            {/* Current wording */}
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

            {/* History */}
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
                      <div style={{ fontSize: 12, color: mutedColor, marginBottom: 6 }}>{formatDateTime(v.created_at)}</div>
                      <div style={{ fontSize: 14, color: textColor, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
                        {v.text}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Validation */}
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
                Validation
              </div>

              {canEdit ? (
                <>
                  <div style={{ fontSize: 13, color: mutedColor, lineHeight: 1.6 }}>
                    Cadence: <strong style={{ color: textColor }}>{cadenceLabel ?? "—"}</strong> · Mode:{" "}
                    <strong style={{ color: textColor }}>{modeLabel ?? "—"}</strong>
                  </div>

                  {openValidationError ? (
                    <div style={{ marginTop: 10, fontSize: 13, color: "#b91c1c" }}>{openValidationError}</div>
                  ) : null}

                  <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      onClick={() => void validateNow()}
                      disabled={openingValidation || claimIsRetired}
                      style={{
                        ...pillBaseStyle,
                        borderRadius: 8,
                        padding: "9px 12px",
                        fontWeight: 900,
                        opacity: openingValidation || claimIsRetired ? 0.7 : 1,
                      }}
                    >
                      {openingValidation ? "Validating…" : "Validate now"}
                    </button>
                  </div>

                  {/* Optional summary, if wired by page.tsx */}
                  {validationSummaryLoading ? (
                    <div style={{ marginTop: 10, fontSize: 13, color: mutedColor }}>Loading validation summary…</div>
                  ) : validationSummaryError ? (
                    <div style={{ marginTop: 10, fontSize: 13, color: "#b91c1c" }}>{validationSummaryError}</div>
                  ) : validationSummary ? (
                    <div style={{ marginTop: 10, fontSize: 13, color: mutedColor, lineHeight: 1.6 }}>
                      Requests:{" "}
                      <strong style={{ color: textColor }}>{validationSummary.total_requests} total</strong> (
                      {validationSummary.open_requests} open, {validationSummary.closed_requests} closed) · Responses:{" "}
                      <strong style={{ color: textColor }}>{validationSummary.total_responses}</strong> (Yes{" "}
                      {validationSummary.yes_count}, Unsure {validationSummary.unsure_count}, No {validationSummary.no_count})
                    </div>
                  ) : null}
                </>
              ) : (
                <div style={{ fontSize: 13, color: mutedColor, lineHeight: 1.6 }}>
                  Validation signals are visible only to the claim owner.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
