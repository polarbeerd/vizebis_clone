"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { getAuthenticatedUser } from "@/lib/auth";
import { normalizeText, normalizeObject } from "@/lib/utils";

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
  field_label_tr: string;
  field_type: string;
  placeholder: string;
  placeholder_tr: string;
  options: string;
  options_tr: string;
  is_required: boolean;
  is_standard: boolean;
  max_chars: number | null;
  sort_order: number;
  section: string;
}

export interface PortalContentItem {
  id: number;
  title: string;
  content: string;
  content_type: string;
  video_url: string | null;
}

export interface SmartFieldTemplate {
  template_key: string;
  label: string;
  description: string;
}

export interface SmartFieldAssignment {
  template_key: string;
  is_required: boolean;
  sort_order: number;
  section: string;
  label: string;
  label_tr: string;
  description: string;
  description_tr: string;
}

export interface CountryOption {
  id: number;
  name: string;
  name_en: string | null;
  flag_emoji: string | null;
}

// ──────────────────────────────────────────────────────────────
// Portal V2 — Server Actions
// ──────────────────────────────────────────────────────────────

export async function getActiveCountries(): Promise<CountryOption[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("countries")
    .select("id, name, name_en, flag_emoji")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching countries:", error);
    return [];
  }

  return (data ?? []) as CountryOption[];
}

export interface VisaTypeOption {
  value: string;
  label_en: string;
  label_tr: string;
}

export async function getActiveVisaTypes(): Promise<VisaTypeOption[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("visa_types")
    .select("value, label_en, label_tr")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching visa types:", error);
    return [];
  }

  return (data ?? []) as VisaTypeOption[];
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
  country: string
): Promise<PortalContentItem[]> {
  const supabase = createServiceClient();

  // Fetch global content (country IS NULL) and country-specific content separately
  // to avoid string interpolation in .or() which is vulnerable to filter injection
  const [globalResult, countryResult] = await Promise.all([
    supabase
      .from("portal_content")
      .select("id, title, content, content_type, video_url")
      .eq("is_published", true)
      .in("content_type", ["video", "key_point"])
      .is("country", null)
      .order("sort_order", { ascending: true }),
    supabase
      .from("portal_content")
      .select("id, title, content, content_type, video_url")
      .eq("is_published", true)
      .in("content_type", ["video", "key_point"])
      .eq("country", country)
      .order("sort_order", { ascending: true }),
  ]);

  if (globalResult.error) {
    console.error("Error fetching global portal content:", globalResult.error);
  }
  if (countryResult.error) {
    console.error("Error fetching country portal content:", countryResult.error);
  }

  // Merge and deduplicate by id, preserving sort order
  const seen = new Set<number>();
  const merged: PortalContentItem[] = [];
  for (const item of [...(globalResult.data ?? []), ...(countryResult.data ?? [])]) {
    const id = (item as Record<string, unknown>).id as number;
    if (!seen.has(id)) {
      seen.add(id);
      merged.push(item as PortalContentItem);
    }
  }

  return merged;
}

export async function getFormFields(): Promise<FormField[]> {
  const supabase = createServiceClient();

  // Fetch ALL field assignments (all countries/visa types) and deduplicate by field_key
  const { data, error } = await supabase
    .from("portal_field_assignments")
    .select(
      "id, is_required, sort_order, section, definition:portal_field_definitions(id, field_key, field_label, field_label_tr, field_type, placeholder, placeholder_tr, options, options_tr, max_chars)"
    )
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching form fields:", error);
    return [];
  }

  // Deduplicate by field_key — keep the first occurrence (lowest sort_order)
  const seen = new Set<string>();
  return (data ?? [])
    .map((row: Record<string, unknown>) => {
      const def = row.definition as Record<string, unknown> | null;
      return {
        id: def?.id as number ?? 0,
        field_key: def?.field_key as string ?? "",
        field_label: def?.field_label as string ?? "",
        field_label_tr: (def?.field_label_tr as string) ?? "",
        field_type: def?.field_type as string ?? "text",
        placeholder: (def?.placeholder as string) ?? "",
        placeholder_tr: (def?.placeholder_tr as string) ?? "",
        options: (def?.options as string) ?? "",
        options_tr: (def?.options_tr as string) ?? "",
        is_required: row.is_required as boolean,
        is_standard: false,
        max_chars: (def?.max_chars as number) ?? null,
        sort_order: row.sort_order as number,
        section: (row.section as string) ?? "other",
      };
    })
    .filter((field) => {
      if (seen.has(field.field_key)) return false;
      seen.add(field.field_key);
      return true;
    });
}

