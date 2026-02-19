# Booking PDF Generator & Letter of Intent System — Design Doc

**Date:** 2026-02-19
**Status:** Approved
**Approach:** Monolith + Python Sidecar (Approach A)

---

## Summary

Three interconnected features:

1. **Booking PDF Generator** — Auto-generates hotel booking confirmation PDFs for visa applications using a Python microservice (pikepdf). Hotels and their PDF templates are managed via an admin dashboard.
2. **Letter of Intent Generator** — Auto-generates letters of intent using Gemini 2.5 Flash, with few-shot examples from uploaded successful letters. Editable via rich text editor (Tiptap).
3. **Enhanced Application Card** — Replaces the current detail sheet with a tabbed panel showing overview, generated documents, portal documents, and notes.

Both documents are auto-generated on portal submission (fire-and-forget) and accessible from the application card's "Generated Documents" tab. Admins can regenerate, change hotels, and edit letters.

---

## 1. Database Schema

### `booking_hotels`

Stores hotel entries. Each hotel has exactly one PDF template (1:1).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | `gen_random_uuid()` |
| `name` | text NOT NULL | Hotel name |
| `address` | text NOT NULL | Full address |
| `email` | text NOT NULL | Hotel email |
| `phone` | text NOT NULL | Hotel phone |
| `website` | text | Optional |
| `template_path` | text NOT NULL | Supabase Storage path (`booking-templates/{id}.pdf`) |
| `edit_config` | jsonb NOT NULL DEFAULT '{}' | Template-specific text positions, regex patterns, column centers, font config |
| `type` | text NOT NULL | `'individual'` or `'group'` |
| `is_active` | boolean DEFAULT true | Soft toggle |
| `sort_order` | int DEFAULT 0 | Display ordering |
| `created_at` | timestamptz DEFAULT now() | |
| `updated_at` | timestamptz DEFAULT now() | |

`edit_config` JSONB structure (per-hotel customization for the Python PDF editor):

```json
{
  "column_centers": { "checkin": 364.9, "checkout": 448.0, "nights": 545.5 },
  "font_names": { "bold": ["/TT0", "/TT9", "/TT12"], "italic": ["/TT13"], "regular": ["/TT3", "/TT4"] },
  "patterns": {
    "confirmation": "\\[\\(5087\\.509\\)-?\\d*\\s*\\(\\.967\\)\\]TJ",
    "pin": { "old_text": "0751", "context": "PIN C" },
    "guest_name": "\\[\\(\\s*CA\\)\\d+\\s*\\(GRI ONCEK\\)\\]TJ",
    "checkin_day": { "old_tm_x": "354.1875", "tm_y": "498.1125", "old_text": "30" },
    "checkin_month": { "pattern": "\\[\\(MAR\\)\\d+\\s*\\(CH\\)\\]TJ", "tm_y": "486.6125" },
    "checkin_weekday": { "old_text": "Monday" },
    "checkin_time": "\\[\\(\\s*15:0\\)\\d*\\s*\\(0 - 00\\)\\d*\\s*\\(:00\\)\\]TJ",
    "checkout_day": { "old_tm_x": "441.7625", "tm_y": "498.1125", "old_text": "7" },
    "checkout_month": { "old_tm_x": "436.8625", "tm_y": "486.6125", "old_text": "APRIL" },
    "checkout_weekday": { "old_text": "Tuesday" },
    "checkout_time": "\\[\\(\\s*until 11\\)\\d*\\s*\\(:00\\)\\]TJ",
    "nights": { "old_tm_x": "539.475", "tm_y": "498.1125", "old_text": "8" },
    "refund_line2": { "old_text": "on 30 March 2026. If you cancel from 12:00 on" },
    "refund_line3": { "old_text": "30 March 2026, you'll get a TL" }
  }
}
```

### `letter_intent_examples`

Few-shot example letters for Gemini.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `name` | text NOT NULL | Descriptive name |
| `country` | text | Optional — for country-specific matching |
| `visa_type` | text | Optional — for visa-type matching |
| `file_path` | text NOT NULL | Supabase Storage path |
| `extracted_text` | text | Text extracted from PDF (editable by admin) |
| `is_active` | boolean DEFAULT true | |
| `created_at` | timestamptz DEFAULT now() | |

### `generated_documents`

All auto/manually generated documents per application.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `application_id` | uuid FK -> applications | |
| `type` | text NOT NULL | `'booking_pdf'` or `'letter_of_intent'` |
| `hotel_id` | uuid FK -> booking_hotels | NULL for LoI |
| `file_path` | text | Supabase Storage path |
| `content` | text | For LoI: editable HTML content |
| `status` | text NOT NULL | `'generating'`, `'ready'`, `'error'` |
| `error_message` | text | If generation failed |
| `generated_by` | text | `'auto'` or user UUID |
| `created_at` | timestamptz DEFAULT now() | |
| `updated_at` | timestamptz DEFAULT now() | |

