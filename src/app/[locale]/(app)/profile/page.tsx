import { createClient } from "@/lib/supabase/server";
import { ProfileClient } from "./profile-client";

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, phone")
    .eq("id", user?.id ?? "")
    .single();

  return (
    <ProfileClient
      userId={user?.id ?? ""}
      initialFullName={profile?.full_name ?? user?.user_metadata?.full_name ?? ""}
      initialEmail={profile?.email ?? user?.email ?? ""}
      initialPhone={(profile?.phone as string) ?? ""}
    />
  );
}