export async function getSmartFieldAssignments(): Promise<SmartFieldAssignment[]> {
  const supabase = createServiceClient();

  // Fetch ALL smart field assignments (all countries/visa types) and deduplicate by template_key
  const { data, error } = await supabase
    .from("portal_smart_field_assignments")
    .select(
      "template_key, is_required, sort_order, section, template:portal_smart_field_templates(label, label_tr, description, description_tr)"
    )
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching smart field assignments:", error);
    return [];
  }

  // Deduplicate by template_key — keep the first occurrence (lowest sort_order)
  const seen = new Set<string>();
  return (data ?? [])
    .map((row: Record<string, unknown>) => {
      const tmpl = row.template as Record<string, unknown> | null;
      return {
        template_key: row.template_key as string,
        is_required: row.is_required as boolean,
        sort_order: row.sort_order as number,
        section: (row.section as string) ?? "other",
        label: (tmpl?.label as string) ?? "",
        label_tr: (tmpl?.label_tr as string) ?? "",
        description: (tmpl?.description as string) ?? "",
        description_tr: (tmpl?.description_tr as string) ?? "",
      };
    })
    .filter((sa) => {
      if (seen.has(sa.template_key)) return false;
      seen.add(sa.template_key);
      return true;
    });
}

async function getCountryFees(
  countryName: string
): Promise<{ service_fee: number; consulate_fee: number; currency: string }> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("countries")
    .select("service_fee, consulate_fee, currency")
    .eq("name", countryName)
    .single();

  if (!data) {
    return { service_fee: 0, consulate_fee: 0, currency: "EUR" };
  }

  return {
    service_fee: Number(data.service_fee) || 0,
    consulate_fee: Number(data.consulate_fee) || 0,
    currency: (data.currency as string) || "EUR",
  };
}