### Storage Buckets (new)

- `booking-templates` — Original hotel PDF templates (admin uploads)
- `letter-intent-examples` — Example LoI PDFs
- `generated-docs` — All generated output PDFs (booking + LoI), organized as `{application_id}/booking.pdf` and `{application_id}/letter-of-intent.pdf`

---

## 2. Booking Templates Dashboard

**Route:** `/[locale]/(app)/booking-templates/`
**Sidebar:** Under PORTAL GROUP, after Visa Types. Icon: `Hotel`
**i18n namespace:** `bookingTemplates`

### UI

Hotel cards in a grid layout. Each card shows:
- Hotel name, type badge (individual/group), active/inactive toggle
- Address, phone, email
- PDF preview icon with "Preview" link
- Edit/delete actions

### Hotel Form Dialog

Fields: name, type (segmented: Individual/Group), address, email, phone, website, PDF template upload (dropzone, `.pdf` only, max 10MB), active toggle.

Upload flow: file → Supabase Storage `booking-templates/{hotel_id}.pdf` → `template_path` saved.

The `edit_config` JSONB is pre-populated with a default config (based on the Cabinn template structure) when creating a new hotel. Admin can edit the JSON directly via a collapsible "Advanced: PDF Edit Config" section (code editor / JSON textarea) for hotels with different layouts.

---

## 3. Python Microservice (FastAPI)

### Structure

```
pdf-service/
├── main.py              # FastAPI app
├── edit_booking.py      # Generalized pikepdf logic (config-driven)
├── requirements.txt     # pikepdf, fonttools, fastapi, uvicorn, httpx
├── Dockerfile
└── fonts/               # Carlito-Bold, Carlito-Regular, LiberationSerif-Italic
```

### Endpoint

**`POST /generate-booking`**

Request:
```json
{
  "template_url": "https://xxx.supabase.co/storage/v1/object/public/booking-templates/cabinn.pdf",
  "guest_name": "MEHMET YILMAZ",
  "checkin_date": "2026-04-15",
  "checkout_date": "2026-04-22",
  "confirmation_number": "6123.456.789",
  "pin_code": "1234",
  "edit_config": { ... }
}
```

Response:
```json
{
  "status": "success",
  "pdf_base64": "<base64-encoded-pdf>"
}
```

### Logic

1. Downloads template PDF from `template_url`
2. Reads `edit_config` for positions, patterns, font names
3. Runs generalized pikepdf editing (same algorithm as example code but parameterized)
4. Returns base64-encoded result

### Confirmation Number & PIN

Auto-generated per booking:
- Confirmation: random format matching hotel style (e.g. `XXXX.XXX.XXX`)
- PIN: random 4-digit

---

## 4. Letter of Intent System

**Route:** `/[locale]/(app)/letter-templates/`
**Sidebar:** Under PORTAL GROUP, after Booking Templates. Icon: `FileText`
**i18n namespace:** `letterTemplates`

### Admin Page — Two Sections

**Section 1: Example Letters**
- Grid of uploaded example LoI PDFs
- Card: name, country/visa tags, extracted text preview
- "Add Example" dialog: name, country, visa_type, PDF upload
- On upload: text extracted server-side via `pdf-parse` npm, saved to `extracted_text`
- Admin can view/edit extracted text

**Section 2: Generation Settings**
- System prompt textarea (base Gemini instruction)
- Tone selector: Formal / Semi-formal
- Max word count range
- Stored in `settings` table with key `letter_intent_config`

### Generation Flow

1. Collect application data (name, country, visa type, travel dates, purpose, custom_fields)
2. Fetch matching `letter_intent_examples` (country/visa_type match first, fallback to all active)
3. Call Gemini 2.5 Flash via Next.js API route (`/api/generate-letter`):
   - System prompt from settings
   - 2-3 example letters as few-shot
   - Application data
4. Save HTML response to `generated_documents.content`
5. Convert HTML to PDF, upload to `generated-docs/{app_id}/letter-of-intent.pdf`
6. Update `generated_documents` row: `status='ready'`

### Editing

From application card → Generated Documents tab → click LoI:
- Opens Tiptap rich text editor with `generated_documents.content`
- Save → updates `content` + re-generates PDF from HTML
- "Regenerate" → re-calls Gemini, replaces content

### API

```
GEMINI_API_KEY in .env.local
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent
Called from Next.js API route /api/generate-letter (server-side only)
```

---

## 5. Enhanced Application Card

Replaces current `ApplicationDetailSheet`. Edit dialog stays separate.

