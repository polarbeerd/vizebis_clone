import { createClient } from "@/lib/supabase/server";
import { TagsClient } from "./tags-client";

export interface TagRow {
  id: number;
  name: string | null;
  color: string | null;
  created_at: string | null;
}

export default async function TagsPage() {
  const supabase = await createClient();

  const { data: tags, error } = await supabase
    .from("tags")
    .select("id, name, color, created_at")
    .order("id", { ascending: false });

  if (error) {
    console.error("Error fetching tags:", error);
  }

  const rows: TagRow[] = (tags ?? []).map((t: Record<string, unknown>) => ({
    id: t.id as number,
    name: t.name as string | null,
    color: t.color as string | null,
    created_at: t.created_at as string | null,
  }));

  return <TagsClient data={rows} />;
}
