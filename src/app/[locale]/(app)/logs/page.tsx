import { createClient } from "@/lib/supabase/server";
import { LogsClient } from "./logs-client";

export default async function LogsPage() {
  const supabase = await createClient();

  const { data: logs } = await supabase
    .from("activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  return <LogsClient initialLogs={logs ?? []} />;
}
