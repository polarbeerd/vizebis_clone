# Booking PDF Generator & Letter of Intent — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add auto-generated booking PDFs and letters of intent to visa applications, with admin dashboard for hotel templates, example letters, and an enhanced application card with Generated Documents tab.

**Architecture:** Next.js monolith + Python FastAPI sidecar for PDF editing. Gemini 2.5 Flash for letter generation via Next.js API route. Supabase for storage and data. Tiptap for rich text editing.

**Tech Stack:** Next.js 16, TypeScript, Tailwind v4, shadcn/ui, Supabase (Postgres + Storage), FastAPI + pikepdf (Python), Gemini 2.5 Flash API, Tiptap editor, React Hook Form + Zod, Framer Motion

**Design Doc:** `docs/plans/2026-02-19-booking-pdf-and-letter-of-intent-design.md`

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/013_booking_and_letter_of_intent.sql`

**Step 1: Write the migration SQL**

```sql
-- 013_booking_and_letter_of_intent.sql
-- Booking PDF generator + Letter of Intent system

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('booking-templates', 'booking-templates', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('letter-intent-examples', 'letter-intent-examples', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('generated-docs', 'generated-docs', true) ON CONFLICT DO NOTHING;

-- Storage policies (allow all for now — auth-protected via app layer)
CREATE POLICY "Allow public read booking-templates" ON storage.objects FOR SELECT USING (bucket_id = 'booking-templates');
CREATE POLICY "Allow auth insert booking-templates" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'booking-templates');
CREATE POLICY "Allow auth update booking-templates" ON storage.objects FOR UPDATE USING (bucket_id = 'booking-templates');
CREATE POLICY "Allow auth delete booking-templates" ON storage.objects FOR DELETE USING (bucket_id = 'booking-templates');

CREATE POLICY "Allow public read letter-intent-examples" ON storage.objects FOR SELECT USING (bucket_id = 'letter-intent-examples');
CREATE POLICY "Allow auth insert letter-intent-examples" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'letter-intent-examples');
CREATE POLICY "Allow auth update letter-intent-examples" ON storage.objects FOR UPDATE USING (bucket_id = 'letter-intent-examples');
CREATE POLICY "Allow auth delete letter-intent-examples" ON storage.objects FOR DELETE USING (bucket_id = 'letter-intent-examples');

CREATE POLICY "Allow public read generated-docs" ON storage.objects FOR SELECT USING (bucket_id = 'generated-docs');
CREATE POLICY "Allow auth insert generated-docs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'generated-docs');
CREATE POLICY "Allow auth update generated-docs" ON storage.objects FOR UPDATE USING (bucket_id = 'generated-docs');
CREATE POLICY "Allow auth delete generated-docs" ON storage.objects FOR DELETE USING (bucket_id = 'generated-docs');

-- Hotel booking templates
CREATE TABLE IF NOT EXISTS booking_hotels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  website text,
  template_path text NOT NULL,
  edit_config jsonb NOT NULL DEFAULT '{}',
  type text NOT NULL CHECK (type IN ('individual', 'group')),
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE booking_hotels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON booking_hotels FOR ALL USING (auth.role() = 'authenticated');

-- Letter of intent examples
CREATE TABLE IF NOT EXISTS letter_intent_examples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country text,
  visa_type text,
  file_path text NOT NULL,
  extracted_text text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE letter_intent_examples ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON letter_intent_examples FOR ALL USING (auth.role() = 'authenticated');

-- Generated documents per application
CREATE TABLE IF NOT EXISTS generated_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id integer NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('booking_pdf', 'letter_of_intent')),
  hotel_id uuid REFERENCES booking_hotels(id) ON DELETE SET NULL,
  file_path text,
  content text,
  status text NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'ready', 'error')),
  error_message text,
  generated_by text NOT NULL DEFAULT 'auto',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON generated_documents FOR ALL USING (auth.role() = 'authenticated');
