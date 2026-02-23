import { createClient } from "@/lib/supabase/server";
import { CountriesClient } from "./countries-client";

export interface CountryRow {
  id: number;
  name: string;
  flag_emoji: string | null;
  is_active: boolean;
  sort_order: number;
  service_fee: number;
  consulate_fee: number;
  currency: string;
}

export default async function CountriesPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("countries")
    .select("id, name, flag_emoji, is_active, sort_order, service_fee, consulate_fee, currency")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching countries:", error);
  }

  const rows: CountryRow[] = (data ?? []).map((c: Record<string, unknown>) => ({
    id: c.id as number,
    name: c.name as string,
    flag_emoji: c.flag_emoji as string | null,
    is_active: c.is_active as boolean,
    sort_order: c.sort_order as number,
    service_fee: Number(c.service_fee) || 0,
    consulate_fee: Number(c.consulate_fee) || 0,
    currency: (c.currency as string) || "EUR",
  }));

  return <CountriesClient data={rows} />;
}
