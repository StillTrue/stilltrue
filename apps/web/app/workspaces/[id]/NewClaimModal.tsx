"use client";

import { useEffect, useState } from "react";

type ClaimVisibility = "private" | "workspace";

/**
 * We keep this prop type loose to avoid coupling to any specific Supabase client type package.
 * It only needs to support: supabase.rpc(name, args)
 */
type SupabaseLike = {
  rpc: (fn: string, args?: any) => Promise<{ data?: any; error?: { message?: string } | null }>;
};

export default function NewClaimModal(props: {
  open: boolean;
  onClose: () => void;
  onCreated: () => Promise<void>;
  supabase: SupabaseLike;
  workspaceId: string;

  // style tokens (passed from page so we don't duplicate)
  borderColor: string;
  textColor: string;
  muted2Color: string;
  buttonBlue: string;
}) {
  const {
    open,
    onClose,
    onCreated,
    supabase,
    workspaceId,
    borderColor,
    textColor,
    muted2Color,
    buttonBlue,
  } = props;

  const [newText, setNewText] = useState("");
  const [newVisibility, setNewVisibility] = useState<ClaimVisibility>("private");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // When modal opens, clear any old errors (but keep text if user reopens quickly? we reset fully)
  useEffect(() => {
    if (!open) return;
    setSubmitError(null);
  }, [open]);

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
      setSubmitError(error.message || "Failed to create claim.");
      return;
    }

    // reset
    setNewText("");
    setNewVisibility("private");
    setSubmitError(null);

    onClose();
    await onCreated();
  }

  if (!open) return null;

  return (
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
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
          setSubmitError(null);
        }
      }}
    >
      <div
        style={{
          width: "min(520px, 100%)",
          background: "#ffffff",
          borderRadius: 12,
          boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
          padding: 24,
          border: `1px solid ${borderColor}`,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 800, color: textColor, marginBottom: 14 }}>New claim</h2>

        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: muted2Color, marginBottom: 6 }}>
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
            border: `1px solid ${borderColor}`,
            fontSize: 14,
            marginBottom: 14,
            background: "#ffffff",
            color: textColor,
            outline: "none",
          }}
        />

        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: muted2Color, marginBottom: 6 }}>
          Visibility
        </label>
        <select
          value={newVisibility}
          onChange={(e) => setNewVisibility(e.target.value as ClaimVisibility)}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 6,
            border: `1px solid ${borderColor}`,
            fontSize: 14,
            marginBottom: 16,
            background: "#ffffff",
            color: textColor,
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
              onClose();
              setSubmitError(null);
            }}
            disabled={submitting}
            style={{
              padding: "8px 12px",
              borderRadius: 6,
              border: `1px solid ${borderColor}`,
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
  );
}