-- Service role needs access for auto-generation from portal actions
CREATE POLICY "Allow service role all" ON generated_documents FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX idx_generated_documents_application ON generated_documents(application_id);
CREATE INDEX idx_generated_documents_type ON generated_documents(type);
```

**Step 2: Apply the migration**

Use Supabase MCP tool `apply_migration` with name `booking_and_letter_of_intent` and the SQL above.

**Step 3: Verify tables exist**

Run: `execute_sql` with `SELECT table_name FROM information_schema.tables WHERE table_name IN ('booking_hotels', 'letter_intent_examples', 'generated_documents');`
Expected: 3 rows returned.

**Step 4: Commit**

```bash
git add supabase/migrations/013_booking_and_letter_of_intent.sql
git commit -m "feat: add booking_hotels, letter_intent_examples, generated_documents tables"
```

---

## Task 2: i18n — Add Translation Keys

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/tr.json`

**Step 1: Add bookingTemplates namespace to en.json**

Add after the last namespace in the file:

```json
"bookingTemplates": {
  "title": "Booking Templates",
  "description": "Manage hotel booking PDF templates",
  "addHotel": "Add Hotel",
  "editHotel": "Edit Hotel",
  "deleteHotel": "Delete Hotel",
  "hotelName": "Hotel Name",
  "address": "Address",
  "email": "Email",
  "phone": "Phone",
  "website": "Website",
  "type": "Type",
  "individual": "Individual",
  "group": "Group",
  "pdfTemplate": "PDF Template",
  "uploadPdf": "Upload PDF Template",
  "editConfig": "Advanced: PDF Edit Config",
  "active": "Active",
  "inactive": "Inactive",
  "preview": "Preview",
  "noHotels": "No hotels added yet",
  "deleteConfirm": "Are you sure you want to delete this hotel?",
  "saveSuccess": "Hotel saved successfully",
  "deleteSuccess": "Hotel deleted successfully",
  "uploadSuccess": "PDF template uploaded",
  "uploadError": "Failed to upload PDF template"
},
"letterTemplates": {
  "title": "Letter of Intent",
  "description": "Manage example letters and generation settings",
  "examples": "Example Letters",
  "addExample": "Add Example",
  "editExample": "Edit Example",
  "deleteExample": "Delete Example",
  "exampleName": "Name",
  "country": "Country",
  "visaType": "Visa Type",
  "uploadPdf": "Upload Example PDF",
  "extractedText": "Extracted Text",
  "viewText": "View Extracted Text",
  "editText": "Edit Extracted Text",
  "settings": "Generation Settings",
  "systemPrompt": "System Prompt",
  "tone": "Tone",
  "formal": "Formal",
  "semiFormal": "Semi-formal",
  "maxWords": "Max Word Count",
  "noExamples": "No example letters added yet",
  "saveSuccess": "Saved successfully",
  "deleteSuccess": "Deleted successfully"
},
"generatedDocuments": {
  "title": "Generated Documents",
  "bookingPdf": "Booking PDF",
  "letterOfIntent": "Letter of Intent",
  "status": "Status",
  "generating": "Generating...",
  "ready": "Ready",
  "error": "Error",
  "viewPdf": "View PDF",
  "downloadPdf": "Download PDF",
  "regenerate": "Regenerate",
  "changeHotel": "Change Hotel",
  "editLetter": "Edit Letter",
  "generateBooking": "Generate Booking PDF",
  "generateLetter": "Generate Letter of Intent",
  "hotel": "Hotel",
  "generatedOn": "Generated on",
  "lastEdited": "Last edited",
  "retry": "Retry",
  "noDocuments": "No documents generated yet",
  "selectHotel": "Select Hotel",
  "saveLetter": "Save Letter",
  "regenerateConfirm": "Regenerate will replace the current document. Continue?"
}
```

**Step 2: Add same namespaces to tr.json with Turkish translations**

Same structure, Turkish values. Also add nav keys:

In `nav` namespace of both files:
- en.json: `"bookingTemplates": "Booking Templates"`, `"letterTemplates": "Letter of Intent"`
- tr.json: `"bookingTemplates": "Rezervasyon Şablonları"`, `"letterTemplates": "Niyet Mektubu"`

**Step 3: Commit**

```bash
git add messages/en.json messages/tr.json
git commit -m "feat: add i18n keys for booking templates, letter of intent, generated documents"
```

---

## Task 3: Sidebar Navigation Update

**Files:**
- Modify: `src/components/layout/sidebar.tsx` (lines 72-81)

**Step 1: Add imports**

