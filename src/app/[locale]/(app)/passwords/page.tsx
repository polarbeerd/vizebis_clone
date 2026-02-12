import { createClient } from "@/lib/supabase/server";
import { PasswordsClient } from "./passwords-client";

export interface PasswordCategory {
  id: string;
  name: string;
  created_at: string;
}

export interface PasswordEntry {
  id: string;
  category_id: string | null;
  title: string;
  application_id: string | null;
  username: string;
  password: string;
  url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApplicationOption {
  id: string;
  full_name: string;
}

export default async function PasswordsPage() {
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("password_categories")
    .select("id, name, created_at")
    .order("name", { ascending: true });

  const { data: passwords } = await supabase
    .from("passwords")
    .select("id, category_id, title, application_id, username, password, url, notes, created_at, updated_at")
    .order("updated_at", { ascending: false });

  const { data: applications } = await supabase
    .from("applications")
    .select("id, full_name")
    .eq("is_deleted", false)
    .order("full_name", { ascending: true })
    .limit(200);

  return (
    <PasswordsClient
      initialCategories={(categories as PasswordCategory[]) ?? []}
      initialPasswords={(passwords as PasswordEntry[]) ?? []}
      applicationOptions={(applications as ApplicationOption[]) ?? []}
    />
  );
}
