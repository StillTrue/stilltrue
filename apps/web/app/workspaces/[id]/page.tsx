// apps/web/app/workspaces/[id]/page.tsx
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function WorkspacePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pageBg = "#f3f4f6";
  const cardBg = "#ffffff";
  const border = "#e5e7eb";
  const text = "#111827";
  const muted = "#6b7280";

  return (
    <main
      style={{
        minHeight: "100vh",
        background: pageBg,
        padding: "40px 16px",
      }}
    >
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div
          style={{
            background: cardBg,
            borderRadius: 12,
            boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
            border: `1px solid ${border}`,
            padding: 24,
          }}
        >
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: text }}>
              Workspace
            </div>
            <div style={{ fontSize: 13, color: muted }}>
              ID: {params.id}
            </div>
          </div>

          <div style={{ fontSize: 14, color: muted, lineHeight: 1.5 }}>
            This workspace shell exists to establish navigation and structure.
            <br />
            Claims, members, and settings will be added later.
          </div>

          <div style={{ marginTop: 16, fontSize: 13, color: muted }}>
            Signed in as {user?.email}
          </div>
        </div>
      </div>
    </main>
  );
}
