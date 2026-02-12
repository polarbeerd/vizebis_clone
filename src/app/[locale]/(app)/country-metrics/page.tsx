import { createClient } from "@/lib/supabase/server";
import { CountryMetricsClient } from "./country-metrics-client";

export interface ApplicationForMetrics {
  country: string | null;
  visa_type: string | null;
  visa_status: string | null;
  appointment_date: string | null;
}

export default async function CountryMetricsPage() {
  const supabase = await createClient();

  let applications: ApplicationForMetrics[] = [];

  try {
    const { data, error } = await supabase
      .from("applications")
      .select("country, visa_type, visa_status, appointment_date")
      .eq("is_deleted", false);

    if (error) {
      console.error("Error fetching country metrics:", error);
    }

    applications = (data ?? []).map((app) => ({
      country: app.country as string | null,
      visa_type: app.visa_type as string | null,
      visa_status: app.visa_status as string | null,
      appointment_date: app.appointment_date as string | null,
    }));
  } catch (error) {
    console.error("Error fetching country metrics:", error);
  }

  return <CountryMetricsClient applications={applications} />;
}
