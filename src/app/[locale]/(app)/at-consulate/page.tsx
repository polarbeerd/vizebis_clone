import { createClient } from "@/lib/supabase/server";
import { AtConsulateClient } from "./at-consulate-client";

export interface AtConsulateRow {
  id: number;
  full_name: string | null;
  phone: string | null;
  passport_no: string | null;
  consulate_app_no: string | null;
  company_name: string | null;
  country: string | null;
}

export default async function AtConsulatePage() {
  const supabase = await createClient();

  let rows: AtConsulateRow[] = [];

  try {
    const { data, error } = await supabase
      .from("applications")
      .select(
        `
        id,
        full_name,
        phone,
        passport_no,
        consulate_app_no,
        country,
        companies ( company_name )
      `
      )
      .eq("is_deleted", false)
      .eq("visa_status", "konsoloslukta")
      .order("id", { ascending: false });

    if (error) {
      console.error("Error fetching at-consulate data:", error);
    }

    rows = (data ?? []).map((app: Record<string, unknown>) => ({
      id: app.id as number,
      full_name: app.full_name as string | null,
      phone: app.phone as string | null,
      passport_no: app.passport_no as string | null,
      consulate_app_no: app.consulate_app_no as string | null,
      company_name:
        (app.companies as { company_name: string } | null)?.company_name ??
        null,
      country: app.country as string | null,
    }));
  } catch (error) {
    console.error("Error fetching at-consulate data:", error);
  }

  return <AtConsulateClient data={rows} />;
}
