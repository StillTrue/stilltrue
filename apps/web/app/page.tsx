// apps/web/app/page.tsx
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

type WorkspaceRow = {
  workspace_id: string | null;
  workspaces?: {
    id: string;
    name: string | null;
    status?: string | null;
  } | null;
};

export default async function HomePage() {
  const supabase = await createClient();

  // Middleware already gates private routes, but keeping this defensive.
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  // Fetch the workspaces the current user belongs to.
  // Assumption (aligned to Build Plan intent): memberships are represented via `profiles`
  // with a `workspace_id` and a relationship to `workspaces`.
  const { data: memberships, error } = await supabase
    .from("profiles")
    .select("workspace_id, workspaces(id, name, status)")
    .order("created_at", { ascending: true }) as unknown as {
    data: WorkspaceRow[] | null;
    error: { message: string } | null;
  };

  const unique = new Map<string, { id: string; name: string; status?: string | null }>();
  for (const m of memberships ?? []) {
    const ws = m.workspaces ?? null;
    if (!ws?.id) continue;
    unique.set(ws.id, {
      id: ws.id,
      name: (ws.name ?? "Untitled workspace").trim() || "Untitled workspace",
      status: ws.status ?? null,
    });
  }
  const workspaces = Array.from(unique.values());

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/brand/stilltrue-logo.svg"
              alt="StillTrue"
              className="h-8 w-auto"
            />
            <div className="leading-tight">
              <h1 className="text-lg font-semibold text-slate-900">Home</h1>
              <p className="text-sm text-slate-600">
                {user?.email ? `Signed in as ${user.email}` : "Signed in"}
              </p>
            </div>
          </div>

          <Link
            href="/claims"
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50"
          >
            View claims
          </Link>
        </header>

        <section className="mt-10">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Workspaces</h2>
              <p className="mt-1 text-sm text-slate-600">
                Choose a context. Claims will be scoped under a workspace later.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-white shadow-sm">
            {error ? (
              <div className="p-5">
                <p className="text-sm font-medium text-slate-900">Couldn’t load workspaces</p>
                <p className="mt-1 text-sm text-slate-600">
                  {error.message}
                </p>
              </div>
            ) : workspaces.length === 0 ? (
              <div className="p-6">
                <p className="text-sm font-medium text-slate-900">No workspaces yet</p>
                <p className="mt-1 text-sm text-slate-600">
                  This is a valid state. You’ll be able to create or accept an invite later.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {workspaces.map((ws) => (
                  <li key={ws.id} className="flex items-center justify-between p-5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{ws.name}</p>
                      <p className="mt-0.5 text-xs text-slate-600">
                        Workspace
                        {ws.status ? ` • ${ws.status}` : ""}
                      </p>
                    </div>

                    {/* Navigation-only for now; we’ll wire real workspace scoping later */}
                    <span className="rounded-md bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600">
                      Coming soon
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