export async function createPortalApplication(data: {
  standardFields: Record<string, string>;
  customFields: Record<string, string>;
  smartFieldData?: Record<string, unknown>;
  country: string;
  visa_type: string;
}): Promise<{
  trackingCode: string | null;
  applicationId: number | null;
  error: string | null;
}> {
  const supabase = createServiceClient();

  // Normalize Turkish characters → English + uppercase
  const cf = normalizeObject(data.customFields);
  const normalizedStandard = normalizeObject(data.standardFields);
  const normalizedSmart = data.smartFieldData ? normalizeObject(data.smartFieldData) : undefined;
  const allFields = { ...normalizedStandard, ...cf };

  const fullName = [allFields.name, allFields.surname]
    .filter(Boolean)
    .join(" ") || allFields.full_name || null;

  const standardInsert: Record<string, unknown> = {
    ...(fullName ? { full_name: fullName } : {}),
    ...(allFields.phone ? { phone: allFields.phone } : {}),
    ...(allFields.email ? { email: allFields.email } : {}),
    ...(allFields.id_number ? { id_number: allFields.id_number } : {}),
    ...(allFields.date_of_birth ? { date_of_birth: allFields.date_of_birth } : {}),
    ...(allFields.passport_no ? { passport_no: allFields.passport_no } : {}),
    ...((allFields.passport_expiry || allFields.date_expiry)
      ? { passport_expiry: allFields.passport_expiry || allFields.date_expiry }
      : {}),
  };

  // Lookup country-based fees
  const fees = await getCountryFees(data.country);

  // Insert the application
  const { data: app, error } = await supabase
    .from("applications")
    .insert({
      ...standardInsert,
      custom_fields: {
        ...(Object.keys(cf).length > 0 ? cf : {}),
        ...(normalizedSmart && Object.keys(normalizedSmart).length > 0
          ? { _smart: normalizedSmart }
          : {}),
      },
      country: data.country,
      visa_type: data.visa_type,
      visa_status: "beklemede",
      source: "portal",
      payment_status: "odenmedi",
      invoice_status: "fatura_yok",
      currency: fees.currency,
      consulate_fee: fees.consulate_fee,
      service_fee: fees.service_fee,
    })
    .select("id, tracking_code")
    .single();

  if (error || !app) {
    console.error("Error creating portal application:", error);
    return { trackingCode: null, applicationId: null, error: "CREATE_FAILED" };
  }

  const applicationId = (app as Record<string, unknown>).id as number;
  const trackingCode = (app as Record<string, unknown>).tracking_code as string;

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

// ──────────────────────────────────────────────────────────────
// Payment — Server Actions
// ──────────────────────────────────────────────────────────────

export interface PaymentApplication {
  id: number;
  tracking_code: string;
  full_name: string | null;
  date_of_birth: string | null;
  country: string | null;
  visa_type: string | null;
  service_fee: number;
  consulate_fee: number;
  currency: string;
  payment_status: string;
  group_id: number | null;
  phone: string | null;
  passport_no: string | null;
  id_number: string | null;
}

const PAYMENT_SELECT =
  "id, tracking_code, full_name, date_of_birth, country, visa_type, service_fee, consulate_fee, currency, payment_status, group_id, phone, passport_no, id_number";

async function expandToGroup(
  app: PaymentApplication
): Promise<PaymentApplication[]> {
  if (!app.group_id) return [app];

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("applications")
    .select(PAYMENT_SELECT)
    .eq("group_id", app.group_id)
    .eq("is_deleted", false)
    .order("id", { ascending: true });

  if (error || !data || data.length === 0) return [app];
  return data as PaymentApplication[];
}

export async function lookupApplicationByPassport(
  passportNo: string
): Promise<{ data: PaymentApplication[] | null; error: string | null }> {
  return lookupApplicationByIdOrPassport(passportNo);
}

export async function lookupApplicationByIdOrPassport(
  identifier: string
): Promise<{ data: PaymentApplication[] | null; error: string | null }> {
  if (!identifier || identifier.trim().length === 0) {
    return { data: null, error: "INVALID_IDENTIFIER" };
  }

  const trimmed = identifier.trim();

  // Basic input validation — prevent obviously malicious inputs
  if (trimmed.length < 5 || trimmed.length > 20) {
    return { data: null, error: "INVALID_IDENTIFIER" };
  }

  // Only allow alphanumeric characters (ID numbers and passport numbers)
  if (!/^[A-Z0-9]+$/i.test(trimmed)) {
    return { data: null, error: "INVALID_IDENTIFIER" };
  }

  const supabase = createServiceClient();

  // Try id_number first (TC Kimlik — easier for Turkish customers to remember)
  const { data: byId } = await supabase
    .from("applications")
    .select(PAYMENT_SELECT)
    .eq("id_number", trimmed)
    .eq("is_deleted", false)
    .neq("payment_status", "odendi")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (byId) {
    const apps = await expandToGroup(byId as PaymentApplication);
    return { data: maskSensitiveFields(apps, trimmed), error: null };
  }

  // Fall back to passport_no
  const { data: byPassport, error } = await supabase
    .from("applications")
    .select(PAYMENT_SELECT)
    .eq("passport_no", trimmed)
    .eq("is_deleted", false)
    .neq("payment_status", "odendi")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error looking up application:", error);
    return { data: null, error: "LOOKUP_FAILED" };
  }

  if (byPassport) {
    const apps = await expandToGroup(byPassport as PaymentApplication);
    return { data: maskSensitiveFields(apps, trimmed), error: null };
  }

  // No unpaid found — check already-paid (id_number first, then passport_no)
  const { data: paidById } = await supabase
    .from("applications")
    .select(PAYMENT_SELECT)
    .eq("id_number", trimmed)
    .eq("is_deleted", false)
    .eq("payment_status", "odendi")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (paidById) {
    const apps = await expandToGroup(paidById as PaymentApplication);
    return { data: maskSensitiveFields(apps, trimmed), error: null };
  }

  const { data: paidByPassport } = await supabase
    .from("applications")
    .select(PAYMENT_SELECT)
    .eq("passport_no", trimmed)
    .eq("is_deleted", false)
    .eq("payment_status", "odendi")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (paidByPassport) {
    const apps = await expandToGroup(paidByPassport as PaymentApplication);
    return { data: maskSensitiveFields(apps, trimmed), error: null };
  }

  return { data: null, error: "NOT_FOUND" };
}