Add `Hotel` and `FileText` to the lucide-react import at the top of the file (find the existing import line and append).

**Step 2: Add nav items to PORTAL GROUP**

After the `visaTypesManagement` item (line 79), add:

```typescript
{ label: t("bookingTemplates"), href: "/booking-templates", icon: Hotel },
{ label: t("letterTemplates"), href: "/letter-templates", icon: FileText },
```

**Step 3: Verify dev server renders correctly**

Run: `npm run dev` and check sidebar shows "Booking Templates" and "Letter of Intent" under Portal group.

**Step 4: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat: add booking templates and letter of intent to sidebar nav"
```

---

## Task 4: Booking Templates — Server Page

**Files:**
- Create: `src/app/[locale]/(app)/booking-templates/page.tsx`

**Step 1: Write the server page**

Follow the existing pattern from `src/app/[locale]/(app)/documents/page.tsx`. The page:

1. Imports `createClient` from `@/lib/supabase/server`
2. Fetches all `booking_hotels` ordered by `sort_order`
3. Defines a `HotelRow` interface matching the table schema
4. Passes data to `BookingTemplatesClient`

```typescript
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
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export default async function BookingTemplatesPage() {
  const supabase = await createClient();
  const { data: hotels } = await supabase
    .from("booking_hotels")
    .select("*")
    .order("sort_order", { ascending: true });

  return <BookingTemplatesClient data={(hotels ?? []) as HotelRow[]} />;
}
```

**Step 2: Commit**

```bash
git add src/app/[locale]/(app)/booking-templates/page.tsx
git commit -m "feat: booking templates server page"
```

---

## Task 5: Booking Templates — Client Component + Hotel Form

**Files:**
- Create: `src/app/[locale]/(app)/booking-templates/booking-templates-client.tsx`
- Create: `src/components/booking-templates/hotel-form.tsx`

**Step 1: Create the hotel form dialog**

Follow `src/components/documents/document-form.tsx` pattern exactly:
- Zod schema with fields: name, address, email, phone, website, type (enum: individual/group), is_active
- Dialog with Form wrapping shadcn FormField components
- Supabase browser client for INSERT/UPDATE
- File upload for PDF template — use an `<input type="file" accept=".pdf">` with manual upload to Supabase Storage bucket `booking-templates`
- Collapsible section at bottom with a `<Textarea>` for `edit_config` (JSON string, validated on save)
- Toast on success/error via Sonner

Props interface:
```typescript
interface HotelFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hotel?: HotelRow;
  onSuccess: () => void;
}
```

PDF upload handler pattern:
```typescript
const handlePdfUpload = async (file: File, hotelId: string) => {
  const path = `${hotelId}.pdf`;
  const { error } = await supabase.storage
    .from("booking-templates")
    .upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
};
```

Default `edit_config` to pre-populate for new hotels (copy from design doc section 1, the Cabinn example config).

**Step 2: Create the client component**

Follow grid card layout (not DataTable — cards are better for visual templates):
- `"use client"` directive
- Grid of hotel cards (responsive: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`)
- Each card shows: name, type Badge, address/phone/email, active Switch toggle, Preview link, Edit/Delete buttons
- "Add Hotel" button opens HotelForm dialog
- Delete confirmation via AlertDialog
- `useRouter().refresh()` after mutations for server data re-fetch
- Use `useTranslations("bookingTemplates")` for all text

Card structure:
```tsx
<Card>
  <CardHeader>
    <div className="flex items-center justify-between">
      <CardTitle>{hotel.name}</CardTitle>
      <Badge variant={hotel.type === "individual" ? "default" : "secondary"}>
        {t(hotel.type)}
      </Badge>
    </div>
  </CardHeader>
  <CardContent>
    <p>{hotel.address}</p>
    <p>{hotel.phone} · {hotel.email}</p>
  </CardContent>
  <CardFooter className="flex justify-between">
    <Switch checked={hotel.is_active} onCheckedChange={...} />
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={preview}>Preview</Button>
      <Button variant="outline" size="sm" onClick={edit}>Edit</Button>
      <Button variant="destructive" size="sm" onClick={delete}>Delete</Button>
    </div>
  </CardFooter>
</Card>
```

