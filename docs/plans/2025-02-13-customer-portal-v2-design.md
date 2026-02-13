# Customer Portal V2 — Smart Wizard Portal Design

**Date:** 2025-02-13
**Status:** Approved
**Author:** Brainstorm session

---

## Problem Statement

The current customer portal only supports tracking applications via a UUID code and uploading passport/visa photos. Visa consulting customers need:
- Per-country/per-visa-type document checklists
- Self-service application submission (not just tracking)
- Reading materials and guides assigned by the admin
- A modern mobile-first document upload experience
- A guided flow that's easy to follow

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Entry path | Both admin-created + self-service | Mix of in-person, remote, and online customers |
| Self-service scope | Full (customer starts application) | Reduces admin workload, customers expect self-service |
| Document rules | Country + Visa Type + per-app extras | Most flexible; covers standard + edge cases |
| Portal content | Full CMS (guides, FAQ, process info) | Customers need instructions, not just upload forms |
| Handoff | Auto-create application + tracking code | Immediate feedback for customer; admin reviews later |
| Portal UX | Guided step-by-step wizard | Less overwhelming than dashboards for non-tech users |
| Mobile upload | Camera integration + compression | Most customers will use phones |

---

## Database Schema

### New Table: `document_checklists`

Defines required documents per country + visa type combination.

| Column | Type | Purpose |
|--------|------|---------|
| id | SERIAL PK | |
| country | TEXT NOT NULL | Country name (FK-like to countries.name) |
| visa_type | visa_type ENUM NOT NULL | turist, is, ogrenci, etc. |
| name | TEXT NOT NULL | Document name (e.g., "Bank Statement") |
| description | TEXT | Instructions (e.g., "Last 3 months, min 5000 EUR balance") |
| is_required | BOOLEAN DEFAULT true | Required vs optional |
| sort_order | INTEGER DEFAULT 0 | Display ordering |
| created_by | UUID FK -> profiles | |
| created_at | TIMESTAMPTZ DEFAULT now() | |
| updated_at | TIMESTAMPTZ DEFAULT now() | |

**Unique constraint:** (country, visa_type, name)

### New Table: `application_documents`

Tracks uploaded documents per application, linked to checklist items or custom requests.

| Column | Type | Purpose |
|--------|------|---------|
| id | SERIAL PK | |
| application_id | INTEGER FK -> applications NOT NULL | |
| checklist_item_id | INTEGER FK -> document_checklists (nullable) | NULL = custom/extra request |
| custom_name | TEXT | For admin-added extras (when checklist_item_id is NULL) |
| custom_description | TEXT | Instructions for custom extras |
| is_required | BOOLEAN DEFAULT true | |
| file_path | TEXT | Storage path (NULL = not yet uploaded) |
| file_name | TEXT | Original filename |
| file_size | INTEGER | Bytes |
| mime_type | TEXT | |
| status | TEXT DEFAULT 'pending' | pending / uploaded / approved / rejected |
| admin_note | TEXT | Feedback from admin |
| uploaded_at | TIMESTAMPTZ | |
| reviewed_at | TIMESTAMPTZ | |

### New Table: `portal_content`

Admin-managed articles, guides, and FAQ for the customer portal.

| Column | Type | Purpose |
|--------|------|---------|
| id | SERIAL PK | |
| title | TEXT NOT NULL | |
| content | TEXT NOT NULL | Rich text / HTML |
| content_type | TEXT NOT NULL | 'country_guide', 'process_guide', 'faq', 'general' |
| country | TEXT (nullable) | NULL = global content |
| visa_type | visa_type ENUM (nullable) | NULL = all visa types for that country |
| sort_order | INTEGER DEFAULT 0 | |
| is_published | BOOLEAN DEFAULT true | |
| created_by | UUID FK -> profiles | |
| created_at | TIMESTAMPTZ DEFAULT now() | |
| updated_at | TIMESTAMPTZ DEFAULT now() | |

### Modified Table: `applications`

- Add `source` TEXT DEFAULT 'admin' — values: 'admin', 'portal'

### Modified Table: `countries`

- Add `flag_emoji` TEXT (e.g., flag emoji for visual display)
- Add `is_active` BOOLEAN DEFAULT true
- Seed with real country data + flag emojis
- Make this the canonical source of truth for all country dropdowns

---

## Portal Routes & Flow

### New Customer Flow (Self-Service)

```
/portal                          -> Landing page (enhanced)
  |-- "I have a tracking code"   -> Enter code -> /portal/{code}
  |-- "Start new application"    -> /portal/apply
        |-- Step 1               -> /portal/apply?step=country
        |                          Pick country + visa type (visual cards with flags)
        |-- Step 2               -> /portal/apply?step=guide
        |                          Read country/visa guide (must acknowledge)
        |-- Step 3               -> /portal/apply?step=info
        |                          Fill personal info (name, passport, contact)
        |-- Step 4               -> /portal/apply?step=documents
        |                          Upload required docs (checklist with upload zones)
        |-- Step 5               -> /portal/apply?step=confirmation
                                   Application created, tracking code shown
                                   "Save your code" + copy/email option
```

