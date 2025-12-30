// apps/web/app/claims/page.tsx
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ClaimRow = {
  claim_id: string | null;
  workspace_id: string | null;
  visibility: string | null;
  owner_profile_id: string | null;
  review_cadence: string | null;
  validation_mode: string | null;
  created_at: string | null;
  retired_at: string | null;
  current_text_version_id: string | null;
  current_text: string | null;
  text_updated_at: string | null;
};

function formatVisibility(v: string | null): string {
  if (v === "private") return "Private";
  if (v === "workspace") return "Workspace";
  return v ?? "—";
}

function isRetired(retiredAt: string | null): boolean {
  return !!(retiredAt && retiredAt.trim().length > 0);
}

export default async function ClaimsPage() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("claims_visible_to_member")
    .select(
      "claim_id,workspace_id,visibility,owner_profile_id,review_cadence,validation_mode,created_at,retired_at,current_text_version_id,current_text,text_updated_at"
    )
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main style={{ padding: 24, maxWidth: 920, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
          Claims
        </h1>
        <p style={{ marginBottom: 16, color: "#6b7280" }}>
          Member-safe list. No claim state or validation outcomes are shown.
        </p>
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 16,
            background: "#fff",
          }}
        >
          <p style={{ fontWeight: 700, margin: 0, marginBottom: 6 }}>
            Query error
          </p>
          <p style={{ margin: 0, color: "#6b7280" }}>{error.message}</p>
        </div>
      </main>
    );
  }

  const rows = (data ?? []) as ClaimRow[];

  return (
    <main style={{ padding: 24, maxWidth: 920, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
            Claims
          </h1>
          <p style={{ color: "#6b7280", marginTop: 0, marginBottom: 18 }}>
            Member-safe list. No claim state or validation outcomes are shown.
          </p>
        </div>

        <Link
          href="/claims/new"
          style={{
            display: "inline-block",
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            textDecoration: "none",
            fontWeight: 600,
            background: "#fff",
          }}
        >
          New claim
        </Link>
      </div>

      {rows.length === 0 ? (
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 16,
            background: "#fff",
          }}
        >
          <p style={{ margin: 0, color: "#6b7280" }}>No claims yet.</p>
        </div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {rows.map((row, idx) => {
            const key = row.claim_id ?? `${idx}`;

            const text = row.current_text ?? "Untitled claim";
            const retired = isRetired(row.retired_at);

            return (
              <li
                key={key}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 14,
                  background: "#fff",
                  marginBottom: 10,
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 6 }}>{text}</div>

                <div style={{ color: "#6b7280", fontSize: 14 }}>
                  {formatVisibility(row.visibility)} ·{" "}
                  {retired ? "Retired" : "Active"}
                </div>

                {/* Intentionally NOT showing claim state, validation outcomes, or anything owner-only. */}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