Preview button opens the PDF in a new tab using the Supabase Storage public URL:
```typescript
const previewUrl = supabase.storage.from("booking-templates").getPublicUrl(hotel.template_path).data.publicUrl;
window.open(previewUrl, "_blank");
```

**Step 3: Verify page renders**

Navigate to `/en/booking-templates` in browser. Should show empty state with "Add Hotel" button.

**Step 4: Commit**

```bash
git add src/app/[locale]/(app)/booking-templates/booking-templates-client.tsx src/components/booking-templates/hotel-form.tsx
git commit -m "feat: booking templates dashboard with hotel CRUD and PDF upload"
```

---

## Task 6: Letter of Intent — Server Page + Client + Example Form

**Files:**
- Create: `src/app/[locale]/(app)/letter-templates/page.tsx`
- Create: `src/app/[locale]/(app)/letter-templates/letter-templates-client.tsx`
- Create: `src/components/letter-templates/example-form.tsx`

**Step 1: Write the server page**

Same pattern as Task 4. Fetches from `letter_intent_examples` + `settings` table (key `letter_intent_config`).

```typescript
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
```

**Step 2: Write the client component**

Two sections:

**Section 1 — Example Letters Grid:**
- Cards showing: name, country/visa badges, text preview (first 200 chars of extracted_text), active toggle
- "Add Example" button → opens ExampleForm dialog
- "View Extracted Text" → expands card or opens modal showing full extracted text in a textarea (editable, save button)
- Delete with confirmation

**Section 2 — Generation Settings:**
- Textarea for system prompt (default: "You are a professional visa consultant. Write a letter of intent for a Schengen visa application...")
- Select for tone (Formal / Semi-formal)
- Number input for max word count
- Save button → upserts to `settings` table with key `letter_intent_config`

**Step 3: Write the example form dialog**

Similar to hotel form. Fields: name, country (optional select from countries table), visa_type (optional select from visa_types table), PDF upload, active toggle.

On PDF upload:
1. Upload to `letter-intent-examples/{id}.pdf` in Supabase Storage
2. Call a server action or API route to extract text from the PDF
3. Save `extracted_text` to the database row

For PDF text extraction, install `pdf-parse`:
```bash
npm install pdf-parse
```

Create a Next.js API route at `src/app/api/extract-pdf-text/route.ts`:
```typescript
import pdf from "pdf-parse";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  const buffer = Buffer.from(await file.arrayBuffer());
  const data = await pdf(buffer);
  return NextResponse.json({ text: data.text });
}
```

**Step 4: Verify page renders**

Navigate to `/en/letter-templates`. Should show empty examples grid + settings form.

**Step 5: Commit**

```bash
git add src/app/[locale]/(app)/letter-templates/ src/components/letter-templates/example-form.tsx src/app/api/extract-pdf-text/route.ts
git commit -m "feat: letter of intent admin page with example uploads and generation settings"
```

---

## Task 7: Python Microservice — FastAPI + pikepdf

**Files:**
- Create: `pdf-service/main.py`
- Create: `pdf-service/edit_booking.py`
- Create: `pdf-service/requirements.txt`
- Create: `pdf-service/Dockerfile`

**Step 1: Create requirements.txt**

```
fastapi==0.115.0
uvicorn==0.30.0
pikepdf==9.0.0
fonttools==4.53.0
httpx==0.27.0
```

**Step 2: Create edit_booking.py**

Adapt the code from `example_pdf_extract.md` to be config-driven:

- Keep all helper functions (`FontMetrics`, `_esc`, `_replace_tm_and_tj`, `_replace_tj_array_centered`, `_replace_weekday`, `_replace_simple_text`, `_replace_tj_array_simple`)
- Keep `BookingData` dataclass and `booking_from_dates()` function
- Modify `edit_booking_pdf()` to:
  - Accept `template_bytes: bytes` instead of `template_path: str`
  - Accept `edit_config: dict` for regex patterns, column centers, font names
  - Return `bytes` (PDF output) instead of saving to disk
  - Read font names, column centers, and patterns from `edit_config` dict
  - Fall back to hardcoded defaults (the Cabinn values) if config keys are missing

Key signature:
```python
def edit_booking_pdf(template_bytes: bytes, booking: BookingData, edit_config: dict = None) -> bytes:
```