### Returning Customer Flow (Enhanced)

```
/portal/{trackingCode}           -> Status page (enhanced)
  |-- Status Timeline            -> Animated stepper (existing)
  |-- Document Progress          -> "4/7 documents uploaded" expandable section
  |   |-- Each required doc      -> Status badge + upload/re-upload button
  |   |-- Custom requests        -> Highlighted "New from your consultant"
  |-- Guides & Instructions      -> Country guide + process guides
  |-- Edit My Info               -> /portal/{code}/edit (existing)
  |-- Upload Documents           -> /portal/{code}/upload (enhanced)
```

### UX Details

**Step 1 (Country Selection):**
- Grid of country cards with flag emoji + country name
- On select, radio/card options for visa types
- Only show countries/types that have configured checklists

**Step 4 (Document Upload — Mobile-First):**
- Each checklist item = card with: doc name, instructions, upload zone
- Desktop: drag-and-drop. Mobile: tap + camera option (capture="environment")
- Instant image preview / PDF icon
- Client-side image compression (browser-image-compression library)
- Progress bar per file upload
- Status indicators: empty (gray), uploading (blue pulse), uploaded (green check), rejected (red + note)
- Support: JPEG, PNG, PDF, HEIC. Max 10MB per file.

**Returning Customer — Document Section:**
- Checklist view with per-item status
- Admin rejection shows reason + re-upload button
- Custom requests from admin show "New" badge
- Overall progress bar: "4 of 7 required documents uploaded"

---

## Admin Panel Changes

### New Page: Document Checklists

Route: `/document-checklists` (or tab in settings)

- **Filters:** Country dropdown + Visa Type dropdown
- **DataTable:** Checklist items for selected combo (name, description, required, sort order)
- **Actions:** Add item, edit, delete, reorder
- **Bulk feature:** "Copy checklist from [Country-Type] to [Country-Type]"

### New Page: Portal Content

Route: `/portal-content`

- **DataTable:** All articles/guides
- **Filters:** Content type, Country, Published status
- **Form:** Title, rich text editor, content type, country, visa type, published toggle
- **Preview:** "View as customer" button

### New Page: Countries Management

Route: `/countries` (or inside settings)

- **CRUD:** Country name, flag emoji, is_active, sort_order
- Becomes source of truth for all country dropdowns

### Enhanced: Application Detail

- New **"Portal Documents"** tab showing:
  - Auto-populated checklist based on country + visa type
  - Per-document status (pending/uploaded/approved/rejected)
  - Admin actions: approve, reject (with note), download
  - "Add custom requirement" button
  - Visual progress indicator

### Enhanced: Applications DataTable

- New "Doc Progress" column: "4/7" badge
- Color coding: green (complete), yellow (partial), red (none)

---

## Technical Architecture

### Storage
- **Bucket:** `portal-uploads` (existing from migration 002)
- **Path pattern:** `{application_id}/{document_type}/{filename}`
- **Formats:** JPEG, PNG, PDF, HEIC
- **Max:** 10MB per file (with client-side compression)

### Service Role Client
All portal server actions use service role client (bypasses RLS). New actions:
- `getChecklist(country, visaType)` — fetch required documents
- `getPortalContent(country, visaType)` — fetch guides/articles
- `createPortalApplication(data)` — create application from self-service
- `uploadPortalDocument(applicationId, checklistItemId, file)` — upload a doc
- `getApplicationDocuments(trackingCode)` — fetch doc status

### Middleware
- Portal routes skip Supabase auth (existing pattern)
- New `/portal/apply` routes also skip auth

### i18n
- UI chrome: TR + EN via messages/*.json (existing pattern)
- Admin-authored content: stored as-is in DB (admin writes in customer's language)

### Security
- Rate limiting on application creation
- Tracking code = UUID (unguessable)
- Server-side MIME type validation
- HTML sanitization for portal_content rendering

---

## Component Summary

| Component | Type | Count |
|-----------|------|-------|
| New DB tables | Migration | 3 (document_checklists, application_documents, portal_content) |
| DB modifications | Migration | 2 (applications.source, countries enhancements) |
| New portal routes | Pages | ~6 (apply wizard steps, enhanced status) |
| New admin routes | Pages | 3 (document-checklists, portal-content, countries) |
| Enhanced admin | Modifications | 2 (application-detail, applications table) |
| New components | UI | ~8 (wizard steps, upload component, checklist views) |
| Server actions | Backend | ~5 new server actions |
| i18n keys | Translations | ~100-150 new keys in TR + EN |
