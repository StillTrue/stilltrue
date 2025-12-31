// apps/web/app/workspaces/[id]/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function WorkspaceClaimsPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);

    const { error } = await supabase.rpc("create_claim_with_text", {
      _workspace_id: params.id,
      _visibility: visibility,
      _review_cadence: "monthly",
      _validation_mode: "any",
      _text: text,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setOpen(false);
    setText("");
    router.refresh();
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        padding: "40px 16px",
      }}
    >
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827" }}>
            Workspace
          </h1>

          <button
            onClick={() => setOpen(true)}
            style={{
              padding: "10px 14px",
              borderRadius: 6,
              border: "none",
              background: "#5b7fa6",
              color: "#ffffff",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            + New claim
          </button>
        </div>

        <div style={{ color: "#6b7280", fontSize: 14 }}>
          Create a claim to begin testing filters and ownership behaviour.
        </div>
      </div>

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            style={{
              width: 480,
              background: "#ffffff",
              borderRadius: 12,
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              padding: 24,
            }}
          >
            <h2
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "#111827",
                marginBottom: 14,
              }}
            >
              New claim
            </h2>

            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "#374151",
                marginBottom: 6,
              }}
            >
              Claim text
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 6,
                border: "1px solid #d1d5db",
                fontSize: 14,
                marginBottom: 14,
              }}
            />

            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "#374151",
                marginBottom: 6,
              }}
            >
              Visibility
            </label>
            <select
              value={visibility}
              onChange={(e) =>
                setVisibility(e.target.value as "private" | "public")
              }
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 6,
                border: "1px solid #d1d5db",
                fontSize: 14,
                marginBottom: 16,
              }}
            >
              <option value="private">Private (mine)</option>
              <option value="public">Public (workspace)</option>
            </select>

            {error && (
              <div
                style={{
                  marginBottom: 12,
                  fontSize: 13,
                  color: "#b91c1c",
                }}
              >
                {error}
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >
              <button
                onClick={() => setOpen(false)}
                disabled={loading}
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
                onClick={submit}
                disabled={loading || !text.trim()}
                style={{
                  padding: "8px 14px",
                  borderRadius: 6,
                  border: "none",
                  background: "#5b7fa6",
                  color: "#ffffff",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {loading ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
