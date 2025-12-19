export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold">StillTrue</h1>
      <p className="mt-3 text-sm text-neutral-600">
        The system exists to ask: <span className="font-medium">“Is this still true?”</span>
      </p>

      <div className="mt-10 rounded-2xl border p-6">
        <p className="text-sm text-neutral-700">
          Claims list will live here (from <code>public.claims_with_state</code>).
        </p>
      </div>
    </main>
  );
}
