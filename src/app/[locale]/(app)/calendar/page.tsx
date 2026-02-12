import { createClient } from "@/lib/supabase/server";
import { CalendarClient } from "./calendar-client";

export interface CalendarAppointment {
  id: number;
  full_name: string | null;
  country: string | null;
  appointment_date: string | null;
}

export default async function CalendarPage() {
  const supabase = await createClient();

  // Fetch all appointments that have an appointment_date
  // The client-side will handle month filtering for navigation
  const { data: appointments, error } = await supabase
    .from("appointments")
    .select("id, full_name, country, appointment_date")
    .not("appointment_date", "is", null)
    .order("appointment_date", { ascending: true });

  if (error) {
    console.error("Error fetching calendar appointments:", error);
  }

  const rows: CalendarAppointment[] = (appointments ?? []).map(
    (a: Record<string, unknown>) => ({
      id: a.id as number,
      full_name: a.full_name as string | null,
      country: a.country as string | null,
      appointment_date: a.appointment_date as string | null,
    })
  );

  return <CalendarClient appointments={rows} />;
}