/**
 * Mask sensitive PII fields so that the payment lookup doesn't expose
 * full personal data to someone who only knows one identifier.
 * The identifier the user already knows is shown in full; other fields are masked.
 */
function maskSensitiveFields(
  apps: PaymentApplication[],
  knownIdentifier: string
): PaymentApplication[] {
  return apps.map((app) => ({
    ...app,
    // Mask phone: show only last 4 digits
    phone: app.phone ? "***" + app.phone.slice(-4) : null,
    // Only show full passport if it matches the lookup identifier
    passport_no:
      app.passport_no?.toUpperCase() === knownIdentifier.toUpperCase()
        ? app.passport_no
        : app.passport_no
          ? app.passport_no.slice(0, 2) + "***" + app.passport_no.slice(-2)
          : null,
    // Only show full id_number if it matches the lookup identifier
    id_number:
      app.id_number === knownIdentifier
        ? app.id_number
        : app.id_number
          ? app.id_number.slice(0, 3) + "****" + app.id_number.slice(-2)
          : null,
  }));
}

export async function getApplicationForPayment(
  trackingCode: string
): Promise<{ data: PaymentApplication[] | null; error: string | null }> {
  if (!trackingCode || trackingCode.trim().length === 0) {
    return { data: null, error: "INVALID_CODE" };
  }

  const supabase = createServiceClient();
  const code = trackingCode.trim();

  // First try applications table
  const { data, error } = await supabase
    .from("applications")
    .select(PAYMENT_SELECT)
    .eq("tracking_code", code)
    .eq("is_deleted", false)
    .single();

  if (!error && data) {
    const apps = await expandToGroup(data as PaymentApplication);
    return { data: apps, error: null };
  }

  // Fallback: if code starts with GRP-, try application_groups table
  if (code.startsWith("GRP-")) {
    const { data: group } = await supabase
      .from("application_groups")
      .select("id")
      .eq("tracking_code", code)
      .single();

    if (group) {
      const groupId = (group as Record<string, unknown>).id as number;
      const { data: members } = await supabase
        .from("applications")
        .select(PAYMENT_SELECT)
        .eq("group_id", groupId)
        .eq("is_deleted", false)
        .order("id", { ascending: true });

      if (members && members.length > 0) {
        return { data: members as PaymentApplication[], error: null };
      }
    }
  }

  return { data: null, error: "NOT_FOUND" };
}

// ──────────────────────────────────────────────────────────────
// Group Applications — Server Actions
// ──────────────────────────────────────────────────────────────

export interface GroupData {
  id: number;
  group_name: string;
  country: string;
  application_city: string;
  travel_dates: Record<string, unknown> | null;
  tracking_code: string;
  status: string;
}

