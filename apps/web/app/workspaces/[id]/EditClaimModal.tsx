"use client";

import { useEffect, useMemo, useState } from "react";

type ClaimVisibility = "private" | "workspace";
type ReviewCadence = "weekly" | "monthly" | "quarterly" | "custom";
type ValidationMode = "any" | "all";

type ClaimRow = {
  claim_id: string;
  visibility: ClaimVisibility;
  current_text: string | null;

  // now passed through from page.tsx selectedClaim
  review_cadence?: ReviewCadence;
  validation_mode?: ValidationMode;
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
    if (!claim?.review_cadence) return "monthly";
    return claim.review_cadence;
  }, [claim]);

  const initialMode = useMemo<ValidationMode>(() => {
    if (!claim?.validation_mode) return "any";
    return claim.validation_mode;
  }, [claim]);

  const [text, setText] = useState("");
  const [visibility, setVisibility] = useState<ClaimVisibility>("private");
  const [cadence, setCadence] = useState<ReviewCadence>("monthly");
  const [mode, setMode] = useState<ValidationMode>("any");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !claim) return;
    setText(initialText);
    setVisibility(initialVisibility);
    setCadence(initialCadence);
    setMode(initialMode);
    setError(null);
    setSaving(false);
  }, [open, claim, initialText, initialVisibility, initialCadence, initialMode]);

  // ESC key — consume at capture phase so underlying modals never see it
  useEffect(() => {
    if (!open) return;

    function onKeyCapture(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyCapture, { capture: true });
    return () => window.removeEventListener("keydown", onKeyCapture, { capture: true });
  }, [open, onClose]);

  async function save() {
    if (!claim) return;

    const trimmed = text.trim();
    if (!trimmed) {
      setError("Claim text cannot be empty.");
      return;
    }

    setSaving(true);
    setError(null);

    // 1) Update text + visibility (existing RPC)
    const { error: rpcErr1 } = await supabase.rpc("edit_claim_text_and_visibility", {
      _claim_id: claim.claim_id,
      _new_text: trimmed,
      _new_visibility: visibility,
    });

    if (rpcErr1) {
      setSaving(false);
      setError(rpcErr1.message || "Failed to save changes.");
      return;
    }

    // 2) Update cadence + mode (new RPC)
    const { error: rpcErr2 } = await supabase.rpc("edit_claim_validation_settings", {
      _claim_id: claim.claim_id,
      _review_cadence: cadence,
      _validation_mode: mode,
    });

    setSaving(false);

    if (rpcErr2) {
      setError(rpcErr2.message || "Failed to save validation settings.");
      return;
    }

    onClose();
    await onSaved();
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
        zIndex: 70,
        padding: 16,
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "min(680px, 100%)",
          background: "#ffffff",
          borderRadius: 12,
          boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
          padding: 20,
          border: `1px solid ${borderColor}`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: textColor }}>Edit claim</div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{
              padding: "8px 10px",
              borderRadius: 8,
              border: `1px solid ${borderColor}`,
              background: "#ffffff",
              cursor: "pointer",
              fontWeight: 800,
              color: textColor,
            }}
          >
            Close
          </button>
        </div>

        <div style={{ marginTop: 14 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: muted2Color, marginBottom: 6 }}>
            Claim text
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 8,
              border: `1px solid ${borderColor}`,
              fontSize: 14,
              background: "#ffffff",
              color: textColor,
              outline: "none",
              resize: "vertical",
            }}
          />
        </div>

        <div style={{ marginTop: 14 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: muted2Color, marginBottom: 6 }}>
            Visibility
          </label>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as ClaimVisibility)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 8,
              border: `1px solid ${borderColor}`,
              fontSize: 14,
              background: "#ffffff",
              color: textColor,
              outline: "none",
            }}
          >
            <option value="private">Private (mine)</option>
            <option value="workspace">Public (workspace)</option>
          </select>
        </div>

        <div style={{ marginTop: 14 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: muted2Color, marginBottom: 6 }}>
            Review cadence
          </label>
          <select
            value={cadence}
            onChange={(e) => setCadence(e.target.value as ReviewCadence)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 8,
              border: `1px solid ${borderColor}`,
              fontSize: 14,
              background: "#ffffff",
              color: textColor,
              outline: "none",
            }}
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <div style={{ marginTop: 14 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: muted2Color, marginBottom: 6 }}>
            Validation mode
          </label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as ValidationMode)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 8,
              border: `1px solid ${borderColor}`,
              fontSize: 14,
              background: "#ffffff",
              color: textColor,
              outline: "none",
            }}
          >
            <option value="any">Any validator (one response is enough)</option>
            <option value="all">All validators (wait for all)</option>
          </select>
        </div>

        {error ? <div style={{ marginTop: 12, fontSize: 13, color: "#b91c1c" }}>{error}</div> : null}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{
              padding: "9px 12px",
              borderRadius: 8,
              border: `1px solid ${borderColor}`,
              background: "#ffffff",
              cursor: "pointer",
              fontWeight: 700,
              color: textColor,
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || !text.trim()}
            style={{
              padding: "9px 14px",
              borderRadius: 8,
              border: "none",
              background: buttonBlue,
              color: "#ffffff",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
