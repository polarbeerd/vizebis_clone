import { createClient } from "@/lib/supabase/server";
import { CountryReportsClient } from "./country-reports-client";

export interface CountryReportRow {
  id: number;
  full_name: string | null;
  phone: string | null;
  passport_no: string | null;
  company_name: string | null;
  country: string | null;
  appointment_date: string | null;
  payment_status: string | null;
}

export default async function CountryReportsPage() {
  const supabase = await createClient();

  let rows: CountryReportRow[] = [];
  let countries: string[] = [];

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
        payment_status,
        companies ( company_name )
      `
      )
      .eq("is_deleted", false)
      .order("id", { ascending: false });

    if (error) {
      console.error("Error fetching country reports:", error);
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
      payment_status: app.payment_status as string | null,
    }));

    // Extract unique countries
    const countrySet = new Set<string>();
    for (const row of rows) {
      if (row.country) countrySet.add(row.country);
    }
    countries = Array.from(countrySet).sort();
  } catch (error) {
    console.error("Error fetching country reports:", error);
  }

  return <CountryReportsClient data={rows} countries={countries} />;
}