export interface GroupMember {
  id: number;
  tracking_code: string;
  full_name: string | null;
  passport_no: string | null;
  id_number: string | null;
  date_of_birth: string | null;
  visa_type: string | null;
  custom_fields: Record<string, unknown> | null;
}

export async function createGroup(data: {
  group_name: string;
  country: string;
  application_city: string;
  travel_dates?: Record<string, unknown>;
}): Promise<{ group: GroupData | null; error: string | null }> {
  const supabase = createServiceClient();

  const { data: group, error } = await supabase
    .from("application_groups")
    .insert({
      group_name: data.group_name,
      country: data.country,
      application_city: data.application_city,
      travel_dates: data.travel_dates ?? null,
      status: "draft",
    })
    .select("id, group_name, country, application_city, travel_dates, tracking_code, status")
    .single();

  if (error || !group) {
    console.error("Error creating group:", error);
    return { group: null, error: "CREATE_FAILED" };
  }

  return { group: group as GroupData, error: null };
}

export async function getGroupMembers(
  groupId: number
): Promise<GroupMember[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("applications")
    .select("id, tracking_code, full_name, passport_no, id_number, date_of_birth, visa_type, custom_fields")
    .eq("group_id", groupId)
    .eq("is_deleted", false)
    .order("id", { ascending: true });

  if (error) {
    console.error("Error fetching group members:", error);
    return [];
  }

  return (data ?? []) as GroupMember[];
}

export async function addGroupMember(data: {
  groupId: number;
  country: string;
  visa_type: string;
  application_city: string;
  standardFields: Record<string, string>;
  customFields: Record<string, string>;
  smartFieldData?: Record<string, unknown>;
}): Promise<{
  member: GroupMember | null;
  error: string | null;
}> {
  const supabase = createServiceClient();

  // Normalize Turkish characters → English + uppercase
  const cf = normalizeObject(data.customFields);
  const normalizedStandard = normalizeObject(data.standardFields);
  const normalizedSmart = data.smartFieldData ? normalizeObject(data.smartFieldData) : undefined;
  const allFields = { ...normalizedStandard, ...cf };

  const fullName = [allFields.name, allFields.surname]
    .filter(Boolean)
    .join(" ") || allFields.full_name || null;

  const standardInsert: Record<string, unknown> = {
    ...(fullName ? { full_name: fullName } : {}),
    ...(allFields.phone ? { phone: allFields.phone } : {}),
    ...(allFields.email ? { email: allFields.email } : {}),
    ...(allFields.id_number ? { id_number: allFields.id_number } : {}),
    ...(allFields.date_of_birth ? { date_of_birth: allFields.date_of_birth } : {}),
    ...(allFields.passport_no ? { passport_no: allFields.passport_no } : {}),
    ...((allFields.passport_expiry || allFields.date_expiry)
      ? { passport_expiry: allFields.passport_expiry || allFields.date_expiry }
      : {}),
  };

  // Lookup country-based fees
  const fees = await getCountryFees(data.country);

  const { data: app, error } = await supabase
    .from("applications")
    .insert({
      ...standardInsert,
      custom_fields: {
        ...(Object.keys(cf).length > 0 ? cf : {}),
        ...(normalizedSmart && Object.keys(normalizedSmart).length > 0
          ? { _smart: normalizedSmart }
          : {}),
        application_city: normalizeText(data.application_city),
      },
      country: data.country,
      visa_type: data.visa_type,
      visa_status: "beklemede",
      source: "portal",
      group_id: data.groupId,
      payment_status: "odenmedi",
      invoice_status: "fatura_yok",
      currency: fees.currency,
      consulate_fee: fees.consulate_fee,
      service_fee: fees.service_fee,
    })
    .select("id, tracking_code, full_name, passport_no, id_number, date_of_birth, visa_type, custom_fields")
    .single();

  if (error || !app) {
    console.error("Error adding group member:", error);
    return { member: null, error: "CREATE_FAILED" };
  }

  return { member: app as GroupMember, error: null };
}

