import { createClient } from "@/lib/supabase/server";
import { DocumentsClient } from "./documents-client";

export interface DocumentRow {
  id: number;
  name: string | null;
  description: string | null;
  html_content: string | null;
  document_type: string | null;
  category: string | null;
  status: string | null;
  priority: string | null;
  access_level: string | null;
  tags: string | null;
  view_count: number;
  updated_at: string | null;
}

export default async function DocumentsPage() {
  const supabase = await createClient();

  const { data: documents, error } = await supabase
    .from("documents")
    .select(
      `
      id,
      name,
      description,
      html_content,
      document_type,
      category,
      status,
      priority,
      access_level,
      tags,
      view_count,
      updated_at
    `
    )
    .order("id", { ascending: false });

  if (error) {
    console.error("Error fetching documents:", error);
  }

  const rows: DocumentRow[] = (documents ?? []).map(
    (d: Record<string, unknown>) => ({
      id: d.id as number,
      name: d.name as string | null,
      description: d.description as string | null,
      html_content: d.html_content as string | null,
      document_type: d.document_type as string | null,
      category: d.category as string | null,
      status: d.status as string | null,
      priority: d.priority as string | null,
      access_level: d.access_level as string | null,
      tags: d.tags as string | null,
      view_count: (d.view_count as number) ?? 0,
      updated_at: d.updated_at as string | null,
    })
  );

  // Extract unique categories for filter
  const categories = Array.from(
    new Set(rows.map((r) => r.category).filter(Boolean))
  ) as string[];

  return <DocumentsClient data={rows} categories={categories} />;
}
