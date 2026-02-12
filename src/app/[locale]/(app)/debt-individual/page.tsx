import { createClient } from "@/lib/supabase/server";
import { DebtIndividualClient } from "./debt-individual-client";

export interface DebtIndividualRow {
  id: number;
  full_name: string | null;
  phone: string | null;
  passport_no: string | null;
  company_name: string | null;
  country: string | null;
  appointment_date: string | null;
  pickup_date: string | null;
  consulate_fee: number | null;
  service_fee: number | null;
  currency: string | null;
  invoice_status: string | null;
  payment_status: string | null;
  visa_status: string | null;
  notes: string | null;
  passport_photo: string | null;
  visa_photo: string | null;
}

export default async function DebtIndividualPage() {
  const supabase = await createClient();

  let rows: DebtIndividualRow[] = [];

  try {
    const { data, error } = await supabase
      .from("applications")
      .select(
        `
        id,
        full_name,
        phone,
        passport_no,
        country,
        appointment_date,
        pickup_date,
        consulate_fee,
        service_fee,
        currency,
        invoice_status,
        payment_status,
        visa_status,
        notes,
        passport_photo,
        visa_photo,
        companies ( company_name )
      `
      )
      .eq("is_deleted", false)
      .eq("payment_status", "odenmedi")
      .order("id", { ascending: false });

    if (error) {
      console.error("Error fetching individual debt:", error);
    }

    rows = (data ?? []).map((app: Record<string, unknown>) => ({
      id: app.id as number,
      full_name: app.full_name as string | null,
      phone: app.phone as string | null,
      passport_no: app.passport_no as string | null,
      company_name:
        (app.companies as { company_name: string } | null)?.company_name ??
        null,
      country: app.country as string | null,
      appointment_date: app.appointment_date as string | null,
      pickup_date: app.pickup_date as string | null,
      consulate_fee: app.consulate_fee as number | null,
      service_fee: app.service_fee as number | null,
      currency: app.currency as string | null,
      invoice_status: app.invoice_status as string | null,
      payment_status: app.payment_status as string | null,
      visa_status: app.visa_status as string | null,
      notes: app.notes as string | null,
      passport_photo: app.passport_photo as string | null,
      visa_photo: app.visa_photo as string | null,
    }));
  } catch (error) {
    console.error("Error fetching individual debt:", error);
  }

  return <DebtIndividualClient data={rows} />;
}