export async function updateGroupMember(data: {
  applicationId: number;
  groupId: number;
  visa_type: string;
  standardFields: Record<string, string>;
  customFields: Record<string, string>;
  smartFieldData?: Record<string, unknown>;
  application_city: string;
  country: string;
}): Promise<{ error: string | null }> {
  const supabase = createServiceClient();

  // Normalize Turkish characters → English + uppercase
  const cf = normalizeObject(data.customFields);
  const normalizedStandard = normalizeObject(data.standardFields);
  const normalizedSmart = data.smartFieldData ? normalizeObject(data.smartFieldData) : undefined;
  const allFields = { ...normalizedStandard, ...cf };

  const fullName = [allFields.name, allFields.surname]
    .filter(Boolean)
    .join(" ") || allFields.full_name || null;

  const standardUpdate: Record<string, unknown> = {
    ...(fullName ? { full_name: fullName } : {}),
    ...(allFields.phone ? { phone: allFields.phone } : {}),
    ...(allFields.email ? { email: allFields.email } : {}),
    ...(allFields.id_number ? { id_number: allFields.id_number } : {}),
    ...(allFields.date_of_birth ? { date_of_birth: allFields.date_of_birth } : {}),
    ...(allFields.passport_no ? { passport_no: allFields.passport_no } : {}),
    ...((allFields.passport_expiry || allFields.date_expiry)
      ? { passport_expiry: allFields.passport_expiry || allFields.date_expiry }
      : {}),
  };

  const { error } = await supabase
    .from("applications")
    .update({
      ...standardUpdate,
      custom_fields: {
        ...(Object.keys(cf).length > 0 ? cf : {}),
        ...(normalizedSmart && Object.keys(normalizedSmart).length > 0
          ? { _smart: normalizedSmart }
          : {}),
        application_city: normalizeText(data.application_city),
      },
      visa_type: data.visa_type,
    })
    .eq("id", data.applicationId)
    .eq("group_id", data.groupId);

  if (error) {
    console.error("Error updating group member:", error);
    return { error: "UPDATE_FAILED" };
  }

  return { error: null };
}

export async function deleteGroupMember(
  applicationId: number,
  groupId: number
): Promise<{ error: string | null }> {
  const supabase = createServiceClient();

  // Soft delete by marking is_deleted
  const { error } = await supabase
    .from("applications")
    .update({ is_deleted: true })
    .eq("id", applicationId)
    .eq("group_id", groupId);

  if (error) {
    console.error("Error deleting group member:", error);
    return { error: "DELETE_FAILED" };
  }

  return { error: null };
}

export async function submitGroup(
  groupId: number
): Promise<{ trackingCode: string | null; error: string | null }> {
  const supabase = createServiceClient();

  // Get group info
  const { data: group, error: groupError } = await supabase
    .from("application_groups")
    .select("tracking_code")
    .eq("id", groupId)
    .single();

  if (groupError || !group) {
    return { trackingCode: null, error: "GROUP_NOT_FOUND" };
  }

  // Mark group as submitted
  const { error: updateError } = await supabase
    .from("application_groups")
    .update({ status: "submitted" })
    .eq("id", groupId);

  if (updateError) {
    console.error("Error submitting group:", updateError);
    return { trackingCode: null, error: "SUBMIT_FAILED" };
  }

  // Fire and forget — auto-generate documents for all group members
  // Pick ONE shared hotel for the entire group, matching country if possible
  const { data: members } = await supabase
    .from("applications")
    .select("id, country")
    .eq("group_id", groupId)
    .eq("is_deleted", false);

  const groupCountry = members?.[0]?.country as string | undefined;

  let hotelQuery = supabase
    .from("booking_hotels")
    .select("id")
    .eq("type", "group")
    .eq("is_active", true);

  if (groupCountry) {
    hotelQuery = hotelQuery.eq("country", groupCountry);
  }

  let { data: groupHotels } = await hotelQuery;

  // Fallback: if no country-matched hotels, try without country filter
  if (!groupHotels?.length && groupCountry) {
    const { data: fallbackHotels } = await supabase
      .from("booking_hotels")
      .select("id")
      .eq("type", "group")
      .eq("is_active", true);
    groupHotels = fallbackHotels;
  }

  const sharedHotelId = groupHotels?.length
    ? (groupHotels[Math.floor(Math.random() * groupHotels.length)].id as string)
    : undefined;

  return {
    trackingCode: (group as Record<string, unknown>).tracking_code as string,
    error: null,
  };
}

