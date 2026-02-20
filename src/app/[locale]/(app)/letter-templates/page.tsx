import { createClient } from "@/lib/supabase/server";
import { LetterTemplatesClient } from "./letter-templates-client";

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

export default async function LetterTemplatesPage() {
  const supabase = await createClient();

  const { data: examples, error: exError } = await supabase
    .from("letter_intent_examples")
    .select("*")
    .order("created_at", { ascending: false });

  if (exError) {
    console.error("Error fetching letter examples:", exError);
  }

  // Fetch generation config from settings table
  const { data: configRow, error: cfgError } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "letter_intent_config")
    .single();

  if (cfgError && cfgError.code !== "PGRST116") {
    console.error("Error fetching letter config:", cfgError);
  }

  const config: LetterConfig = configRow?.value
    ? (configRow.value as unknown as LetterConfig)
    : DEFAULT_CONFIG;

  return (
    <LetterTemplatesClient
      data={(examples ?? []) as LetterExampleRow[]}
      config={config}
    />
  );
}
