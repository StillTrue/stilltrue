"use client";

import { useEffect, useMemo, useState } from "react";

type ClaimVisibility = "private" | "workspace";

type ClaimRow = {
  claim_id: string;
  visibility: ClaimVisibility;
  current_text: string | null;
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

  const [text, setText] = useState("");
  const [visibility, setVisibility] = useState<ClaimVisibility>("private");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !claim) return;
    setText(initialText);
    setVisibility(initialVisibility);
    setError(null);
    setSaving(false);
  }, [open, claim, initialText, initialVisibility]);

  // ESC key — consume at capture phase so underlying modals never see it
  useEffect(() => {
    if (!open) return;

    function onKeyCapture(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation(); // critical
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

    const { error: rpcErr } = await supabase.rpc("edit_claim_text_and_visibility", {
      _claim_id: claim.claim_id,
      _new_text: trimmed,
      _new_visibility: visibility,
    });

    setSaving(false);

    if (rpcErr) {
      setError(rpcErr.message || "Failed to save changes.");
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
          width: "min(620px, 100%)",
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
              fontWeight: 800,
            }}
          >
            Close
          </button>
        </div>

        <div style={{ marginTop: 14 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: muted2Color }}>Claim text</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            style={{
              width: "100%",
              marginTop: 6,
              padding: "10px 12px",
              borderRadius: 8,
              border: `1px solid ${borderColor}`,
              fontSize: 14,
            }}
          />
        </div>

        <div style={{ marginTop: 14 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: muted2Color }}>Visibility</label>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as ClaimVisibility)}
            style={{
              width: "100%",
              marginTop: 6,
              padding: "10px 12px",
              borderRadius: 8,
              border: `1px solid ${borderColor}`,
              fontSize: 14,
            }}
          >
            <option value="private">Private (mine)</option>
            <option value="workspace">Public (workspace)</option>
          </select>
        </div>

        {error && <div style={{ marginTop: 12, fontSize: 13, color: "#b91c1c" }}>{error}</div>}

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
              fontWeight: 700,
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
