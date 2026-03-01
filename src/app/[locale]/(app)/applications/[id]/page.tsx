import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ApplicationDetailPage } from "@/components/applications/application-detail-page";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ApplicationDetailRoute({ params }: Props) {
  const { id } = await params;
  const applicationId = Number(id);

  if (isNaN(applicationId)) {
    redirect("/applications");
    return null;
  }

  const supabase = await createClient();

  const { data: application, error } = await supabase
    .from("applications")
    .select(
      "*"
    )
    .eq("id", applicationId)
    .single();

  if (error || !application) {
    redirect("/applications");
    return null;
  }

  // Fetch active profiles for assignee dropdown
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("is_active", true);

  // Fetch field definitions for custom_fields label lookup
  const { data: fieldDefs } = await supabase
    .from("portal_field_definitions")
    .select("field_key, field_label, field_label_tr");

  // Fetch smart field templates
  const { data: smartTemplates } = await supabase
    .from("portal_smart_field_templates")
    .select("template_key, label, label_tr, sub_fields");

  // Fetch field assignments for ordering/grouping by section
  const country = application.country as string | null;
  const visaType = application.visa_type as string | null;

  let fieldAssignments: Record<string, unknown>[] = [];
  let smartAssignments: Record<string, unknown>[] = [];

  if (country && visaType) {
    const [faRes, saRes] = await Promise.all([
      supabase
        .from("portal_field_assignments")
        .select(
          "sort_order, section, definition:portal_field_definitions(field_key)"
        )
        .eq("country", country)
        .eq("visa_type", visaType)
        .order("sort_order", { ascending: true }),
      supabase
        .from("portal_smart_field_assignments")
        .select("template_key, sort_order, section")
        .eq("country", country)
        .eq("visa_type", visaType)
        .order("sort_order", { ascending: true }),
    ]);
    fieldAssignments = faRes.data ?? [];
    smartAssignments = saRes.data ?? [];
  }

  return (
    <ApplicationDetailPage
      application={application}
      fieldDefs={fieldDefs ?? []}
      smartTemplates={smartTemplates ?? []}
      fieldAssignments={fieldAssignments}
      smartAssignments={smartAssignments}
      profiles={(profiles ?? []) as { id: string; full_name: string }[]}
    />
  );
}
