// apps/web/app/claims/page.tsx
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ColumnRow = {
  column_name: string;
  data_type: string;
  is_nullable: string;
};

export default async function ClaimsPage() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("information_schema.columns")
    .select("column_name,data_type,is_nullable")
    .eq("table_schema", "public")
    .eq("table_name", "claims_visible_to_member")
    .order("ordinal_position", { ascending: true });

  if (error) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Claims – Schema Introspection</h1>
        <pre>{error.message}</pre>
      </main>
    );
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Claims – Schema Introspection</h1>
      <p>
        This page temporarily lists the columns exposed by
        <code> claims_visible_to_member</code>.
      </p>

      <pre
        style={{
          marginTop: 16,
          padding: 16,
          background: "#111",
          color: "#0f0",
          borderRadius: 8,
          overflowX: "auto",
        }}
      >
        {JSON.stringify(data as ColumnRow[], null, 2)}
      </pre>
    </main>
  );
}