**Step 3: Create main.py**

```python
from fastapi import FastAPI
from pydantic import BaseModel
import httpx
import base64
import random
import string
from edit_booking import edit_booking_pdf, booking_from_dates

app = FastAPI()

class BookingRequest(BaseModel):
    template_url: str
    guest_name: str
    checkin_date: str
    checkout_date: str
    confirmation_number: str | None = None
    pin_code: str | None = None
    edit_config: dict = {}

@app.post("/generate-booking")
async def generate_booking(req: BookingRequest):
    # Download template
    async with httpx.AsyncClient() as client:
        resp = await client.get(req.template_url)
        resp.raise_for_status()
        template_bytes = resp.content

    # Auto-generate confirmation & PIN if not provided
    conf = req.confirmation_number or f"{random.randint(1000,9999)}.{random.randint(100,999)}.{random.randint(100,999)}"
    pin = req.pin_code or f"{random.randint(1000,9999)}"

    booking = booking_from_dates(
        checkin_date=req.checkin_date,
        checkout_date=req.checkout_date,
        confirmation_number=conf,
        pin_code=pin,
        guest_name=req.guest_name,
    )

    pdf_bytes = edit_booking_pdf(template_bytes, booking, req.edit_config)
    return {"status": "success", "pdf_base64": base64.b64encode(pdf_bytes).decode()}

@app.get("/health")
async def health():
    return {"status": "ok"}
```

**Step 4: Create Dockerfile**

```dockerfile
FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && apt-get install -y fonts-crosextra-carlito fonts-liberation && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Step 5: Test locally**

```bash
cd pdf-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# Test health endpoint:
curl http://localhost:8000/health
# Expected: {"status":"ok"}
```

**Step 6: Commit**

```bash
git add pdf-service/
git commit -m "feat: Python FastAPI microservice for booking PDF generation"
```

---

## Task 8: Document Generation Orchestrator

**Files:**
- Create: `src/lib/generate-documents.ts`

**Step 1: Write the orchestrator**

This module exports `generateDocumentsForApplication(applicationId: number)` which:

1. Fetches the application data from Supabase (using service role client since this may run in portal context)
2. Determines if individual or group
3. Picks a random active hotel of the correct type
4. Creates `generated_documents` rows with `status='generating'`
5. Calls Python service for booking PDF
6. Calls Gemini API for letter of intent
7. Uploads results to Supabase Storage
8. Updates rows to `status='ready'` or `status='error'`

```typescript
import { createServiceClient } from "@/lib/supabase/service";

export async function generateDocumentsForApplication(applicationId: number) {
  const supabase = createServiceClient();

  // 1. Fetch application
  const { data: app } = await supabase
    .from("applications")
    .select("*")
    .eq("id", applicationId)
    .single();
  if (!app) throw new Error("Application not found");

  const isGroup = !!app.group_id;
  const hotelType = isGroup ? "group" : "individual";

  // 2. Pick random hotel
  const { data: hotels } = await supabase
    .from("booking_hotels")
    .select("*")
    .eq("type", hotelType)
    .eq("is_active", true);
  if (!hotels?.length) return; // No hotels configured yet

  const hotel = hotels[Math.floor(Math.random() * hotels.length)];

  // 3. Run both in parallel
  await Promise.allSettled([
    generateBookingPdf(supabase, app, hotel),
    generateLetterOfIntent(supabase, app),
  ]);
}
```

`generateBookingPdf`:
- Creates `generated_documents` row (type=booking_pdf, status=generating, hotel_id)
- Gets template public URL from Supabase Storage
- Calls `PDF_SERVICE_URL/generate-booking` with application data + edit_config
- Decodes base64 response
- Uploads to `generated-docs/{applicationId}/booking.pdf`
- Updates row to status=ready + file_path

`generateLetterOfIntent`:
- Creates `generated_documents` row (type=letter_of_intent, status=generating)
- Fetches example letters from `letter_intent_examples` (matching country/visa_type, fallback all active)
- Fetches config from `settings` table (key `letter_intent_config`)
- Calls Gemini API with system prompt + examples + application data
- Saves HTML content to row
- Converts HTML to PDF (using a lightweight approach — e.g. call a simple HTML-to-PDF API or use puppeteer-core, or just save HTML as the primary artifact and PDF generation as a follow-up)
- Updates row to status=ready

**Step 2: Commit**

```bash
git add src/lib/generate-documents.ts
git commit -m "feat: document generation orchestrator for booking PDF and letter of intent"
```

---

## Task 9: Gemini API Route

**Files:**
- Create: `src/app/api/generate-letter/route.ts`

**Step 1: Write the API route**

```typescript
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { systemPrompt, examples, applicationData } = await req.json();
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY not set" }, { status: 500 });

  const prompt = buildPrompt(systemPrompt, examples, applicationData);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
      }),
    }
  );

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return NextResponse.json({ html: text });
}

