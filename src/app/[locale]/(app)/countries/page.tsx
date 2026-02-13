import { createClient } from "@/lib/supabase/server";
import { CountriesClient } from "./countries-client";

export interface CountryRow {
  id: number;
  name: string;
  flag_emoji: string | null;
  is_active: boolean;
  sort_order: number;
}

export default async function CountriesPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("countries")
    .select("id, name, flag_emoji, is_active, sort_order")
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
  }));

  return <CountriesClient data={rows} />;
}
