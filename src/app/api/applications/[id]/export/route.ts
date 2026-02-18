import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const applicationId = parseInt(id, 10);
  if (isNaN(applicationId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const supabase = await createClient();

  // Check auth
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: app, error } = await supabase
    .from("applications")
    .select("*")
    .eq("id", applicationId)
    .eq("is_deleted", false)
    .single();

  if (error || !app) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Build flat export object
  const exportData: Record<string, unknown> = {};

  // Standard columns
  const standardKeys = [
    "id",
    "tracking_code",
    "full_name",
    "id_number",
    "date_of_birth",
    "phone",
    "email",
    "passport_no",
    "passport_expiry",
    "visa_status",
    "visa_type",
    "country",
    "appointment_date",
    "appointment_time",
    "pickup_date",
    "travel_date",
    "consulate_app_no",
    "consulate_office",
    "source",
    "consulate_fee",
    "service_fee",
    "currency",
    "created_at",
    "updated_at",
  ];
  for (const key of standardKeys) {
    exportData[key] = (app as Record<string, unknown>)[key] ?? null;
  }

  // Custom fields (non-smart)
  const cf = (app as Record<string, unknown>).custom_fields as Record<
    string,
    unknown
  > | null;
  if (cf) {
    for (const [k, v] of Object.entries(cf)) {
      if (k === "_smart") {
        const smart = v as Record<string, Record<string, unknown>>;
        for (const [sfKey, sfData] of Object.entries(smart)) {
          for (const [subKey, subVal] of Object.entries(sfData)) {
            if (subKey === "_valid") continue;
            exportData[`${sfKey}_${subKey}`] = subVal;
          }
        }
      } else if (!k.startsWith("_")) {
        exportData[k] = v;
      }
    }
  }

  return NextResponse.json(exportData);
}
