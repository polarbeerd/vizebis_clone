import { createClient } from "@/lib/supabase/server";
import { ApplicationsClient } from "./applications-client";

export interface ApplicationRow {
  id: number;
  full_name: string | null;
  passport_no: string | null;
  country: string | null;
  appointment_date: string | null;
  pickup_date: string | null;
  phone: string | null;
  consulate_fee: number | null;
  service_fee: number | null;
  currency: string | null;
  invoice_status: string | null;
  payment_status: string | null;
  visa_status: string | null;
  notes: string | null;
  company_name: string | null;
  tracking_code: string | null;
  source: string | null;
  group_id: number | null;
  doc_total: number;
  doc_completed: number;
}

export default async function ApplicationsPage() {
  const supabase = await createClient();

  const { data: applications, error } = await supabase
    .from("applications")
    .select(
      `
      id,
      full_name,
      passport_no,
      country,
      appointment_date,
      pickup_date,
      phone,
      consulate_fee,
      service_fee,
      currency,
      invoice_status,
      payment_status,
      visa_status,
      notes,
      tracking_code,
      source,
      group_id,
      companies ( company_name )
    `
    )
    .eq("is_deleted", false)
    .order("id", { ascending: false });

  // Fetch document progress counts per application
  const { data: docCounts } = await supabase
    .from("application_documents")
    .select("application_id, status");

  // Build a map of application_id -> { total, completed }
  const docMap = new Map<number, { total: number; completed: number }>();
  if (docCounts) {
    for (const row of docCounts as Array<{ application_id: number; status: string }>) {
      const entry = docMap.get(row.application_id) || { total: 0, completed: 0 };
      entry.total++;
      if (row.status === "uploaded" || row.status === "approved") {
        entry.completed++;
      }
      docMap.set(row.application_id, entry);
    }
  }

  // Flatten the company name from the joined relation
  const rows: ApplicationRow[] = (applications ?? []).map((app: Record<string, unknown>) => ({
    id: app.id as number,
    full_name: app.full_name as string | null,
    passport_no: app.passport_no as string | null,
    country: app.country as string | null,
    appointment_date: app.appointment_date as string | null,
    pickup_date: app.pickup_date as string | null,
    phone: app.phone as string | null,
    consulate_fee: app.consulate_fee as number | null,
    service_fee: app.service_fee as number | null,
    currency: app.currency as string | null,
    invoice_status: app.invoice_status as string | null,
    payment_status: app.payment_status as string | null,
    visa_status: app.visa_status as string | null,
    notes: app.notes as string | null,
    company_name: (app.companies as { company_name: string } | null)?.company_name ?? null,
    tracking_code: app.tracking_code as string | null,
    source: app.source as string | null,
    group_id: app.group_id as number | null,
    doc_total: docMap.get(app.id as number)?.total ?? 0,
    doc_completed: docMap.get(app.id as number)?.completed ?? 0,
  }));

  if (error) {
    console.error("Error fetching applications:", error);
  }

  return <ApplicationsClient data={rows} />;
}
