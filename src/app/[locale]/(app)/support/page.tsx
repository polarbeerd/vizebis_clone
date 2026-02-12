import { createClient } from "@/lib/supabase/server";
import { SupportClient } from "./support-client";

export default async function SupportPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: tickets } = await supabase
    .from("support_tickets")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <SupportClient
      userId={user?.id ?? ""}
      initialTickets={tickets ?? []}
    />
  );
}