function buildPrompt(systemPrompt: string, examples: string[], appData: Record<string, unknown>): string {
  let prompt = systemPrompt + "\n\n";
  prompt += "Here are examples of successful letters of intent:\n\n";
  examples.forEach((ex, i) => {
    prompt += `--- Example ${i + 1} ---\n${ex}\n\n`;
  });
  prompt += "--- Application Data ---\n";
  prompt += JSON.stringify(appData, null, 2) + "\n\n";
  prompt += "Write a letter of intent for this applicant based on the examples above. Output as clean HTML with <p>, <strong>, <em> tags only.";
  return prompt;
}
```

**Step 2: Commit**

```bash
git add src/app/api/generate-letter/route.ts
git commit -m "feat: Gemini API route for letter of intent generation"
```

---

## Task 10: Wire Auto-Generation into Portal Submission

**Files:**
- Modify: `src/app/[locale]/(portal)/portal/actions.ts` (around line 530, after the application insert succeeds)

**Step 1: Add the fire-and-forget call**

After the successful insert in `createPortalApplication()`, before the return statement, add:

```typescript
import { generateDocumentsForApplication } from "@/lib/generate-documents";

// Inside createPortalApplication, after the insert succeeds:
// Fire and forget — don't block the customer
if (applicationId) {
  generateDocumentsForApplication(applicationId).catch((err) => {
    console.error("Auto-generation failed for application", applicationId, err);
  });
}
```

**Step 2: Verify no blocking**

The `generateDocumentsForApplication` call is NOT awaited. The portal submission should return the tracking code immediately — document generation happens in the background.

**Step 3: Commit**

```bash
git add src/app/[locale]/(portal)/portal/actions.ts
git commit -m "feat: auto-generate booking PDF and letter of intent on portal submission"
```

---

## Task 11: Enhanced Application Card — Tabbed Detail Panel

**Files:**
- Create: `src/components/applications/application-card.tsx`
- Create: `src/components/applications/generated-documents-tab.tsx`
- Modify: `src/app/[locale]/(app)/applications/applications-client.tsx` (line 60 import, lines 864-869 usage)

**Step 1: Create application-card.tsx**

This replaces `ApplicationDetailSheet`. Same props interface:
```typescript
interface ApplicationCardProps {
  applicationId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (application: ApplicationDetail) => void;
}
```

Structure:
- Uses `Sheet` from shadcn/ui, but with `className="sm:max-w-4xl"` for wider panel
- `Tabs` component at the top with 4 tabs: Overview, Generated Documents, Portal Documents, Notes
- **Overview tab**: Extract the existing content from `ApplicationDetailSheet` (customer data, process tracking, fee info, photos sections) — essentially move/refactor the existing code
- **Generated Documents tab**: New component `GeneratedDocumentsTab` (see Step 2)
- **Portal Documents tab**: Extract the existing portal documents section from `ApplicationDetailSheet`
- **Notes tab**: Uses the existing `NotesTab` component from `src/components/applications/notes-tab.tsx`

Top actions row (above tabs):
```tsx
<div className="flex items-center justify-between mb-4">
  <div className="flex items-center gap-2">
    <Badge>{visaStatusLabel}</Badge>
    <span className="text-sm text-muted-foreground">#{trackingCode}</span>
    <Button variant="ghost" size="sm" onClick={copyTrackingCode}><Copy size={14} /></Button>
  </div>
  <div className="flex gap-2">
    <Button variant="outline" size="sm" onClick={() => onEdit?.(application)}>Edit</Button>
    <Button variant="outline" size="sm" onClick={openSmsModal}>SMS</Button>
    <Button variant="outline" size="sm" onClick={exportJson}>Export</Button>
  </div>
