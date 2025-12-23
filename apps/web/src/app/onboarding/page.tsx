import { createWorkspace } from "./actions";

export default function OnboardingPage() {
  return (
    <main style={{ maxWidth: 480, margin: "4rem auto", padding: "0 1rem" }}>
      <h1>Create your workspace</h1>
      <p>
        You need a workspace to start using StillTrue.
      </p>

      <form action={createWorkspace}>
        <label>
          Workspace name
          <input
            name="name"
            placeholder="My Workspace"
            style={{ display: "block", width: "100%", marginTop: 8 }}
          />
        </label>

        <button type="submit" style={{ marginTop: 16 }}>
          Create workspace
        </button>
      </form>
    </main>
  );
}
