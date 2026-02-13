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

// ──────────────────────────────────────────────────────────────
// Portal V2 — Types
// ──────────────────────────────────────────────────────────────

export interface ChecklistItem {
  id: number;
  name: string;
  description: string;
  is_required: boolean;
  sort_order: number;
}

export interface ApplicationDocument {
  id: number;
  checklist_item_id: number | null;
  custom_name: string | null;
  custom_description: string | null;
  is_required: boolean;
  file_path: string | null;
  file_name: string | null;
  status: string;
  admin_note: string | null;
  // Joined from checklist
  checklist_name: string | null;
  checklist_description: string | null;
}

export interface FormField {
  id: number;
  field_key: string;
  field_label: string;
  field_type: string;
  placeholder: string;
  options: string;
  is_required: boolean;
  is_standard: boolean;
  sort_order: number;
}

export interface PortalContentItem {
  id: number;
  title: string;
  content: string;
  content_type: string;
}

export interface CountryOption {
  id: number;
  name: string;
  flag_emoji: string | null;
}

// ──────────────────────────────────────────────────────────────
// Portal V2 — Server Actions
// ──────────────────────────────────────────────────────────────

export async function getActiveCountries(): Promise<CountryOption[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("countries")
    .select("id, name, flag_emoji")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching countries:", error);
    return [];
  }

  return (data ?? []) as CountryOption[];
}

export async function getChecklist(
  country: string,
  visaType: string
): Promise<ChecklistItem[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("document_checklists")
    .select("id, name, description, is_required, sort_order")
    .eq("country", country)
    .eq("visa_type", visaType)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching checklist:", error);
    return [];
  }

  return (data ?? []) as ChecklistItem[];
}

export async function getPortalContent(
  country: string,
  visaType: string | null
): Promise<PortalContentItem[]> {
  const supabase = createServiceClient();

  // Fetch content that matches this country/visa combo OR is global
  const { data, error } = await supabase
    .from("portal_content")
    .select("id, title, content, content_type")
    .eq("is_published", true)
    .or(`country.is.null,country.eq.${country}`)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching portal content:", error);
    return [];
  }

  // Filter by visa_type client-side (Supabase OR chains get complex)
  const filtered = (data ?? []).filter((item: Record<string, unknown>) => {
    const itemVisaType = item.visa_type as string | null;
    return itemVisaType === null || itemVisaType === visaType;
  });

  return filtered as PortalContentItem[];
}

export async function getFormFields(
  country: string,
  visaType: string
): Promise<FormField[]> {
  const supabase = createServiceClient();

  // JOIN portal_field_assignments + portal_field_definitions
  const { data, error } = await supabase
    .from("portal_field_assignments")
    .select(
      "id, is_required, sort_order, definition:portal_field_definitions(id, field_key, field_label, field_type, placeholder, options, is_standard)"
    )
    .eq("country", country)
    .eq("visa_type", visaType)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching form fields:", error);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const def = row.definition as Record<string, unknown> | null;
    return {
      id: def?.id as number ?? 0,
      field_key: def?.field_key as string ?? "",
      field_label: def?.field_label as string ?? "",
      field_type: def?.field_type as string ?? "text",
      placeholder: (def?.placeholder as string) ?? "",
      options: (def?.options as string) ?? "",
      is_required: row.is_required as boolean,
      is_standard: def?.is_standard as boolean ?? false,
      sort_order: row.sort_order as number,
    };
  });
}

export async function createPortalApplication(data: {
  standardFields: Record<string, string>;
  customFields: Record<string, string>;
  country: string;
  visa_type: string;
}): Promise<{
  trackingCode: string | null;
  applicationId: number | null;
  error: string | null;
}> {
  const supabase = createServiceClient();

  // Build the insert object from standard fields
  const ALLOWED_STANDARD_KEYS = [
    "full_name",
    "id_number",
    "date_of_birth",
    "phone",
    "email",
    "passport_no",
    "passport_expiry",
  ];

  const standardInsert: Record<string, unknown> = {};
  for (const key of ALLOWED_STANDARD_KEYS) {
    if (data.standardFields[key] !== undefined) {
      standardInsert[key] = data.standardFields[key] || null;
    }
  }

  // Insert the application
  const { data: app, error } = await supabase
    .from("applications")
    .insert({
      ...standardInsert,
      custom_fields: Object.keys(data.customFields).length > 0 ? data.customFields : {},
      country: data.country,
      visa_type: data.visa_type,
      visa_status: "beklemede",
      source: "portal",
      payment_status: "odenmedi",
      invoice_status: "fatura_yok",
      currency: "TL",
      consulate_fee: 0,
      service_fee: 0,
    })
    .select("id, tracking_code")
    .single();

  if (error || !app) {
    console.error("Error creating portal application:", error);
    return { trackingCode: null, applicationId: null, error: "CREATE_FAILED" };
  }

  const applicationId = (app as Record<string, unknown>).id as number;
  const trackingCode = (app as Record<string, unknown>).tracking_code as string;

  // Auto-populate application_documents from checklist
  const { data: checklistItems } = await supabase
    .from("document_checklists")
    .select("id, is_required")
    .eq("country", data.country)
    .eq("visa_type", data.visa_type)
    .order("sort_order");

  if (checklistItems && checklistItems.length > 0) {
    const docs = checklistItems.map((item: Record<string, unknown>) => ({
      application_id: applicationId,
      checklist_item_id: item.id as number,
      is_required: item.is_required as boolean,
      status: "pending",
    }));

    await supabase.from("application_documents").insert(docs);
  }

  return { trackingCode, applicationId, error: null };
}

