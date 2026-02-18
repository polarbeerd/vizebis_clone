import { createClient } from "@/lib/supabase/server";
import { DocumentChecklistsClient } from "./document-checklists-client";

export interface ChecklistRow {
  id: number;
  country: string;
  visa_type: string;
  name: string;
  description: string | null;
  is_required: boolean;
  sort_order: number;
  created_at: string | null;
}

export interface CountryOption {
  id: number;
  name: string;
  flag_emoji: string | null;
}

export interface VisaTypeOption {
  value: string;
  label_en: string;
  label_tr: string;
}

export default async function DocumentChecklistsPage() {
  const supabase = await createClient();

  const [checklistRes, countriesRes, visaTypesRes] = await Promise.all([
    supabase
      .from("document_checklists")
      .select("*")
      .order("sort_order", { ascending: true }),
    supabase
      .from("countries")
      .select("id, name, flag_emoji")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("visa_types")
      .select("value, label_en, label_tr")
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  const checklists: ChecklistRow[] = (checklistRes.data ?? []).map(
    (c: Record<string, unknown>) => ({
      id: c.id as number,
      country: c.country as string,
      visa_type: c.visa_type as string,
      name: c.name as string,
      description: c.description as string | null,
      is_required: c.is_required as boolean,
      sort_order: c.sort_order as number,
      created_at: c.created_at as string | null,
    })
  );

  const countries: CountryOption[] = (countriesRes.data ?? []).map(
    (c: Record<string, unknown>) => ({
      id: c.id as number,
      name: c.name as string,
      flag_emoji: c.flag_emoji as string | null,
    })
  );

  const visaTypes: VisaTypeOption[] = (visaTypesRes.data ?? []).map(
    (v: Record<string, unknown>) => ({
      value: v.value as string,
      label_en: v.label_en as string,
      label_tr: v.label_tr as string,
    })
  );

  return <DocumentChecklistsClient data={checklists} countries={countries} visaTypes={visaTypes} />;
}
