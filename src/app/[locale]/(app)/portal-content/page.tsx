import { createClient } from "@/lib/supabase/server";
import { CountryGuidesClient } from "./portal-content-client";

export interface GuideRow {
  id: number;
  title: string;
  content: string;
  content_type: string;
  country: string | null;
  video_url: string | null;
  sort_order: number;
  is_published: boolean;
}

export interface CountryOption {
  id: number;
  name: string;
  flag_emoji: string | null;
}

export default async function CountryGuidesPage() {
  const supabase = await createClient();

  const [contentRes, countriesRes] = await Promise.all([
    supabase
      .from("portal_content")
      .select("id, title, content, content_type, country, video_url, sort_order, is_published")
      .in("content_type", ["video", "key_point"])
      .order("sort_order", { ascending: true }),
    supabase
      .from("countries")
      .select("id, name, flag_emoji")
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  const content: GuideRow[] = (contentRes.data ?? []) as GuideRow[];
  const countries: CountryOption[] = (countriesRes.data ?? []) as CountryOption[];

  return <CountryGuidesClient data={content} countries={countries} />;
}
