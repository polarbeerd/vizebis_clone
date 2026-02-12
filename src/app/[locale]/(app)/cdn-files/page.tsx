import { createClient } from "@/lib/supabase/server";
import { CdnFilesClient } from "./cdn-files-client";

export default async function CdnFilesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: files } = await supabase
    .from("cdn_files")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <CdnFilesClient
      userId={user?.id ?? ""}
      userEmail={user?.email ?? ""}
      initialFiles={files ?? []}
    />
  );
}