export async function uploadPortalDocument(
  trackingCode: string,
  documentId: number,
  formData: FormData
): Promise<{ success: boolean; error: string | null }> {
  if (!trackingCode || !documentId) {
    return { success: false, error: "INVALID_PARAMS" };
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return { success: false, error: "MISSING_FILE" };
  }

  // Validate file size (10MB)
  if (file.size > 10 * 1024 * 1024) {
    return { success: false, error: "FILE_TOO_LARGE" };
  }

  // Validate file type
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/heic",
    "image/heif",
    "application/pdf",
  ];
  if (!allowedTypes.includes(file.type)) {
    return { success: false, error: "INVALID_TYPE" };
  }

  const supabase = createServiceClient();

  // Verify application exists and get application_id
  const { data: appData } = await supabase
    .from("applications")
    .select("id")
    .eq("tracking_code", trackingCode.trim())
    .eq("is_deleted", false)
    .single();

  if (!appData) {
    return { success: false, error: "NOT_FOUND" };
  }

  const applicationId = (appData as Record<string, unknown>).id as number;

  // Verify document belongs to this application
  const { data: docData } = await supabase
    .from("application_documents")
    .select("id")
    .eq("id", documentId)
    .eq("application_id", applicationId)
    .single();

  if (!docData) {
    return { success: false, error: "DOC_NOT_FOUND" };
  }

  // Upload file to storage
  const ext = file.name.split(".").pop() ?? "jpg";
  const filePath = `${applicationId}/${documentId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("portal-uploads")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) {
    console.error("Upload error:", uploadError);
    return { success: false, error: "UPLOAD_FAILED" };
  }

  // Update application_documents row
  const { error: updateError } = await supabase
    .from("application_documents")
    .update({
      file_path: filePath,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      status: "uploaded",
      uploaded_at: new Date().toISOString(),
    })
    .eq("id", documentId);

  if (updateError) {
    console.error("Update error:", updateError);
    return { success: false, error: "UPDATE_FAILED" };
  }

  return { success: true, error: null };
}

export async function getApplicationDocuments(
  trackingCode: string
): Promise<{ documents: ApplicationDocument[]; error: string | null }> {
  if (!trackingCode) {
    return { documents: [], error: "INVALID_CODE" };
  }

  const supabase = createServiceClient();

  // Get application ID
  const { data: appData } = await supabase
    .from("applications")
    .select("id")
    .eq("tracking_code", trackingCode.trim())
    .eq("is_deleted", false)
    .single();

  if (!appData) {
    return { documents: [], error: "NOT_FOUND" };
  }

  const applicationId = (appData as Record<string, unknown>).id as number;

  // Fetch documents with joined checklist data
  const { data: docs, error } = await supabase
    .from("application_documents")
    .select(`
      id,
      checklist_item_id,
      custom_name,
      custom_description,
      is_required,
      file_path,
      file_name,
      status,
      admin_note,
      document_checklists (
        name,
        description
      )
    `)
    .eq("application_id", applicationId)
    .order("id", { ascending: true });

  if (error) {
    console.error("Error fetching documents:", error);
    return { documents: [], error: "FETCH_FAILED" };
  }

  const documents: ApplicationDocument[] = (docs ?? []).map(
    (d: Record<string, unknown>) => {
      const checklist = d.document_checklists as Record<string, unknown> | null;
      return {
        id: d.id as number,
        checklist_item_id: d.checklist_item_id as number | null,
        custom_name: d.custom_name as string | null,
        custom_description: d.custom_description as string | null,
        is_required: d.is_required as boolean,
        file_path: d.file_path as string | null,
        file_name: d.file_name as string | null,
        status: d.status as string,
        admin_note: d.admin_note as string | null,
        checklist_name: checklist ? (checklist.name as string) : null,
        checklist_description: checklist
          ? (checklist.description as string)
          : null,
      };
    }
  );

  return { documents, error: null };
}
