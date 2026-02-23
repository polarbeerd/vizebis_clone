import { createClient } from "@/lib/supabase/server";
import { PortalSetupClient } from "./portal-setup-client";

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

export interface VisaTypeRow {
  id: number;
  value: string;
  label_en: string;
  label_tr: string;
  is_active: boolean;
  sort_order: number;
}

export default async function PortalSetupPage() {
  const supabase = await createClient();

  const [
    countriesActiveRes,
    countriesAllRes,
    visaTypesActiveRes,
    visaTypesAllRes,
    definitionsRes,
    smartTemplatesRes,
  ] = await Promise.all([
    supabase
      .from("countries")
      .select("id, name, flag_emoji")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("countries")
      .select("id, name, flag_emoji, is_active, sort_order, service_fee, consulate_fee, currency")
      .order("sort_order", { ascending: true }),
    supabase
      .from("visa_types")
      .select("value, label_en, label_tr")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("visa_types")
      .select("id, value, label_en, label_tr, is_active, sort_order")
      .order("sort_order", { ascending: true }),
    supabase
      .from("portal_field_definitions")
      .select("*")
      .order("created_at", { ascending: true }),
    supabase
      .from("portal_smart_field_templates")
      .select("id, template_key, label, label_tr, description, description_tr, sub_fields")
      .order("id", { ascending: true }),
  ]);

  const countriesActive: CountryOption[] = (countriesActiveRes.data ?? []).map(
    (c: Record<string, unknown>) => ({
      id: c.id as number,
      name: c.name as string,
      flag_emoji: c.flag_emoji as string | null,
    })
  );

  const countriesAll: CountryRow[] = (countriesAllRes.data ?? []).map(
    (c: Record<string, unknown>) => ({
      id: c.id as number,
      name: c.name as string,
      flag_emoji: c.flag_emoji as string | null,
      is_active: c.is_active as boolean,
      sort_order: c.sort_order as number,
      service_fee: Number(c.service_fee) || 0,
      consulate_fee: Number(c.consulate_fee) || 0,
      currency: (c.currency as string) || "EUR",
    })
  );

  const visaTypesActive: VisaTypeOption[] = (visaTypesActiveRes.data ?? []).map(
    (v: Record<string, unknown>) => ({
      value: v.value as string,
      label_en: v.label_en as string,
      label_tr: v.label_tr as string,
    })
  );

  const visaTypesAll: VisaTypeRow[] = (visaTypesAllRes.data ?? []).map(
    (v: Record<string, unknown>) => ({
      id: v.id as number,
      value: v.value as string,
      label_en: v.label_en as string,
      label_tr: v.label_tr as string,
      is_active: v.is_active as boolean,
      sort_order: v.sort_order as number,
    })
  );

  const definitions = (definitionsRes.data ?? []).map(
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

  const smartTemplates = (smartTemplatesRes.data ?? []).map(
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

  return (
    <PortalSetupClient
      countriesActive={countriesActive}
      countriesAll={countriesAll}
      visaTypesActive={visaTypesActive}
      visaTypesAll={visaTypesAll}
      definitions={definitions}
      smartTemplates={smartTemplates}
    />
  );
}
