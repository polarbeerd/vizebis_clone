import { createClient } from "@/lib/supabase/server";
import { NotificationsClient } from "./notifications-client";

export default async function NotificationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user?.id ?? "")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <NotificationsClient
      userId={user?.id ?? ""}
      initialNotifications={notifications ?? []}
    />
  );
}
