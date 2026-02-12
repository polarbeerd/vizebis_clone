import { createClient } from "@/lib/supabase/server";
import { FormsClient } from "./forms-client";

export interface FormRow {
  id: number;
  name: string | null;
  status: string | null;
  access_level: string | null;
  fields: unknown;
  created_by: string | null;
  created_at: string | null;
  submission_count: number;
  pending_count: number;
  completed_count: number;
}

export default async function FormsPage() {
  const supabase = await createClient();

  const { data: forms, error } = await supabase
    .from("forms")
    .select(
      `
      id,
      name,
      status,
      access_level,
      fields,
      created_by,
      created_at,
      form_submissions ( id, status )
    `
    )
    .order("id", { ascending: false });

  if (error) {
    console.error("Error fetching forms:", error);
  }

  const rows: FormRow[] = (forms ?? []).map((f: Record<string, unknown>) => {
    const submissions = Array.isArray(f.form_submissions)
      ? (f.form_submissions as Array<{ id: number; status: string | null }>)
      : [];

    return {
      id: f.id as number,
      name: f.name as string | null,
      status: f.status as string | null,
      access_level: f.access_level as string | null,
      fields: f.fields,
      created_by: f.created_by as string | null,
      created_at: f.created_at as string | null,
      submission_count: submissions.length,
      pending_count: submissions.filter((s) => s.status === "pending").length,
      completed_count: submissions.filter((s) => s.status === "completed")
        .length,
    };
  });

  return <FormsClient data={rows} />;
}
