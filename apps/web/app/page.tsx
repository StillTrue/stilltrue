export default function HomePage() {
  return (
    <main>
      <h1>StillTrue</h1>
      <p>Logged in.</p>

      <form action="/auth/logout" method="post">
        <button type="submit">Log out</button>
      </form>
    </main>
  );
}