</div>
```

**Step 2: Create generated-documents-tab.tsx**

Props: `{ applicationId: number }`

On mount, fetches `generated_documents` for this application:
```typescript
const { data: docs } = await supabase
  .from("generated_documents")
  .select("*, booking_hotels(*)")
  .eq("application_id", applicationId);
```

Renders two cards:

**Booking PDF card:**
- Finds doc where `type === 'booking_pdf'`
- Shows status Badge (generating=yellow, ready=green, error=red)
- If ready: hotel name, View PDF button (opens public URL), Download button, Regenerate dropdown
- If error: error message + Retry button
- If no doc exists: "Generate Booking PDF" button with hotel selector dropdown (fetches active hotels)

**Letter of Intent card:**
- Finds doc where `type === 'letter_of_intent'`
- Same status badges
- If ready: View PDF, Download, Edit Letter button, Regenerate button
- "Edit Letter" opens a Dialog with Tiptap editor (see Task 12)
- If no doc exists: "Generate Letter of Intent" button

Regenerate handlers call the generation orchestrator functions via server actions or API routes.

**Step 3: Update applications-client.tsx**

Change import from `ApplicationDetailSheet` to `ApplicationCard`:
```typescript
// Old (line 60):
import { ApplicationDetailSheet } from "@/components/applications/application-detail";
// New:
import { ApplicationCard } from "@/components/applications/application-card";
```

Change usage (lines 864-869):
```typescript
// Old:
<ApplicationDetailSheet applicationId={detailId} open={detailOpen} onOpenChange={setDetailOpen} onEdit={handleDetailEdit} />
// New:
<ApplicationCard applicationId={detailId} open={detailOpen} onOpenChange={setDetailOpen} onEdit={handleDetailEdit} />
```

**Step 4: Verify the card opens with tabs**

Click the eye icon on any application in the list. The wider panel should open with 4 tabs. Overview should look the same as before.

**Step 5: Commit**

```bash
git add src/components/applications/application-card.tsx src/components/applications/generated-documents-tab.tsx src/app/[locale]/(app)/applications/applications-client.tsx
git commit -m "feat: enhanced application card with tabbed layout and generated documents"
```

---

## Task 12: Tiptap Rich Text Editor for Letter of Intent

**Files:**
- Create: `src/components/letter-templates/letter-editor.tsx`

**Step 1: Install Tiptap**

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-underline @tiptap/pm
```

**Step 2: Create the editor component**

```typescript
interface LetterEditorProps {
  content: string;  // HTML string
  onSave: (html: string) => Promise<void>;
  onClose: () => void;
}
```

The editor:
- Loads initial HTML content into Tiptap
- Toolbar with: Bold, Italic, Underline, Headings (H1-H3), Bullet list, Ordered list, Undo, Redo
- Full-width editor area with min-height
- Save button at bottom — calls `onSave(editor.getHTML())`
- The `onSave` handler in the parent: updates `generated_documents.content`, re-generates PDF from HTML, uploads new PDF, updates `file_path`

**Step 3: Integrate into generated-documents-tab.tsx**

The "Edit Letter" button opens a Dialog containing `<LetterEditor>`. On save, refresh the documents list.

**Step 4: Commit**

```bash
git add src/components/letter-templates/letter-editor.tsx
git commit -m "feat: Tiptap rich text editor for letter of intent editing"
```

---

## Task 13: HTML to PDF Conversion for Letters

**Files:**
- Create: `src/app/api/html-to-pdf/route.ts`

**Step 1: Install dependency**

```bash
npm install puppeteer-core
```

Or alternatively use a lighter approach — `@react-pdf/renderer` for server-side PDF from React components. However, since we need to render arbitrary HTML from Tiptap, Puppeteer is more appropriate.

If Puppeteer is too heavy, an alternative is to use the Python service (add a `/html-to-pdf` endpoint using `weasyprint` or `pdfkit`). This keeps the Next.js app lighter.

**Recommended: Add to Python service.**

