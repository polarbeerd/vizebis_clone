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

export default async function LetterTemplatesPage() {
  const supabase = await createClient();

  const { data: examples, error: exError } = await supabase
    .from("letter_intent_examples")
    .select("*")
    .order("created_at", { ascending: false });

  if (exError) {
    console.error("Error fetching letter examples:", exError);
  }

  return <LetterTemplatesClient data={(examples ?? []) as LetterExampleRow[]} />;
}
