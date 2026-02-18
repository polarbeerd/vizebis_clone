import { createClient } from "@/lib/supabase/server";
import { PortalFormFieldsClient } from "./portal-form-fields-client";
import type { FieldDefinition } from "@/components/portal-form-fields/field-definition-form";
import type { SmartTemplate } from "@/components/portal-form-fields/field-assignment-view";

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

export default async function PortalFormFieldsPage() {
  const supabase = await createClient();

  const [definitionsRes, countriesRes, smartTemplatesRes, visaTypesRes] = await Promise.all([
    supabase
      .from("portal_field_definitions")
      .select("*")
      .order("created_at", { ascending: true }),
    supabase
      .from("countries")
      .select("id, name, flag_emoji")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("portal_smart_field_templates")
      .select("id, template_key, label, label_tr, description, description_tr, sub_fields")
      .order("id", { ascending: true }),
    supabase
      .from("visa_types")
      .select("value, label_en, label_tr")
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  const definitions: FieldDefinition[] = (definitionsRes.data ?? []).map(
    (d: Record<string, unknown>) => ({
      id: d.id as number,
      field_key: d.field_key as string,
      field_label: d.field_label as string,
      field_label_tr: (d.field_label_tr as string) ?? null,
      field_type: d.field_type as string,
      placeholder: d.placeholder as string | null,
      placeholder_tr: (d.placeholder_tr as string) ?? null,
      options: d.options as string | null,
      options_tr: (d.options_tr as string) ?? null,
      max_chars: d.max_chars as number | null,
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

  const smartTemplates: SmartTemplate[] = (smartTemplatesRes.data ?? []).map(
    (t: Record<string, unknown>) => ({
      id: t.id as number,
      template_key: t.template_key as string,
      label: t.label as string,
      label_tr: (t.label_tr as string) ?? "",
      description: (t.description as string) ?? "",
      description_tr: (t.description_tr as string) ?? "",
      sub_fields: (t.sub_fields as Array<{ key: string; label: string; label_tr: string }>) ?? [],
    })
  );

  const visaTypes: VisaTypeOption[] = (visaTypesRes.data ?? []).map(
    (v: Record<string, unknown>) => ({
      value: v.value as string,
      label_en: v.label_en as string,
      label_tr: v.label_tr as string,
    })
  );

  return (
    <PortalFormFieldsClient
      definitions={definitions}
      countries={countries}
      smartTemplates={smartTemplates}
      visaTypes={visaTypes}
    />
  );
}
