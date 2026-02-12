import { createClient } from "@/lib/supabase/server";
import { SettingsClient } from "./settings-client";

export interface SettingsRow {
  id: number;
  key: string;
  value: Record<string, unknown>;
}

export interface ProfileRow {
  id: string;
  username: string | null;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  role: string | null;
  telegram_id: string | null;
  permissions: Record<string, boolean> | null;
  created_at: string | null;
}

export default async function SettingsPage() {
  const supabase = await createClient();

  // Fetch all settings
  const { data: settings, error: settingsError } = await supabase
    .from("settings")
    .select("id, key, value");

  if (settingsError) {
    console.error("Error fetching settings:", settingsError);
  }

  // Fetch all users/profiles
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, username, full_name, phone, email, role, telegram_id, permissions, created_at")
    .order("created_at", { ascending: false });

  if (profilesError) {
    console.error("Error fetching profiles:", profilesError);
  }

  // Convert settings array to a map for easier access
  const settingsMap: Record<string, Record<string, unknown>> = {};
  for (const s of settings ?? []) {
    const row = s as unknown as SettingsRow;
    settingsMap[row.key] = row.value;
  }

  const users: ProfileRow[] = (profiles ?? []).map((p: Record<string, unknown>) => ({
    id: p.id as string,
    username: p.username as string | null,
    full_name: p.full_name as string | null,
    phone: p.phone as string | null,
    email: p.email as string | null,
    role: p.role as string | null,
    telegram_id: p.telegram_id as string | null,
    permissions: p.permissions as Record<string, boolean> | null,
    created_at: p.created_at as string | null,
  }));

  return (
    <SettingsClient
      settingsMap={settingsMap}
      users={users}
    />
  );
}
