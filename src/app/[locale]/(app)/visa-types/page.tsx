import { createClient } from "@/lib/supabase/server";
import { VisaTypesClient } from "./visa-types-client";

export interface VisaTypeRow {
  id: number;
  value: string;
  label_en: string;
  label_tr: string;
  is_active: boolean;
  sort_order: number;
}

export default async function VisaTypesPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("visa_types")
    .select("id, value, label_en, label_tr, is_active, sort_order")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching visa types:", error);
  }

  const rows: VisaTypeRow[] = (data ?? []).map((v: Record<string, unknown>) => ({
    id: v.id as number,
    value: v.value as string,
    label_en: v.label_en as string,
    label_tr: v.label_tr as string,
    is_active: v.is_active as boolean,
    sort_order: v.sort_order as number,
  }));

  return <VisaTypesClient data={rows} />;
}
