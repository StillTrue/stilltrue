// apps/web/app/claims/page.tsx
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AnyRow = Record<string, unknown>;

function pickString(row: AnyRow, keys: string[]): string | null {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "string" && v.trim().length > 0) return v;
  }
  return null;
}

function pickBool(row: AnyRow, keys: string[]): boolean | null {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "boolean") return v;
  }
  return null;
}

function formatVisibility(visibilityRaw: unknown): string {
  const v = typeof visibilityRaw === "string" ? visibilityRaw : null;
  if (v === "private") return "Private";
  if (v === "workspace") return "Workspace";
  return v ?? "—";
}

function isRetired(row: AnyRow): boolean {
  const b = pickBool(row, ["is_retired", "retired"]);
  if (typeof b === "boolean") return b;

  const retiredAt = row["retired_at"];
  if (typeof retiredAt === "string" && retiredAt.trim().length > 0) return true;
  return false;
}

function claimText(row: AnyRow): string {
  return (
    pickString(row, [
      "text",
      "claim_text",
      "claim",
      "claim_text_current",
      "current_text",
      "latest_text",
    ]) ?? "Untitled claim"
  );
}

function ownerName(row: AnyRow): string {
  return (
    pickString(row, [
      "owner_name",
      "owner_display_name",
      "display_name",
      "owner_email",
      "email",
    ]) ?? "—"
  );
}

export default async function ClaimsPage() {
  const supabase = await createSupabaseServerClient();

  // Minimal, member-safe projection only.
  // NOTE: we intentionally do NOT select "id" because the view may not expose it.
  const select =
    "text,claim_text,claim,visibility,retired_at,is_retired,owner_name,owner_display_name,owner_email,email";

  const { data, error } = await supabase
    .from("claims_visible_to_member")
    .select(select);

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

  const rows = (data ?? []) as AnyRow[];

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
            // Use a stable key if we can infer one, otherwise fallback to idx.
            const key =
              pickString(row, ["claim_id", "id", "uuid", "slug", "created_at"]) ??
              String(idx);

            const visibilityRaw = row["visibility"];
            const owner = ownerName(row);
            const text = claimText(row);
            const retired = isRetired(row);

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
                  {owner} · {formatVisibility(visibilityRaw)} ·{" "}
                  {retired ? "Retired" : "Active"}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
