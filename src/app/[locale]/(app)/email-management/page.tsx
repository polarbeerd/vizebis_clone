import { createClient } from "@/lib/supabase/server";
import { EmailManagementClient } from "./email-management-client";

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_content: string;
  is_active: boolean;
  updated_at: string;
}

export default async function EmailManagementPage() {
  const supabase = await createClient();

  const { data: templates } = await supabase
    .from("email_templates")
    .select("id, name, subject, html_content, is_active, updated_at")
    .order("updated_at", { ascending: false });

  const { data: settingsRows } = await supabase
    .from("settings")
    .select("id, key, value")
    .in("key", ["notification_settings"]);

  const settingsMap: Record<string, Record<string, unknown>> = {};
  for (const s of settingsRows ?? []) {
    const row = s as { key: string; value: Record<string, unknown> };
    settingsMap[row.key] = row.value;
  }

  return (
    <EmailManagementClient
      initialTemplates={(templates as EmailTemplate[]) ?? []}
      notificationSettings={
        (settingsMap["notification_settings"] as Record<string, boolean>) ?? {}
      }
    />
  );
}
