"use client";

import { useEffect, useMemo, useState } from "react";

type ClaimVisibility = "private" | "workspace";
type ReviewCadence = "weekly" | "monthly" | "quarterly" | "custom";
type ValidationMode = "any" | "all";

type ClaimValidatorRow = {
  claim_id: string;
  validator_profile_id: string;
  kind: "human" | "automated";
  email?: string | null;
};

type ClaimRow = {
  claim_id: string;
  visibility: ClaimVisibility;
  current_text: string | null;

  // Validation settings (owner-only in UI, but stored on claim)
  review_cadence: ReviewCadence;
  validation_mode: ValidationMode;

  // Owner-only validators list (already loaded by page.tsx and passed in)
  validators?: ClaimValidatorRow[];
};

type ClaimTextVersionRow = {
  id: string;
  claim_id: string;
  text: string;
  created_at: string;
  created_by_profile_id?: string | null;
};

type SupabaseLike = {
  rpc: (fn: string, args?: any) => Promise<{ data?: any; error?: { message?: string } | null }>;
};

function titleCase(s: string) {
  if (!s) return s;
  return s.slice(0, 1).toUpperCase() + s.slice(1);
}

export default function EditClaimModal(props: {
  open: boolean;
  claim: ClaimRow | null;
  versions: ClaimTextVersionRow[];

  supabase: SupabaseLike;
  onClose: () => void;
  onSaved: () => Promise<void>;

  borderColor: string;
  textColor: string;
  muted2Color: string;
  buttonBlue: string;
}) {
  const {
    open,
    claim,
    versions,
    supabase,
    onClose,
    onSaved,
    borderColor,
    textColor,
    muted2Color,
    buttonBlue,
  } = props;

  const initialText = useMemo(() => {
    if (!claim) return "";
    if (versions && versions.length > 0) return versions[0]?.text ?? "";
    return claim.current_text ?? "";
  }, [claim, versions]);

  const initialVisibility = useMemo<ClaimVisibility>(() => {
    if (!claim) return "private";
    return claim.visibility;
  }, [claim]);

  const initialCadence = useMemo<ReviewCadence>(() => {
    if (!claim) return "monthly";
    return claim.review_cadence;
  }, [claim]);

  const initialMode = useMemo<ValidationMode>(() => {
    if (!claim) return "any";
    return claim.validation_mode;
  }, [claim]);

  const [text, setText] = useState("");
  const [visibility, setVisibility] = useState<ClaimVisibility>("private");

  const [reviewCadence, setReviewCadence] = useState<ReviewCadence>("monthly");
  const [validationMode, setValidationMode] = useState<ValidationMode>("any");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validators UI
  const [validatorEmail, setValidatorEmail] = useState("");
  const [validatorsBusy, setValidatorsBusy] = useState(false);
  const [validatorsError, setValidatorsError] = useState<string | null>(null);

  const validators = useMemo<ClaimValidatorRow[]>(() => {
    return (claim?.validators || []).slice();
  }, [claim]);

  // ESC key should only close the TOP modal.
  // Edit modal is top-most when open, so stop propagation by preventing the lower modal handler
  // from seeing Escape. We do this by handling Escape and calling stopImmediatePropagation.
  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      // Prevent ViewClaimModal (underneath) from also closing.
      // stopImmediatePropagation isn't in TS lib for KeyboardEvent, but exists on Event in browsers.
      (e as any).stopImmediatePropagation?.();
      onClose();
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Reset fields when modal opens / claim changes
  useEffect(() => {
    if (!open || !claim) return;

    setText(initialText);
    setVisibility(initialVisibility);

    setReviewCadence(initialCadence);
    setValidationMode(initialMode);

    setError(null);
    setSaving(false);

    setValidatorEmail("");
    setValidatorsError(null);
    setValidatorsBusy(false);
  }, [open, claim, initialText, initialVisibility, initialCadence, initialMode]);

  async function save() {
    if (!claim) return;

    const trimmed = text.trim();
    if (!trimmed) {
      setError("Claim text cannot be empty.");
      return;
    }

    setSaving(true);
    setError(null);

    // 1) claim text + visibility
    const { error: rpcErr } = await supabase.rpc("edit_claim_text_and_visibility", {
      _claim_id: claim.claim_id,
      _new_text: trimmed,
      _new_visibility: visibility,
    });

    if (rpcErr) {
      setSaving(false);
      setError(rpcErr.message || "Failed to save changes.");
      return;
    }

    // 2) validation settings
    const { error: settingsErr } = await supabase.rpc("edit_claim_validation_settings", {
      _claim_id: claim.claim_id,
      _review_cadence: reviewCadence,
      _validation_mode: validationMode,
    });

    setSaving(false);

    if (settingsErr) {
      setError(settingsErr.message || "Failed to save validation settings.");
      return;
    }

    onClose();
    await onSaved();
  }

  async function addValidator() {
    if (!claim) return;

    const email = validatorEmail.trim();
    if (!email) {
      setValidatorsError("Enter an email address.");
      return;
    }

    setValidatorsBusy(true);
    setValidatorsError(null);

    const { error: rpcErr } = await supabase.rpc("add_claim_validator_by_email", {
      _claim_id: claim.claim_id,
      _email: email,
      _kind: "human",
    });

    setValidatorsBusy(false);

    if (rpcErr) {
      setValidatorsError(rpcErr.message || "Failed to add validator.");
      return;
    }

    setValidatorEmail("");
    await onSaved(); // reload validators list from page
  }

  async function removeValidator(validatorProfileId: string) {
    if (!claim) return;

    setValidatorsBusy(true);
    setValidatorsError(null);

    const { error: rpcErr } = await supabase.rpc("remove_claim_validator", {
      _claim_id: claim.claim_id,
      _validator_profile_id: validatorProfileId,
    });

    setValidatorsBusy(false);

    if (rpcErr) {
      setValidatorsError(rpcErr.message || "Failed to remove validator.");
      return;
    }

    await onSaved(); // reload validators list from page
  }

  if (!open || !claim) return null;

  const pillBtn: React.CSSProperties = {
    padding: "9px 12px",
    borderRadius: 8,
    border: `1px solid ${borderColor}`,
    background: "#ffffff",
    cursor: "pointer",
    fontWeight: 800,
  };

  const fieldStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: `1px solid ${borderColor}`,
    fontSize: 14,
    background: "#ffffff",
    color: textColor,
    outline: "none",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 70,
        padding: 16,
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "min(760px, 100%)",
          background: "#ffffff",
          borderRadius: 12,
          boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
          padding: 20,
          border: `1px solid ${borderColor}`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: textColor }}>Edit claim</div>
          <button type="button" onClick={onClose} disabled={saving || validatorsBusy} style={pillBtn}>
            Close
          </button>
        </div>

        {/* Text */}
        <div style={{ marginTop: 14 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: muted2Color, marginBottom: 6 }}>
            Claim text
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            style={{ ...fieldStyle, resize: "vertical" }}
          />
        </div>

        {/* Visibility */}
        <div style={{ marginTop: 14 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: muted2Color, marginBottom: 6 }}>
            Visibility
          </label>
          <select value={visibility} onChange={(e) => setVisibility(e.target.value as ClaimVisibility)} style={fieldStyle}>
            <option value="private">Private (mine)</option>
            <option value="workspace">Public (workspace)</option>
          </select>
        </div>

        {/* Validation settings */}
        <div style={{ marginTop: 16, borderTop: `1px solid ${borderColor}`, paddingTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: muted2Color, textTransform: "uppercase", marginBottom: 10 }}>
            Validation settings
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: muted2Color, marginBottom: 6 }}>
                Cadence
              </label>
              <select
                value={reviewCadence}
                onChange={(e) => setReviewCadence(e.target.value as ReviewCadence)}
                style={fieldStyle}
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: muted2Color, marginBottom: 6 }}>
                Mode
              </label>
              <select
                value={validationMode}
                onChange={(e) => setValidationMode(e.target.value as ValidationMode)}
                style={fieldStyle}
              >
                <option value="any">Any validator</option>
                <option value="all">All validators</option>
              </select>
            </div>
          </div>
        </div>

        {/* Validators */}
        <div style={{ marginTop: 16, borderTop: `1px solid ${borderColor}`, paddingTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: muted2Color, textTransform: "uppercase", marginBottom: 10 }}>
            Validators (owner only)
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <input
              value={validatorEmail}
              onChange={(e) => setValidatorEmail(e.target.value)}
              placeholder="Add validator by email"
              style={{ ...fieldStyle, width: "min(420px, 100%)" }}
              disabled={validatorsBusy}
            />

            <button
              type="button"
              onClick={() => void addValidator()}
              disabled={validatorsBusy || !validatorEmail.trim()}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: "none",
                background: buttonBlue,
                color: "#ffffff",
                cursor: "pointer",
                fontWeight: 900,
              }}
            >
              {validatorsBusy ? "Working…" : "Add"}
            </button>
          </div>

          {validatorsError ? <div style={{ marginTop: 10, fontSize: 13, color: "#b91c1c" }}>{validatorsError}</div> : null}

          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            {validators.length === 0 ? (
              <div style={{ fontSize: 13, color: "#6b7280" }}>
                No validators set. You can add people by email. (If you click “Validate now” with zero validators, the system will
                add you as a fallback recipient so the request is answerable.)
              </div>
            ) : (
              validators.map((v) => (
                <div
                  key={v.validator_profile_id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    border: `1px solid ${borderColor}`,
                    borderRadius: 10,
                    padding: "10px 12px",
                    background: "#ffffff",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 900,
                        border: `1px solid ${borderColor}`,
                        padding: "6px 10px",
                        borderRadius: 999,
                        background: "#f8fafc",
                        color: "#0f172a",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {titleCase(v.kind)}
                    </div>

                    <div style={{ fontSize: 13, color: textColor, fontWeight: 800 }}>
                      {v.email ? v.email : v.validator_profile_id}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void removeValidator(v.validator_profile_id)}
                    disabled={validatorsBusy}
                    style={{
                      ...pillBtn,
                      borderColor: "#fecaca",
                      color: "#b91c1c",
                      fontWeight: 900,
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {error ? <div style={{ marginTop: 12, fontSize: 13, color: "#b91c1c" }}>{error}</div> : null}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
          <button type="button" onClick={onClose} disabled={saving || validatorsBusy} style={pillBtn}>
            Cancel
          </button>

          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || validatorsBusy || !text.trim()}
            style={{
              padding: "9px 14px",
              borderRadius: 8,
              border: "none",
              background: buttonBlue,
              color: "#ffffff",
              cursor: "pointer",
              fontWeight: 900,
            }}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