Add to `pdf-service/main.py`:
```python
from weasyprint import HTML as WeasyHTML

class HtmlToPdfRequest(BaseModel):
    html: str

@app.post("/html-to-pdf")
async def html_to_pdf(req: HtmlToPdfRequest):
    pdf_bytes = WeasyHTML(string=req.html).write_pdf()
    return {"status": "success", "pdf_base64": base64.b64encode(pdf_bytes).decode()}
```

Add `weasyprint` to `requirements.txt`.

Update `Dockerfile` to install weasyprint system deps:
```dockerfile
RUN apt-get update && apt-get install -y fonts-crosextra-carlito fonts-liberation libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0 && rm -rf /var/lib/apt/lists/*
```

Then in the Next.js orchestrator, after saving letter HTML content, call the Python `/html-to-pdf` endpoint to generate the PDF.

**Step 2: Commit**

```bash
git add pdf-service/main.py pdf-service/requirements.txt pdf-service/Dockerfile
git commit -m "feat: add HTML-to-PDF endpoint to Python service for letter of intent"
```

---

## Task 14: End-to-End Testing & Verification

**Step 1: Verify database**

Run SQL to confirm all 3 tables exist and have correct columns.

**Step 2: Verify booking templates page**

1. Navigate to `/en/booking-templates`
2. Add a hotel (name, address, phone, email, type=individual)
3. Upload a test PDF
4. Verify it appears in the grid
5. Toggle active/inactive
6. Edit and save
7. Preview PDF opens in new tab

**Step 3: Verify letter templates page**

1. Navigate to `/en/letter-templates`
2. Add an example letter PDF
3. Verify text extraction works
4. Configure generation settings
5. Save settings

**Step 4: Verify Python service**

```bash
curl -X POST http://localhost:8000/health
# Expected: {"status":"ok"}
```

**Step 5: Verify application card**

1. Open an existing application via eye icon
2. Confirm 4 tabs render
3. Overview tab shows same data as before
4. Generated Documents tab shows empty state with generate buttons
5. Click "Generate Booking PDF" — select a hotel — verify PDF generates
6. Click "Generate Letter of Intent" — verify letter generates (needs GEMINI_API_KEY)
7. Click "Edit Letter" — verify Tiptap editor opens with content
8. Save edits — verify content updates

**Step 6: Verify auto-generation**

1. Submit a new application via portal
2. Check the application card — Generated Documents tab should show "Generating..." then "Ready"

**Step 7: Final commit**

```bash
git add -A
git commit -m "feat: complete booking PDF and letter of intent system"
```

---

## Task 15: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Update project structure section**

Add new routes and components to the file tree.

**Step 2: Update database schema table**

Add `booking_hotels`, `letter_intent_examples`, `generated_documents` rows.

**Step 3: Update "What Works" section**

Move from roadmap to functional: Booking PDF generator, Letter of Intent generator.

**Step 4: Update environment variables**

Add `PDF_SERVICE_URL` and `GEMINI_API_KEY`.

**Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with booking PDF and letter of intent features"
```

---

## Dependency Graph

```
Task 1 (migration) ──────────────────────────────────────────┐
Task 2 (i18n) ───────────────────────────────────────────────┤
Task 3 (sidebar) ← Task 2                                    │
Task 4 (booking page) ← Task 1, Task 2                       │
Task 5 (booking client + form) ← Task 4                      │
Task 6 (letter page + form) ← Task 1, Task 2                 │
Task 7 (Python service) ← independent                        │
Task 8 (orchestrator) ← Task 1, Task 7, Task 9               │
Task 9 (Gemini route) ← independent                          │
Task 10 (wire portal) ← Task 8                               │
Task 11 (application card) ← Task 1, Task 2                  ├── All tasks
Task 12 (Tiptap editor) ← independent                        │
Task 13 (HTML to PDF) ← Task 7                               │
Task 14 (E2E testing) ← ALL above                            │
Task 15 (CLAUDE.md) ← Task 14                                │
```

**Parallelizable groups:**
- Group A (independent): Task 1, Task 2, Task 7, Task 9, Task 12
- Group B (after A): Task 3, Task 4, Task 6, Task 8, Task 11, Task 13
- Group C (after B): Task 5, Task 10
- Group D (final): Task 14, Task 15
