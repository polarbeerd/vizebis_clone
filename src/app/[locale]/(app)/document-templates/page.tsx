import { createClient } from "@/lib/supabase/server";
import { DocumentTemplatesClient } from "./document-templates-client";

export interface HotelRow {
  id: string;
  name: string;
  address: string;
  postal_code: string | null;
  city: string | null;
  email: string;
  phone: string;
  phone_country_code: string | null;
  website: string | null;
  template_path: string;
  edit_config: Record<string, unknown>;
  type: string;
  country: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface LetterExampleRow {
  id: string;
  name: string;
  country: string | null;
  visa_type: string | null;
  file_path: string;
  extracted_text: string | null;
  is_active: boolean;
  created_at: string;
}

export interface LetterConfig {
  systemPrompt: string;
  tone: "formal" | "semi-formal";
  maxWords: number;
}

const DEFAULT_CONFIG: LetterConfig = {
  systemPrompt:
    "You are a professional visa consultant. Write a formal letter of intent for a visa application. The letter should be professional, clear, and persuasive.",
  tone: "formal",
  maxWords: 500,
};

export default async function DocumentTemplatesPage() {
  const supabase = await createClient();

  const [hotelsRes, examplesRes, configRes] = await Promise.all([
    supabase
      .from("booking_hotels")
      .select("*")
      .order("sort_order", { ascending: true }),
    supabase
      .from("letter_intent_examples")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("settings")
      .select("value")
      .eq("key", "letter_intent_config")
      .single(),
  ]);

  if (hotelsRes.error) {
    console.error("Error fetching hotels:", hotelsRes.error);
  }
  if (examplesRes.error) {
    console.error("Error fetching letter examples:", examplesRes.error);
  }

  const config: LetterConfig =
    configRes.data?.value
      ? (configRes.data.value as unknown as LetterConfig)
      : DEFAULT_CONFIG;

  return (
    <DocumentTemplatesClient
      hotels={(hotelsRes.data ?? []) as HotelRow[]}
      letterExamples={(examplesRes.data ?? []) as LetterExampleRow[]}
      letterConfig={config}
    />
  );
}
