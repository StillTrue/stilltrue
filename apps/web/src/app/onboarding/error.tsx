"use client";

export default function OnboardingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main style={{ maxWidth: 720, margin: "4rem auto", padding: "0 1rem" }}>
      <h1>Onboarding failed</h1>
      <p>
        A server error occurred while creating your workspace. The exact error is
        below.
      </p>

      <pre
        style={{
          whiteSpace: "pre-wrap",
          padding: "1rem",
          border: "1px solid #ddd",
          borderRadius: 8,
          marginTop: 16,
        }}
      >
        {error.message}
        {error.digest ? `\n\nDigest: ${error.digest}` : ""}
      </pre>

      <button type="button" onClick={() => reset()} style={{ marginTop: 16 }}>
        Try again
      </button>
    </main>
  );
}
