import { createClient } from "@/lib/supabase/server";
import { AppointmentsClient } from "./appointments-client";

export interface AppointmentRow {
  id: number;
  full_name: string | null;
  passport_no: string | null;
  id_number: string | null;
  date_of_birth: string | null;
  email: string | null;
  passport_expiry: string | null;
  company_name: string | null;
  country: string | null;
  visa_type: string | null;
  travel_date: string | null;
  appointment_date: string | null;
  payment_status: string | null;
  notes: string | null;
  passport_photo: string | null;
}

export default async function AppointmentsPage() {
  const supabase = await createClient();

  const { data: appointments, error } = await supabase
    .from("appointments")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    console.error("Error fetching appointments:", error);
  }

  const rows: AppointmentRow[] = (appointments ?? []).map(
    (a: Record<string, unknown>) => ({
      id: a.id as number,
      full_name: a.full_name as string | null,
      passport_no: a.passport_no as string | null,
      id_number: a.id_number as string | null,
      date_of_birth: a.date_of_birth as string | null,
      email: a.email as string | null,
      passport_expiry: a.passport_expiry as string | null,
      company_name: a.company_name as string | null,
      country: a.country as string | null,
      visa_type: a.visa_type as string | null,
      travel_date: a.travel_date as string | null,
      appointment_date: a.appointment_date as string | null,
      payment_status: a.payment_status as string | null,
      notes: a.notes as string | null,
      passport_photo: a.passport_photo as string | null,
    })
  );

  return <AppointmentsClient data={rows} />;
}
