// apps/web/app/workspaces/[id]/page.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function WorkspaceClaimsPage({ params }: { params: { id: string } }) {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  const pageBg = "#f3f4f6";
  const cardBg = "#ffffff";
  const border = "#e5e7eb";
  const text = "#111827";
  const muted = "#6b7280";
  const muted2 = "#374151";
  const buttonBlue = "#5b7fa6";

  const pillStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 12px",
    borderRadius: 6,
    border: `1px solid ${border}`,
    background: "#ffffff",
    color: text,
    fontWeight: 600,
    fontSize: 13,
    textDecoration: "none",
    cursor: "pointer",
    lineHeight: 1,
    whiteSpace: "nowrap",
  };

  const primaryStyle: React.CSSProperties = {
    ...pillStyle,
    border: "none",
    background: buttonBlue,
    color: "#ffffff",
  };

  const [wsName] = useState<string>("Workspace");
  const [email, setEmail] = useState<string>("Signed in");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [newText, setNewText] = useState("");
  const [newVisibility, setNewVisibility] = useState<"private" | "public">("private");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Load email (lightweight)
  useState(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data?.user;
      setEmail(u?.email ? `Signed in as ${u.email}` : "Signed in");
    });
  });

  async function submitNewClaim() {
    setSubmitting(true);
    setSubmitError(null);

    // Call RPC with the exact argument names and types.
    // NOTE: _visibility is claim_visibility enum ('private' | 'public')
    const res = await supabase.rpc("create_claim_with_text", {
      _workspace_id: params.id,
      _visibility: newVisibility,
      _review_cadence: "monthly",
      _validation_mode: "any",
      _text: newText.trim(),
    });

    setSubmitting(false);

    if (res.error) {
      // Show maximum useful detail to debug PostgREST schema cache issues.
      const e = res.error as any;
      const detail = [
        e.message ? `message: ${e.message}` : null,
        e.details ? `details: ${e.details}` : null,
        e.hint ? `hint: ${e.hint}` : null,
        e.code ? `code: ${e.code}` : null,
      ]
        .filter(Boolean)
        .join(" • ");
      setSubmitError(detail || "Unknown error");
      return;
    }

    setModalOpen(false);
    setNewText("");
    setNewVisibility("private");

    // For now: hard reload so you can immediately see if the claim exists via other tools/screens.
    router.refresh();
    window.location.reload();
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
              <div style={{ fontSize: 20, fontWeight: 800, color: text }}>{wsName}</div>
              <div style={{ fontSize: 13, color: muted }}>{email}</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link href="/" style={pillStyle}>
              Workspaces
            </Link>

            <form action="/auth/logout" method="post" style={{ margin: 0 }}>
              <button type="submit" style={primaryStyle}>
                Logout
              </button>
            </form>
          </div>
        </div>

        {/* Claims card */}
        <div
          style={{
            background: cardBg,
            borderRadius: 12,
            boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
            overflow: "hidden",
            border: `1px solid ${border}`,
          }}
        >
          <div
            style={{
              padding: "16px 22px",
              borderBottom: `1px solid ${border}`,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: muted2 }}>Claims</div>
              <div style={{ marginTop: 4, fontSize: 13, color: muted, maxWidth: 680 }}>
                Create a claim to begin testing. (Claims list wiring will resume after we verify the view’s columns.)
              </div>
            </div>

            <button type="button" onClick={() => setModalOpen(true)} style={primaryStyle}>
              + New claim
            </button>
          </div>

          <div style={{ padding: "22px" }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: text }}>No claims loaded yet</div>
            <div style={{ marginTop: 6, fontSize: 13, color: muted }}>
              Once claim creation works, we’ll wire the list from <code>claims_visible_to_member</code>.
            </div>
          </div>
        </div>
      </div>

      {/* New Claim Modal */}
      {modalOpen && (
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
        >
          <div
            style={{
              width: "min(520px, 100%)",
              background: "#ffffff",
              borderRadius: 12,
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              padding: 24,
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 800, color: text, marginBottom: 14 }}>New claim</h2>

            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: muted2, marginBottom: 6 }}>
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
                border: "1px solid #d1d5db",
                fontSize: 14,
                marginBottom: 14,
                background: "#ffffff",
                color: text,
                outline: "none",
              }}
            />

            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: muted2, marginBottom: 6 }}>
              Visibility
            </label>
            <select
              value={newVisibility}
              onChange={(e) => setNewVisibility(e.target.value as "private" | "public")}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 6,
                border: "1px solid #d1d5db",
                fontSize: 14,
                marginBottom: 16,
                background: "#ffffff",
                color: text,
                outline: "none",
              }}
            >
              <option value="private">Private (mine)</option>
              <option value="public">Public (workspace)</option>
            </select>

            {submitError && <div style={{ marginBottom: 12, fontSize: 13, color: "#b91c1c" }}>{submitError}</div>}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={() => {
                  setModalOpen(false);
                  setSubmitError(null);
                }}
                disabled={submitting}
                style={{
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: "1px solid #d1d5db",
                  background: "#ffffff",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              <button
                onClick={submitNewClaim}
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
      )}
    </main>
  );
}
