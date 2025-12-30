import { redirect } from "next/navigation";

export default function HomePage() {
  // Temporary gate: until session check middleware is added,
  // always send users to login.
  redirect("/login");
}
