"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

export default function ValidationInboxPage() {
  const supabase = createSupabaseBrowserClient();

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

  const [rows, setRows] = useState<ValidationInboxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setLoadError(null);

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
      .order("created_at", { ascending: false });

    if (error) {
      setRows([]);
      setLoadError(error.message || "Failed to load validation requests.");
      setLoading(false);
      return;
    }

    setRows((data || []) as unknown as ValidationInboxRow[]);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openItems = useMemo(() => rows.filter((r) => r.status === "open"), [rows]);
  const closedItems = useMemo(() => rows.filter((r) => r.status === "closed"), [rows]);

  function badgeStyle(kind: "open" | "closed") {
    const base: React.CSSProperties = {
      fontSize: 12,
      fontWeight: 900,
      border: `1px solid ${border}`,
      padding: "6px 10px",
      borderRadius: 999,
      whiteSpace: "nowrap",
    };
    if (kind === "open") return { ...base, color: "#166534", background: "#ecfdf5" };
    return { ...base, color: "#334155", background: "#f1f5f9" };
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
              <div style={{ fontSize: 20, fontWeight: 800, color: text }}>Validation</div>
              <div style={{ fontSize: 13, color: muted }}>Requests addressed to you</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link href="/" style={{ ...pillBase, borderRadius: 8 }}>
              Workspaces
            </Link>

            <button type="button" onClick={() => void load()} style={primaryStyle}>
              Refresh
            </button>
          </div>
        </div>

        {/* Card */}
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
            <div style={{ fontSize: 13, fontWeight: 700, color: muted2 }}>Inbox</div>
            <div style={{ marginTop: 4, fontSize: 13, color: muted, maxWidth: 820 }}>
              This is a fallback view in case you lose the email link. Response UI will be added next.
            </div>
          </div>

          <div style={{ padding: "18px 22px" }}>
            {loading ? (
              <div style={{ fontSize: 13, color: muted }}>Loading…</div>
            ) : loadError ? (
              <div style={{ fontSize: 13, color: "#b91c1c" }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Couldn’t load validation requests</div>
                {loadError}
              </div>
            ) : rows.length === 0 ? (
              <div style={{ fontSize: 13, color: muted }}>No validation requests found.</div>
            ) : (
              <div style={{ display: "grid", gap: 18 }}>
                {/* Open */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 900, color: muted2, textTransform: "uppercase" }}>Open</div>
                  <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                    {openItems.length === 0 ? (
                      <div style={{ fontSize: 13, color: muted }}>No open requests.</div>
                    ) : (
                      openItems.map((r) => {
                        const title = (r.claim_text || "").trim() || "(no claim text)";
                        return (
                          <div
                            key={r.request_id || Math.random()}
                            style={{
                              padding: 14,
                              border: `1px solid ${border}`,
                              borderRadius: 10,
                              background: "#ffffff",
                              display: "grid",
                              gap: 8,
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                              <div style={{ fontSize: 14, fontWeight: 900, color: text, lineHeight: 1.35 }}>{title}</div>
                              <div style={badgeStyle("open")}>Open</div>
                            </div>

                            <div style={{ fontSize: 12, color: muted }}>
                              Kind: {r.kind ? titleCase(r.kind) : "—"} · Attempts: {r.attempt_count ?? 0} · Created{" "}
                              {formatDateTime(r.created_at)}
                            </div>

                            <div style={{ fontSize: 12, color: muted }}>
                              Request ID: <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>{r.request_id || "—"}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Closed */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 900, color: muted2, textTransform: "uppercase" }}>Closed</div>
                  <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                    {closedItems.length === 0 ? (
                      <div style={{ fontSize: 13, color: muted }}>No closed requests.</div>
                    ) : (
                      closedItems.map((r) => {
                        const title = (r.claim_text || "").trim() || "(no claim text)";
                        return (
                          <div
                            key={r.request_id || Math.random()}
                            style={{
                              padding: 14,
                              border: `1px solid ${border}`,
                              borderRadius: 10,
                              background: "#ffffff",
                              display: "grid",
                              gap: 8,
                              opacity: 0.9,
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                              <div style={{ fontSize: 14, fontWeight: 900, color: text, lineHeight: 1.35 }}>{title}</div>
                              <div style={badgeStyle("closed")}>Closed</div>
                            </div>

                            <div style={{ fontSize: 12, color: muted }}>
                              Kind: {r.kind ? titleCase(r.kind) : "—"} · Attempts: {r.attempt_count ?? 0} · Closed{" "}
                              {formatDateTime(r.closed_at)}
                            </div>

                            <div style={{ fontSize: 12, color: muted }}>
                              Request ID: <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>{r.request_id || "—"}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 12, fontSize: 13, color: muted }}>
          Tip: the email link will eventually open directly to a request response screen.
        </div>
      </div>
    </main>
  );
}
