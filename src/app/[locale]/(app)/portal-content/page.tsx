import { createClient } from "@/lib/supabase/server";
import { PortalContentClient } from "./portal-content-client";

export interface ContentRow {
  id: number;
  title: string;
  content: string;
  content_type: string;
  country: string | null;
  visa_type: string | null;
  sort_order: number;
  is_published: boolean;
  created_at: string | null;
}

export interface CountryOption {
  id: number;
  name: string;
  flag_emoji: string | null;
}

export default async function PortalContentPage() {
  const supabase = await createClient();

  const [contentRes, countriesRes] = await Promise.all([
    supabase.from("portal_content").select("*").order("sort_order", { ascending: true }),
    supabase.from("countries").select("id, name, flag_emoji").eq("is_active", true).order("sort_order"),
  ]);

  const content: ContentRow[] = (contentRes.data ?? []).map((c: Record<string, unknown>) => ({
    id: c.id as number,
    title: c.title as string,
    content: c.content as string,
    content_type: c.content_type as string,
    country: c.country as string | null,
    visa_type: c.visa_type as string | null,
    sort_order: c.sort_order as number,
    is_published: c.is_published as boolean,
    created_at: c.created_at as string | null,
  }));

  const countries: CountryOption[] = (countriesRes.data ?? []).map((c: Record<string, unknown>) => ({
    id: c.id as number,
    name: c.name as string,
    flag_emoji: c.flag_emoji as string | null,
  }));

  return <PortalContentClient data={content} countries={countries} />;
}