// ──────────────────────────────────────────────────────────────
// Application Notes — Server Actions (Admin)
// ──────────────────────────────────────────────────────────────

export interface ApplicationNote {
  id: number;
  content: string;
  category: string;
  is_pinned: boolean;
  author_id: string | null;
  author_name: string | null;
  created_at: string;
}

export async function getApplicationNotes(
  applicationId: number
): Promise<ApplicationNote[]> {
  const user = await getAuthenticatedUser();
  if (!user) return [];

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("application_notes")
    .select("id, content, category, is_pinned, author_id, created_at, profiles(full_name)")
    .eq("application_id", applicationId)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching notes:", error);
    return [];
  }

  return (data ?? []).map((n: Record<string, unknown>) => {
    const profile = n.profiles as Record<string, unknown> | null;
    return {
      id: n.id as number,
      content: n.content as string,
      category: (n.category as string) ?? "internal",
      is_pinned: n.is_pinned as boolean,
      author_id: n.author_id as string | null,
      author_name: profile ? (profile.full_name as string) : null,
      created_at: n.created_at as string,
    };
  });
}

export async function addApplicationNote(data: {
  applicationId: number;
  content: string;
  category: string;
  authorId: string;
}): Promise<{ note: ApplicationNote | null; error: string | null }> {
  const user = await getAuthenticatedUser();
  if (!user) return { note: null, error: "UNAUTHORIZED" };

  const supabase = createServiceClient();

  // Use authenticated user's ID instead of client-supplied authorId to prevent impersonation
  const { data: note, error } = await supabase
    .from("application_notes")
    .insert({
      application_id: data.applicationId,
      content: data.content,
      category: data.category,
      author_id: user.id,
    })
    .select("id, content, category, is_pinned, author_id, created_at")
    .single();

  if (error || !note) {
    console.error("Error adding note:", error);
    return { note: null, error: "CREATE_FAILED" };
  }

  return {
    note: { ...(note as Record<string, unknown>), author_name: null } as unknown as ApplicationNote,
    error: null,
  };
}

export async function toggleNotePin(
  noteId: number,
  isPinned: boolean
): Promise<{ error: string | null }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "UNAUTHORIZED" };

  const supabase = createServiceClient();

  const { error } = await supabase
    .from("application_notes")
    .update({ is_pinned: isPinned })
    .eq("id", noteId);

  if (error) {
    console.error("Error toggling pin:", error);
    return { error: "UPDATE_FAILED" };
  }

  return { error: null };
}

export async function updateApplicationNote(
  noteId: number,
  content: string
): Promise<{ error: string | null }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "UNAUTHORIZED" };

  const supabase = createServiceClient();

  const { error } = await supabase
    .from("application_notes")
    .update({ content })
    .eq("id", noteId);

  if (error) {
    console.error("Error updating note:", error);
    return { error: "UPDATE_FAILED" };
  }

  return { error: null };
}

export async function deleteApplicationNote(
  noteId: number
): Promise<{ error: string | null }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "UNAUTHORIZED" };

  const supabase = createServiceClient();

  const { error } = await supabase
    .from("application_notes")
    .delete()
    .eq("id", noteId);

  if (error) {
    console.error("Error deleting note:", error);
    return { error: "DELETE_FAILED" };
  }

  return { error: null };
}