**Width:** `max-w-4xl` sheet/panel

### Tabs

1. **Overview** — Existing detail view (customer data, process tracking, fee info, photos). Unchanged.
2. **Generated Documents** — New tab with booking PDF card + letter of intent card.
3. **Portal Documents** — Existing checklist with approve/reject. Moved from current detail sheet.
4. **Notes** — Existing notes timeline. Moved from edit dialog to be accessible here too.

### Generated Documents Tab

**Booking PDF Card:**
- Status badge (Generating / Ready / Error)
- Hotel name + type badge
- "View PDF" / "Download PDF" buttons
- "Regenerate" dropdown: keep current hotel or pick different
- Error state: message + "Retry"
- Timestamp

**Letter of Intent Card:**
- Status badge
- "View PDF" / "Download PDF" buttons
- "Edit Letter" → opens Tiptap editor (modal or inline)
- "Regenerate" → re-calls Gemini
- Timestamp + "Last edited" indicator

**Empty State (admin-created apps):**
- "Generate Booking PDF" button with hotel selector
- "Generate Letter of Intent" button

### Top Actions Row
- Edit button → opens edit dialog
- Send SMS → SMS modal
- Export JSON
- Tracking code with copy

### Group Applications
- Member's card shows their individual booking PDF
- Note showing group's assigned hotel + option to override per member
- Individual letter of intent per member

---

## 6. Auto-Generation Flow

### Trigger

Inside `createPortalApplication()` in `portal/actions.ts`, after successful insert:

```ts
// Fire and forget — don't block the customer
generateDocumentsForApplication(applicationId).catch(console.error)
```

### Individual Flow

```
Portal submission
  → Insert application row
  → Fire async: generateDocumentsForApplication(id)
      → Parallel:
          ├── pickRandomHotel(type='individual')
          │   → createGeneratedDoc(status='generating')
          │   → callPythonService(template, appData, editConfig)
          │   → uploadToStorage('generated-docs/{id}/booking.pdf')
          │   → updateGeneratedDoc(status='ready')
          │
          └── fetchExampleLetters(country, visaType)
              → createGeneratedDoc(status='generating')
              → callGeminiAPI(systemPrompt, examples, appData)
              → saveHTMLContent()
              → convertHTMLtoPDF()
              → uploadToStorage('generated-docs/{id}/letter-of-intent.pdf')
              → updateGeneratedDoc(status='ready')
```

### Group Flow

```
Portal group submission
  → Insert application rows for all members
  → Pick ONE random hotel (type='group')
  → For each member (parallel):
      ├── Generate booking PDF with shared hotel
      └── Generate letter of intent individually
```

Group hotel stored on first member's `generated_documents` row. Admin override per member regenerates only that member's booking PDF.

### Error Handling

- Python service down → `status='error'`, admin retries from card
- Gemini fails → same
- Storage upload fails → same
- All errors logged to `activity_logs`

---

## 7. Environment Variables (New)

```bash
PDF_SERVICE_URL=http://localhost:8000    # Python FastAPI service URL
GEMINI_API_KEY=AIza...                   # Gemini 2.5 Flash API key
```

---

## 8. New Files Summary

### Next.js (frontend + server)

```
src/app/[locale]/(app)/booking-templates/
  ├── page.tsx
  └── booking-templates-client.tsx

src/app/[locale]/(app)/letter-templates/
  ├── page.tsx
  └── letter-templates-client.tsx

src/app/api/generate-letter/
  └── route.ts                          # Gemini API proxy

src/components/booking-templates/
  └── hotel-form.tsx

src/components/letter-templates/
  ├── example-form.tsx
  └── letter-editor.tsx                 # Tiptap rich text editor

src/components/applications/
  └── application-card.tsx              # New tabbed detail panel (replaces detail sheet)
  └── generated-documents-tab.tsx       # Generated docs tab content

src/lib/
  └── generate-documents.ts            # Async generation orchestrator
```

### Python microservice

```
pdf-service/
  ├── main.py
  ├── edit_booking.py
  ├── requirements.txt
  ├── Dockerfile
  └── fonts/
```

### Database migration

```
supabase/migrations/013_booking_and_letter_of_intent.sql
```

### i18n

New namespaces in `messages/tr.json` and `messages/en.json`:
- `bookingTemplates`
- `letterTemplates`
- `generatedDocuments`

---

## 9. Sidebar Navigation Update

Add to PORTAL GROUP (after Visa Types Management):

```
PORTAL
  ├── Document Checklists
  ├── Portal Content
  ├── Portal Form Fields
  ├── Countries Management
  ├── Visa Types Management
  ├── Booking Templates       ← NEW (Hotel icon)
  └── Letter of Intent        ← NEW (FileText icon)
```
