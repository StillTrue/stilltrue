"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "../../lib/supabase/server";

export async function createWorkspace(formData: FormData) {
  const supabase = await supabaseServer();

  const name = String(formData.get("name") || "");

  const { error } = await supabase.rpc("bootstrap_workspace", {
    workspace_name: name,
  });

  if (error) {
    throw new Error(error.message);
  }

  redirect("/");
}
