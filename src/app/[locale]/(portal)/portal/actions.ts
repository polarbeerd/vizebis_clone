"use server";

import { createServiceClient } from "@/lib/supabase/service";

// Fields visible to the customer (NO fees, payments, admin notes)
const CUSTOMER_VISIBLE_SELECT = `
  id,
  tracking_code,
  full_name,
  id_number,
  date_of_birth,
  phone,
  email,
  passport_no,
  passport_expiry,
  visa_status,
  visa_type,
  country,
  appointment_date,
  appointment_time,
  pickup_date,
  travel_date,
  consulate_office,
  passport_photo,
  visa_photo,
  created_at,
  updated_at
`;

export interface PortalApplication {
  id: number;
  tracking_code: string;
  full_name: string | null;
  id_number: string | null;
  date_of_birth: string | null;
  phone: string | null;
  email: string | null;
  passport_no: string | null;
  passport_expiry: string | null;
  visa_status: string | null;
  visa_type: string | null;
  country: string | null;
  appointment_date: string | null;
  appointment_time: string | null;
  pickup_date: string | null;
  travel_date: string | null;
  consulate_office: string | null;
  passport_photo: string | null;
  visa_photo: string | null;
  created_at: string;
  updated_at: string;
}

export async function lookupApplication(
  trackingCode: string
): Promise<{ data: PortalApplication | null; error: string | null }> {
  if (!trackingCode || trackingCode.trim().length === 0) {
    return { data: null, error: "INVALID_CODE" };
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("applications")
    .select(CUSTOMER_VISIBLE_SELECT)
    .eq("tracking_code", trackingCode.trim())
    .eq("is_deleted", false)
    .single();

  if (error || !data) {
    return { data: null, error: "NOT_FOUND" };
  }

  // Update last accessed timestamp
  await supabase
    .from("applications")
    .update({ portal_last_accessed: new Date().toISOString() })
    .eq("tracking_code", trackingCode.trim());

  return { data: data as PortalApplication, error: null };
}

export interface PersonalInfoData {
  full_name: string;
  id_number: string;
  date_of_birth: string;
  phone: string;
  email: string;
  passport_no: string;
  passport_expiry: string;
}

export async function submitPersonalInfo(
  trackingCode: string,
  formData: PersonalInfoData
): Promise<{ success: boolean; error: string | null }> {
  if (!trackingCode) {
    return { success: false, error: "INVALID_CODE" };
  }

  const supabase = createServiceClient();

  // Verify the application exists
  const { data: existing } = await supabase
    .from("applications")
    .select("id")
    .eq("tracking_code", trackingCode.trim())
    .eq("is_deleted", false)
    .single();

  if (!existing) {
    return { success: false, error: "NOT_FOUND" };
  }

  const { error } = await supabase
    .from("applications")
    .update({
      full_name: formData.full_name,
      id_number: formData.id_number,
      date_of_birth: formData.date_of_birth || null,
      phone: formData.phone,
      email: formData.email,
      passport_no: formData.passport_no,
      passport_expiry: formData.passport_expiry || null,
    })
    .eq("tracking_code", trackingCode.trim());

  if (error) {
    console.error("Error updating personal info:", error);
    return { success: false, error: "UPDATE_FAILED" };
  }

  return { success: true, error: null };
}

export async function uploadDocument(
  trackingCode: string,
  formData: FormData
): Promise<{ success: boolean; error: string | null }> {
  if (!trackingCode) {
    return { success: false, error: "INVALID_CODE" };
  }

  const file = formData.get("file") as File | null;
  const field = formData.get("field") as string | null; // "passport_photo" | "visa_photo"

  if (!file || !field) {
    return { success: false, error: "MISSING_DATA" };
  }

  if (field !== "passport_photo" && field !== "visa_photo") {
    return { success: false, error: "INVALID_FIELD" };
  }

  // Validate file size (5MB)
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: "FILE_TOO_LARGE" };
  }

  // Validate file type
  const allowed = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
  if (!allowed.includes(file.type)) {
    return { success: false, error: "INVALID_TYPE" };
  }

  const supabase = createServiceClient();

  // Verify application exists
  const { data: existing } = await supabase
    .from("applications")
    .select("id")
    .eq("tracking_code", trackingCode.trim())
    .eq("is_deleted", false)
    .single();

  if (!existing) {
    return { success: false, error: "NOT_FOUND" };
  }

  // Upload to storage
  const ext = file.name.split(".").pop() ?? "jpg";
  const filePath = `${trackingCode}/${field}_${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("portal-uploads")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) {
    console.error("Error uploading file:", uploadError);
    return { success: false, error: "UPLOAD_FAILED" };
  }

  // Update application with file path
  const { error: updateError } = await supabase
    .from("applications")
    .update({ [field]: filePath })
    .eq("tracking_code", trackingCode.trim());

  if (updateError) {
    console.error("Error updating file path:", updateError);
    return { success: false, error: "UPDATE_FAILED" };
  }

  return { success: true, error: null };
}
