import { createClient } from "@/lib/supabase/server";
import { PortalFormFieldsClient } from "./portal-form-fields-client";
import type { FieldDefinition } from "@/components/portal-form-fields/field-definition-form";

export interface CountryOption {
  id: number;
  name: string;
  flag_emoji: string | null;
}

export default async function PortalFormFieldsPage() {
  const supabase = await createClient();

  const [definitionsRes, countriesRes] = await Promise.all([
    supabase
      .from("portal_field_definitions")
      .select("*")
      .order("created_at", { ascending: true }),
    supabase
      .from("countries")
      .select("id, name, flag_emoji")
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  const definitions: FieldDefinition[] = (definitionsRes.data ?? []).map(
    (d: Record<string, unknown>) => ({
      id: d.id as number,
      field_key: d.field_key as string,
      field_label: d.field_label as string,
      field_type: d.field_type as string,
      placeholder: d.placeholder as string | null,
      options: d.options as string | null,
      is_standard: d.is_standard as boolean,
      created_at: d.created_at as string | null,
    })
  );

  const countries: CountryOption[] = (countriesRes.data ?? []).map(
    (c: Record<string, unknown>) => ({
      id: c.id as number,
      name: c.name as string,
      flag_emoji: c.flag_emoji as string | null,
    })
  );

  return (
    <PortalFormFieldsClient definitions={definitions} countries={countries} />
  );
}
