"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type ValidationInboxRow = {
  request_id: string | null;
  claim_id: string | null;
  claim_text_version_id: string | null;
  kind: "scheduled" | "manual" | null;
  status: "open" | "closed" | null;
  attempt_count: number | null;
  created_at: string | null;
  closed_at: string | null;

  workspace_id: string | null;
  visibility: string | null;
  owner_profile_id: string | null;
  claim_text: string | null;
};

type Answer = "yes" | "unsure" | "no";

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function titleCase(s: string) {
  if (!s) return s;
  return s.slice(0, 1).toUpperCase() + s.slice(1);
}

export default function ValidationRequestPage() {
  const supabase = createSupabaseBrowserClient();
  const params = useParams();
  const requestId = (params?.id as string | undefined) || undefined;

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

  const [authChecked, setAuthChecked] = useState(false);
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);

  const [row, setRow] = useState<ValidationInboxRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [context, setContext] = useState("");
  const [submitting, setSubmitting] = useState<Answer | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function load() {
    if (!requestId) return;

    setLoading(true);
    setLoadError(null);
    setSubmitted(false);
    setSubmitError(null);

    // Helpful top-line identity (not security critical; RLS is)
    const { data: userData } = await supabase.auth.getUser();
    const email = userData?.user?.email ?? null;
    setSignedInEmail(email);
    setAuthChecked(true);

    const { data, error } = await supabase
      .from("validation_requests_for_me")
      .select(
        [
          "request_id",
          "claim_id",
          "claim_text_version_id",
          "kind",
          "status",
          "attempt_count",
          "created_at",
          "closed_at",
          "workspace_id",
          "visibility",
          "owner_profile_id",
          "claim_text",
        ].join(",")
      )
      .eq("request_id", requestId)
      .limit(1);

    if (error) {
      setRow(null);
      setLoadError(error.message || "Failed to load validation request.");
      setLoading(false);
      return;
    }

    const first = (data && data.length > 0 ? (data[0] as unknown as ValidationInboxRow) : null) || null;
    if (!first) {
      setRow(null);
      setLoadError("This validation request was not found, or you are not a recipient.");
      setLoading(false);
      return;
    }

    setRow(first);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  const isOpen = row?.status === "open";
  const kindLabel = row?.kind ? titleCase(row.kind) : "—";
  const claimText = useMemo(() => (row?.claim_text || "").trim(), [row]);

  async function submit(answer: Answer) {
    if (!requestId) return;
    if (!isOpen) return;
    if (submitting) return;

    setSubmitting(answer);
    setSubmitError(null);

    try {
      const trimmedContext = context.trim();
      const { error } = await supabase.rpc("submit_validation_response", {
        _request_id: requestId,
        _answer: answer,
        _context: trimmedContext.length ? trimmedContext : null,
      });

      if (error) {
        const msg = error.message || "Failed to submit response.";
        setSubmitError(msg);
        return;
      }

      setSubmitted(true);
      await load(); // refresh status (may close if last responder)
    } finally {
      setSubmitting(null);
    }
  }

  if (!requestId) {
    return (
      <main style={{ minHeight: "100vh", background: pageBg, padding: "40px 16px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", color: text }}>
          <strong>Validation request ID missing from route</strong>
        </div>
      </main>
    );
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
              <div style={{ fontSize: 20, fontWeight: 800, color: text }}>Validation request</div>
              <div style={{ fontSize: 13, color: muted }}>
                {authChecked ? (signedInEmail ? `Signed in as ${signedInEmail}` : "Not signed in") : "Checking sign-in…"}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link href="/validation" style={{ ...pillBase, borderRadius: 8 }}>
              Inbox
            </Link>
            <Link href="/" style={{ ...pillBase, borderRadius: 8 }}>
              Workspaces
            </Link>
            <button type="button" onClick={() => void load()} style={primaryStyle}>
              Refresh
            </button>
          </div>
        </div>

        <div
          style={{
            background: cardBg,
            borderRadius: 12,
            boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
            overflow: "hidden",
            border: `1px solid ${border}`,
          }}
        >
          <div style={{ padding: "16px 22px", borderBottom: `1px solid ${border}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: muted2 }}>Request</div>
            <div style={{ marginTop: 4, fontSize: 13, color: muted, maxWidth: 900 }}>
              Your response is a signal only. Silence is not treated as “yes”. You can respond once.
            </div>
          </div>

          <div style={{ padding: "18px 22px", display: "grid", gap: 14 }}>
            {loading ? (
              <div style={{ fontSize: 13, color: muted }}>Loading…</div>
            ) : loadError ? (
              <div style={{ fontSize: 13, color: "#b91c1c" }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Couldn’t load request</div>
                {loadError}
                {!signedInEmail ? (
                  <div style={{ marginTop: 10 }}>
                    <Link href="/login" style={{ ...pillBase, borderRadius: 8 }}>
                      Go to login
                    </Link>
                  </div>
                ) : null}
              </div>
            ) : !row ? (
              <div style={{ fontSize: 13, color: muted }}>No request.</div>
            ) : (
              <>
                {/* Claim text */}
                <div style={{ border: `1px solid ${border}`, borderRadius: 12, padding: 14, background: "#ffffff" }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 900,
                      color: muted2,
                      marginBottom: 10,
                      textTransform: "uppercase",
                    }}
                  >
                    Claim wording
                  </div>
                  <div style={{ fontSize: 14, color: text, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                    {claimText.length ? claimText : "(no text)"}
                  </div>
                </div>

                {/* Metadata */}
                <div style={{ border: `1px solid ${border}`, borderRadius: 12, padding: 14, background: "#ffffff" }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 900,
                      color: muted2,
                      marginBottom: 10,
                      textTransform: "uppercase",
                    }}
                  >
                    Details
                  </div>
                  <div style={{ fontSize: 13, color: muted, lineHeight: 1.7 }}>
                    <div>
                      Status: <strong style={{ color: text }}>{row.status ? titleCase(row.status) : "—"}</strong>
                    </div>
                    <div>
                      Kind: <strong style={{ color: text }}>{kindLabel}</strong>
                    </div>
                    <div>
                      Created: <strong style={{ color: text }}>{formatDateTime(row.created_at)}</strong>
                    </div>
                    {row.status === "closed" ? (
                      <div>
                        Closed: <strong style={{ color: text }}>{formatDateTime(row.closed_at)}</strong>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Response */}
                <div style={{ border: `1px solid ${border}`, borderRadius: 12, padding: 14, background: "#ffffff" }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 900,
                      color: muted2,
                      marginBottom: 10,
                      textTransform: "uppercase",
                    }}
                  >
                    Your response
                  </div>

                  {!isOpen ? (
                    <div style={{ fontSize: 13, color: muted }}>
                      This request is closed. If you already responded, nothing more is required.
                    </div>
                  ) : submitted ? (
                    <div style={{ fontSize: 13, color: "#166534", fontWeight: 800 }}>
                      Thanks — your response has been recorded.
                    </div>
                  ) : (
                    <>
                      <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: muted2, marginBottom: 6 }}>
                        Optional context
                      </label>
                      <textarea
                        value={context}
                        onChange={(e) => setContext(e.target.value)}
                        rows={4}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: 8,
                          border: `1px solid ${border}`,
                          fontSize: 14,
                          background: "#ffffff",
                          color: text,
                          outline: "none",
                          resize: "vertical",
                        }}
                        placeholder="If you choose, briefly explain your answer."
                      />

                      {submitError ? <div style={{ marginTop: 10, fontSize: 13, color: "#b91c1c" }}>{submitError}</div> : null}

                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                        <button
                          type="button"
                          onClick={() => void submit("yes")}
                          disabled={!!submitting}
                          style={{
                            ...primaryStyle,
                            background: buttonBlue,
                            opacity: submitting ? 0.7 : 1,
                          }}
                        >
                          {submitting === "yes" ? "Submitting…" : "Yes"}
                        </button>

                        <button
                          type="button"
                          onClick={() => void submit("unsure")}
                          disabled={!!submitting}
                          style={{
                            ...pillBase,
                            borderRadius: 8,
                            padding: "10px 14px",
                            fontWeight: 900,
                            opacity: submitting ? 0.7 : 1,
                          }}
                        >
                          {submitting === "unsure" ? "Submitting…" : "Unsure"}
                        </button>

                        <button
                          type="button"
                          onClick={() => void submit("no")}
                          disabled={!!submitting}
                          style={{
                            ...pillBase,
                            borderRadius: 8,
                            padding: "10px 14px",
                            fontWeight: 900,
                            borderColor: "#fecaca",
                            color: "#b91c1c",
                            opacity: submitting ? 0.7 : 1,
                          }}
                        >
                          {submitting === "no" ? "Submitting…" : "No"}
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <div style={{ fontSize: 12, color: muted }}>
                  Request ID:{" "}
                  <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>{row.request_id}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
