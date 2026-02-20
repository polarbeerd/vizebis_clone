import { createClient } from "@/lib/supabase/server";
import { BookingTemplatesClient } from "./booking-templates-client";

export interface HotelRow {
  id: string;
  name: string;
  address: string;
  email: string;
  phone: string;
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

export default async function BookingTemplatesPage() {
  const supabase = await createClient();

  const { data: hotels, error } = await supabase
    .from("booking_hotels")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching booking hotels:", error);
  }

  return <BookingTemplatesClient data={(hotels ?? []) as HotelRow[]} />;
}
