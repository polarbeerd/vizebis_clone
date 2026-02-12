import { createClient } from "@/lib/supabase/server";
import { SecurityClient } from "./security-client";

export default async function SecurityPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, phone")
    .eq("id", user?.id ?? "")
    .single();

  const { data: settingsRows } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["two_factor_settings"]);

  const settingsMap: Record<string, Record<string, unknown>> = {};
  for (const s of settingsRows ?? []) {
    const row = s as { key: string; value: Record<string, unknown> };
    settingsMap[row.key] = row.value;
  }

  return (
    <SecurityClient
      userEmail={profile?.email ?? user?.email ?? ""}
      userPhone={(profile?.phone as string) ?? ""}
      twoFactorSettings={
        (settingsMap["two_factor_settings"] as Record<string, unknown>) ?? {}
      }
    />
  );
}
