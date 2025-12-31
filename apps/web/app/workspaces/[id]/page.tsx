"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function WorkspaceClaimsPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const params = useParams();

  // ✅ Correct way to read dynamic route param in client component
  const workspaceId = params?.id as string | undefined;
  if (!workspaceId) {
    return (
      <div style={{ padding: 40 }}>
        <strong>Workspace ID missing from route</strong>
      </div>
    );
  }

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
  };

  const primaryStyle: React.CSSProperties = {
    ...pillStyle,
    border: "none",
    background: buttonBlue,
    color: "#ffffff",
  };

  const [email, setEmail] = useState("Signed in");
  const [modalOpen, setModalOpen] = useState(false);
  const [newText, setNewText] = useState("");
  const [newVisibility, setNewVisibility] =
    useState<"private" | "public">("private");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) {
        setEmail(`Signed in as ${data.user.email}`);
      }
    });
  }, [supabase]);

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
      setSubmitError(error.message);
      return;
    }

    setModalOpen(false);
    setNewText("");
    router.refresh();
  }

  return (
    <main style={{ minHeight: "100vh", background: pageBg, padding: 40 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div>
            <h1 style={{ margin: 0 }}>Workspace</h1>
            <div style={{ fontSize: 13, color: muted }}>{email}</div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <Link href="/" style={pillStyle}>
              Workspaces
            </Link>
            <form action="/auth/logout" method="post">
              <button style={primaryStyle}>Logout</button>
            </form>
          </div>
        </header>

        <section
          style={{
            background: cardBg,
            borderRadius: 12,
            padding: 20,
            border: `1px solid ${border}`,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <strong>Claims</strong>
            <button onClick={() => setModalOpen(true)} style={primaryStyle}>
              + New claim
            </button>
          </div>

          <div style={{ fontSize: 13, color: muted }}>
            No claims yet for this workspace.
          </div>
        </section>
      </div>

      {modalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: 24,
              borderRadius: 12,
              width: 480,
            }}
          >
            <h3>New claim</h3>

            <textarea
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              rows={4}
              style={{ width: "100%", marginBottom: 12 }}
            />

            <select
              value={newVisibility}
              onChange={(e) =>
                setNewVisibility(e.target.value as "private" | "public")
              }
              style={{ width: "100%", marginBottom: 12 }}
            >
              <option value="private">Private (mine)</option>
              <option value="public">Public (workspace)</option>
            </select>

            {submitError && (
              <div style={{ color: "red", marginBottom: 8 }}>
                {submitError}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setModalOpen(false)}>Cancel</button>
              <button
                disabled={!newText.trim() || submitting}
                onClick={submitNewClaim}
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
