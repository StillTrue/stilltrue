import { supabaseServer } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from("claims_with_state")
    .select("id,title,derived_state,next_review_at,latest_reviewed_at")
    .order("next_review_at", { ascending: true })
    .limit(50);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold">StillTrue</h1>
      <p className="mt-3 text-sm text-neutral-600">
        Claims (from <code>public.claims_with_state</code>)
      </p>

      {error ? (
        <div className="mt-10 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm">
          <div className="font-medium">Query failed</div>
          <div className="mt-2 text-neutral-700">
            {error.message}
          </div>
        </div>
      ) : (
        <div className="mt-10 space-y-3">
          {(data ?? []).length === 0 ? (
            <div className="rounded-2xl border p-6 text-sm text-neutral-700">
              No visible claims yet.
            </div>
          ) : (
            (data ?? []).map((c) => (
              <div key={c.id} className="rounded-2xl border p-4">
                <div className="text-sm font-medium">{c.title}</div>
                <div className="mt-1 text-xs text-neutral-600">
                  state: <span className="font-medium">{c.derived_state}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </main>
  );
}
