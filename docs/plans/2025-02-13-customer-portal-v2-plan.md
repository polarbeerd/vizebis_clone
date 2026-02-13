# Customer Portal V2 — Smart Wizard Portal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the customer portal from a simple status tracker into a full self-service application wizard with per-country document checklists, admin-managed content, and modern mobile-first document uploads.

**Architecture:** New portal routes use the existing `(portal)` route group (no auth). New admin pages use the existing `(app)` route group (auth required). All portal server actions use the service role client to bypass RLS. State is managed via URL query params for wizard steps (no client-side state persistence needed — each step submits to server).

**Tech Stack:** Next.js App Router, Supabase (PostgreSQL + Storage), React Hook Form + Zod, Framer Motion, next-intl, shadcn/ui, browser-image-compression (new dependency for mobile uploads)

**Design Doc:** `docs/plans/2025-02-13-customer-portal-v2-design.md`

---

## Task 1: Database Migration — New Tables & Modifications

**Files:**
- Create: `supabase/migrations/003_portal_v2_schema.sql`

**Step 1: Write the migration SQL**

```sql
-- ============================================================
-- 003_portal_v2_schema.sql
-- Customer Portal V2: document checklists, application documents, portal content
-- ============================================================

-- =========================
-- 1. ENHANCE COUNTRIES TABLE
-- =========================

ALTER TABLE countries
  ADD COLUMN IF NOT EXISTS flag_emoji TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Seed countries with flag emojis (upsert on name)
INSERT INTO countries (name, flag_emoji, sort_order) VALUES
  ('Almanya', '🇩🇪', 1),
  ('Fransa', '🇫🇷', 2),
  ('İtalya', '🇮🇹', 3),
  ('İspanya', '🇪🇸', 4),
  ('Yunanistan', '🇬🇷', 5),
  ('Hollanda', '🇳🇱', 6),
  ('Belçika', '🇧🇪', 7),
  ('Portekiz', '🇵🇹', 8),
  ('Avusturya', '🇦🇹', 9),
  ('İsviçre', '🇨🇭', 10),
  ('Danimarka', '🇩🇰', 11),
  ('İsveç', '🇸🇪', 12),
  ('Norveç', '🇳🇴', 13),
  ('Finlandiya', '🇫🇮', 14),
  ('Polonya', '🇵🇱', 15),
  ('Çekya', '🇨🇿', 16),
  ('Macaristan', '🇭🇺', 17),
  ('Hırvatistan', '🇭🇷', 18),
  ('Romanya', '🇷🇴', 19),
  ('Bulgaristan', '🇧🇬', 20),
  ('İngiltere', '🇬🇧', 21),
  ('İrlanda', '🇮🇪', 22),
  ('ABD', '🇺🇸', 23),
  ('Kanada', '🇨🇦', 24),
  ('Avustralya', '🇦🇺', 25),
  ('Japonya', '🇯🇵', 26),
  ('Güney Kore', '🇰🇷', 27),
  ('Brezilya', '🇧🇷', 28),
  ('Rusya', '🇷🇺', 29)
ON CONFLICT (name) DO UPDATE SET
  flag_emoji = EXCLUDED.flag_emoji,
  sort_order = EXCLUDED.sort_order;

-- =========================
-- 2. DOCUMENT CHECKLISTS TABLE
-- =========================

CREATE TABLE IF NOT EXISTS document_checklists (
  id          SERIAL PRIMARY KEY,
  country     TEXT NOT NULL,
  visa_type   visa_type NOT NULL,
  name        TEXT NOT NULL,
  description TEXT DEFAULT '',
  is_required BOOLEAN DEFAULT true,
  sort_order  INTEGER DEFAULT 0,
  created_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(country, visa_type, name)
);

CREATE INDEX IF NOT EXISTS idx_document_checklists_country_visa
  ON document_checklists (country, visa_type);

-- =========================
-- 3. APPLICATION DOCUMENTS TABLE
-- =========================

CREATE TABLE IF NOT EXISTS application_documents (
  id                SERIAL PRIMARY KEY,
  application_id    INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  checklist_item_id INTEGER REFERENCES document_checklists(id) ON DELETE SET NULL,
  custom_name       TEXT,
  custom_description TEXT,
  is_required       BOOLEAN DEFAULT true,
  file_path         TEXT,
  file_name         TEXT,
  file_size         INTEGER,
  mime_type         TEXT,
  status            TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'uploaded', 'approved', 'rejected')),
  admin_note        TEXT,
  uploaded_at       TIMESTAMPTZ,
  reviewed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_application_documents_app
  ON application_documents (application_id);

-- =========================
-- 4. PORTAL CONTENT TABLE
-- =========================

CREATE TABLE IF NOT EXISTS portal_content (
  id            SERIAL PRIMARY KEY,
  title         TEXT NOT NULL,
  content       TEXT NOT NULL DEFAULT '',
  content_type  TEXT NOT NULL CHECK (content_type IN ('country_guide', 'process_guide', 'faq', 'general')),
  country       TEXT,
  visa_type     visa_type,
  sort_order    INTEGER DEFAULT 0,
  is_published  BOOLEAN DEFAULT true,
  created_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portal_content_country_visa
  ON portal_content (country, visa_type);

-- =========================
-- 5. ADD SOURCE COLUMN TO APPLICATIONS
-- =========================

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'admin' CHECK (source IN ('admin', 'portal'));

-- =========================
-- 6. RLS POLICIES (service role bypasses these, but good practice)
-- =========================

ALTER TABLE document_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_content ENABLE ROW LEVEL SECURITY;

-- Authenticated users can CRUD checklists
CREATE POLICY "Auth users manage checklists"
  ON document_checklists FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can manage application documents
CREATE POLICY "Auth users manage app documents"
  ON application_documents FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can manage portal content
CREATE POLICY "Auth users manage portal content"
  ON portal_content FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
```

**Step 2: Apply the migration to Supabase**

Run the migration via the Supabase MCP tool: `apply_migration` with project_id `puxhataoolzchfkecqsy`, name `portal_v2_schema`, and the SQL above.

**Step 3: Verify tables were created**

Run SQL: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('document_checklists', 'application_documents', 'portal_content');`

Expected: 3 rows returned.

**Step 4: Commit**

```bash
git add supabase/migrations/003_portal_v2_schema.sql
git commit -m "feat: add portal v2 database schema (document checklists, app documents, portal content)"
```

---

## Task 2: Install browser-image-compression + Add i18n Keys

**Files:**
- Modify: `package.json` (add dependency)
- Modify: `messages/en.json` (add new namespaces)
- Modify: `messages/tr.json` (add new namespaces)

**Step 1: Install the image compression library**

```bash
npm install browser-image-compression
```

**Step 2: Add new i18n keys to `messages/en.json`**

Add these new namespaces/keys at the end of the JSON (before the closing `}`):

```json
{
  "documentChecklists": {
    "title": "Document Checklists",
    "description": "Manage required documents per country and visa type",
    "addItem": "Add Document",
    "editItem": "Edit Document",
    "deleteItem": "Delete Document",
    "itemName": "Document Name",
    "itemDescription": "Instructions for Customer",
    "isRequired": "Required",
    "optional": "Optional",
    "sortOrder": "Sort Order",
    "selectCountry": "Select Country",
    "selectVisaType": "Select Visa Type",
    "noItems": "No document requirements configured for this combination",
    "createSuccess": "Document requirement added",
    "updateSuccess": "Document requirement updated",
    "deleteSuccess": "Document requirement deleted",
    "saveError": "Failed to save",
    "copyChecklist": "Copy Checklist",
    "copyFrom": "Copy from another country/visa type",
    "copySuccess": "Checklist copied successfully",
    "deleteConfirmTitle": "Delete Document Requirement",
    "deleteConfirmDescription": "Are you sure you want to delete \"{name}\"?"
  },
  "portalContent": {
    "title": "Portal Content",
    "description": "Manage guides, FAQs, and articles for the customer portal",
    "addArticle": "Add Article",
    "editArticle": "Edit Article",
    "articleTitle": "Title",
    "articleContent": "Content",
    "contentType": "Content Type",
    "countryGuide": "Country Guide",
    "processGuide": "Process Guide",
    "faq": "FAQ",
    "general": "General",
    "published": "Published",
    "draft": "Draft",
    "assignCountry": "Country (optional)",
    "assignVisaType": "Visa Type (optional)",
    "noArticles": "No articles found",
    "createSuccess": "Article created",
    "updateSuccess": "Article updated",
    "deleteSuccess": "Article deleted",
    "saveError": "Failed to save",
    "previewAsCustomer": "Preview as Customer",
    "deleteConfirmTitle": "Delete Article",
    "deleteConfirmDescription": "Are you sure you want to delete \"{name}\"?"
  },
  "countries": {
    "title": "Countries",
    "description": "Manage countries available in the system",
    "addCountry": "Add Country",
    "editCountry": "Edit Country",
    "countryName": "Country Name",
    "flagEmoji": "Flag Emoji",
    "isActive": "Active",
    "sortOrder": "Sort Order",
    "createSuccess": "Country added",
    "updateSuccess": "Country updated",
    "deleteSuccess": "Country deleted",
    "saveError": "Failed to save"
  },
  "portalApply": {
    "startNew": "Start New Application",
    "haveCode": "I Have a Tracking Code",
    "or": "or",
    "stepCountry": "Select Country",
    "stepGuide": "Read Guide",
    "stepInfo": "Your Information",
    "stepDocuments": "Upload Documents",
    "stepConfirmation": "Confirmation",
    "selectCountryTitle": "Where are you applying?",
    "selectCountrySubtitle": "Choose the country for your visa application",
    "selectVisaTypeTitle": "What type of visa?",
    "noChecklistWarning": "No document requirements configured for this combination yet. Please contact us directly.",
    "guideTitle": "Important Information",
    "guideSubtitle": "Please read the following guide carefully before proceeding",
    "acknowledgeGuide": "I have read and understood the above information",
    "personalInfoTitle": "Your Personal Information",
    "personalInfoSubtitle": "Please fill in your details accurately as they appear on your passport",
    "fullName": "Full Name",
    "idNumber": "ID Number",
    "dateOfBirth": "Date of Birth",
    "phone": "Phone Number",
    "email": "Email Address",
    "passportNo": "Passport Number",
    "passportExpiry": "Passport Expiry Date",
    "uploadTitle": "Upload Required Documents",
    "uploadSubtitle": "Upload each required document below. You can use your phone camera or select files.",
    "required": "Required",
    "optional": "Optional",
    "uploaded": "Uploaded",
    "tapToUpload": "Tap to upload or take a photo",
    "dragOrClick": "Drag & drop or click to select",
    "supportedFormats": "JPEG, PNG, PDF, HEIC (max 10MB)",
    "compressing": "Compressing image...",
    "uploading": "Uploading...",
    "uploadSuccess": "Document uploaded successfully",
    "uploadError": "Upload failed. Please try again.",
    "fileTooLarge": "File is too large. Maximum size is 10MB.",
    "invalidFileType": "Invalid file type. Please upload JPEG, PNG, PDF, or HEIC.",
    "confirmationTitle": "Application Submitted!",
    "confirmationSubtitle": "Your application has been created successfully",
    "yourTrackingCode": "Your Tracking Code",
    "saveThisCode": "Save this code! You will need it to check your application status and upload additional documents.",
    "copyCode": "Copy Code",
    "codeCopied": "Code copied to clipboard",
    "goToPortal": "Go to My Application",
    "progressLabel": "documents uploaded",
    "of": "of",
    "docsComplete": "All documents uploaded",
    "docsIncomplete": "documents remaining",
    "newRequirement": "New from your consultant",
    "adminRejected": "Needs re-upload",
    "rejectionReason": "Reason",
    "reupload": "Re-upload",
    "guidesSection": "Guides & Instructions",
    "noGuides": "No guides available for your application"
  },
  "applicationDocuments": {
    "title": "Portal Documents",
    "progress": "Document Progress",
    "addCustom": "Add Custom Requirement",
    "customName": "Document Name",
    "customDescription": "Instructions",
    "approve": "Approve",
    "reject": "Reject",
    "rejectionNote": "Rejection Note",
    "rejectionNotePlaceholder": "Explain why this document was rejected...",
    "download": "Download",
    "pending": "Pending",
    "uploaded": "Uploaded",
    "approved": "Approved",
    "rejected": "Rejected",
    "approveSuccess": "Document approved",
    "rejectSuccess": "Document rejected",
    "addSuccess": "Custom requirement added",
    "noDocuments": "No documents required for this application"
  }
}
```

**Step 3: Add the same keys to `messages/tr.json` with Turkish translations**

Same structure but Turkish values. Example of key translations:

```json
{
  "documentChecklists": {
    "title": "Belge Kontrol Listeleri",
    "description": "Ulke ve vize turune gore gerekli belgeleri yonetin",
    "addItem": "Belge Ekle",
    "editItem": "Belge Duzenle",
    "deleteItem": "Belge Sil",
    "itemName": "Belge Adi",
    "itemDescription": "Musteri Icin Talimatlar",
    "isRequired": "Zorunlu",
    "optional": "Istege Bagli",
    "sortOrder": "Siralama",
    "selectCountry": "Ulke Secin",
    "selectVisaType": "Vize Turu Secin",
    "noItems": "Bu kombinasyon icin belge gereksinimleri yapilandirilmamis",
    "createSuccess": "Belge gereksinimi eklendi",
    "updateSuccess": "Belge gereksinimi guncellendi",
    "deleteSuccess": "Belge gereksinimi silindi",
    "saveError": "Kaydetme basarisiz",
    "copyChecklist": "Listeyi Kopyala",
    "copyFrom": "Baska bir ulke/vize turundan kopyala",
    "copySuccess": "Liste basariyla kopyalandi",
    "deleteConfirmTitle": "Belge Gereksinimini Sil",
    "deleteConfirmDescription": "\"{name}\" silinecek. Emin misiniz?"
  },
  "portalContent": {
    "title": "Portal Icerikleri",
    "description": "Musteri portali icin rehberler, SSS ve makaleleri yonetin",
    "addArticle": "Makale Ekle",
    "editArticle": "Makale Duzenle",
    "articleTitle": "Baslik",
    "articleContent": "Icerik",
    "contentType": "Icerik Turu",
    "countryGuide": "Ulke Rehberi",
    "processGuide": "Surec Rehberi",
    "faq": "SSS",
    "general": "Genel",
    "published": "Yayinda",
    "draft": "Taslak",
    "assignCountry": "Ulke (istege bagli)",
    "assignVisaType": "Vize Turu (istege bagli)",
    "noArticles": "Makale bulunamadi",
    "createSuccess": "Makale olusturuldu",
    "updateSuccess": "Makale guncellendi",
    "deleteSuccess": "Makale silindi",
    "saveError": "Kaydetme basarisiz",
    "previewAsCustomer": "Musteri Gorunumu",
    "deleteConfirmTitle": "Makaleyi Sil",
    "deleteConfirmDescription": "\"{name}\" silinecek. Emin misiniz?"
  },
  "countries": {
    "title": "Ulkeler",
    "description": "Sistemde kullanilan ulkeleri yonetin",
    "addCountry": "Ulke Ekle",
    "editCountry": "Ulke Duzenle",
    "countryName": "Ulke Adi",
    "flagEmoji": "Bayrak Emojisi",
    "isActive": "Aktif",
    "sortOrder": "Siralama",
    "createSuccess": "Ulke eklendi",
    "updateSuccess": "Ulke guncellendi",
    "deleteSuccess": "Ulke silindi",
    "saveError": "Kaydetme basarisiz"
  },
  "portalApply": {
    "startNew": "Yeni Basvuru Baslat",
    "haveCode": "Takip Kodum Var",
    "or": "veya",
    "stepCountry": "Ulke Sec",
    "stepGuide": "Rehberi Oku",
    "stepInfo": "Bilgileriniz",
    "stepDocuments": "Belge Yukle",
    "stepConfirmation": "Onay",
    "selectCountryTitle": "Nereye basvuruyorsunuz?",
    "selectCountrySubtitle": "Vize basvurunuz icin ulke secin",
    "selectVisaTypeTitle": "Hangi vize turu?",
    "noChecklistWarning": "Bu kombinasyon icin henuz belge gereksinimleri yapilandirilmamis. Lutfen dogrudan bizimle iletisime gecin.",
    "guideTitle": "Onemli Bilgiler",
    "guideSubtitle": "Devam etmeden once asagidaki rehberi dikkatlice okuyun",
    "acknowledgeGuide": "Yukaridaki bilgileri okudum ve anladim",
    "personalInfoTitle": "Kisisel Bilgileriniz",
    "personalInfoSubtitle": "Lutfen bilgilerinizi pasaportunuzdaki gibi dogru sekilde doldurun",
    "fullName": "Ad Soyad",
    "idNumber": "TC Kimlik No",
    "dateOfBirth": "Dogum Tarihi",
    "phone": "Telefon Numarasi",
    "email": "E-posta Adresi",
    "passportNo": "Pasaport Numarasi",
    "passportExpiry": "Pasaport Bitis Tarihi",
    "uploadTitle": "Gerekli Belgeleri Yukleyin",
    "uploadSubtitle": "Asagidaki belgelerin her birini yukleyin. Telefon kameranizi kullanabilir veya dosya secebilirsiniz.",
    "required": "Zorunlu",
    "optional": "Istege Bagli",
    "uploaded": "Yuklendi",
    "tapToUpload": "Yuklemek veya fotograf cekmek icin dokunun",
    "dragOrClick": "Surukle birak veya secmek icin tiklayin",
    "supportedFormats": "JPEG, PNG, PDF, HEIC (maks 10MB)",
    "compressing": "Gorsel sikistiriliyor...",
    "uploading": "Yukleniyor...",
    "uploadSuccess": "Belge basariyla yuklendi",
    "uploadError": "Yukleme basarisiz. Lutfen tekrar deneyin.",
    "fileTooLarge": "Dosya cok buyuk. Maksimum boyut 10MB.",
    "invalidFileType": "Gecersiz dosya turu. Lutfen JPEG, PNG, PDF veya HEIC yukleyin.",
    "confirmationTitle": "Basvuru Gonderildi!",
    "confirmationSubtitle": "Basvurunuz basariyla olusturuldu",
    "yourTrackingCode": "Takip Kodunuz",
    "saveThisCode": "Bu kodu kaydedin! Basvuru durumunuzu kontrol etmek ve ek belgeler yuklemek icin buna ihtiyaciniz olacak.",
    "copyCode": "Kodu Kopyala",
    "codeCopied": "Kod panoya kopyalandi",
    "goToPortal": "Basvuruma Git",
    "progressLabel": "belge yuklendi",
    "of": "/",
    "docsComplete": "Tum belgeler yuklendi",
    "docsIncomplete": "belge kaldi",
    "newRequirement": "Danismaninizdan yeni talep",
    "adminRejected": "Tekrar yuklenmesi gerekiyor",
    "rejectionReason": "Sebep",
    "reupload": "Tekrar Yukle",
    "guidesSection": "Rehberler ve Talimatlar",
    "noGuides": "Basvurunuz icin rehber bulunamadi"
  },
  "applicationDocuments": {
    "title": "Portal Belgeleri",
    "progress": "Belge Durumu",
    "addCustom": "Ozel Gereksinim Ekle",
    "customName": "Belge Adi",
    "customDescription": "Talimatlar",
    "approve": "Onayla",
    "reject": "Reddet",
    "rejectionNote": "Red Notu",
    "rejectionNotePlaceholder": "Bu belgenin neden reddedildigini aciklayin...",
    "download": "Indir",
    "pending": "Beklemede",
    "uploaded": "Yuklendi",
    "approved": "Onaylandi",
    "rejected": "Reddedildi",
    "approveSuccess": "Belge onaylandi",
    "rejectSuccess": "Belge reddedildi",
    "addSuccess": "Ozel gereksinim eklendi",
    "noDocuments": "Bu basvuru icin belge gereksinimi yok"
  }
}
```

**Step 4: Add nav keys to both translation files**

In both `messages/en.json` and `messages/tr.json`, add to the existing `"nav"` namespace:

```json
// en.json nav additions:
"documentChecklists": "Document Checklists",
"portalContent": "Portal Content",
"countriesManagement": "Countries",
"portalGroup": "Customer Portal"

// tr.json nav additions:
"documentChecklists": "Belge Kontrol Listeleri",
"portalContent": "Portal Icerikleri",
"countriesManagement": "Ulkeler",
"portalGroup": "Musteri Portali"
```

**Step 5: Commit**

```bash
git add package.json package-lock.json messages/en.json messages/tr.json
git commit -m "feat: add i18n keys for portal v2 and install browser-image-compression"
```

---

## Task 3: Countries Management Admin Page

**Files:**
- Create: `src/app/[locale]/(app)/countries/page.tsx`
- Create: `src/app/[locale]/(app)/countries/countries-client.tsx`
- Create: `src/components/countries/country-form.tsx`
- Modify: `src/components/layout/sidebar.tsx` (add nav item)

**Step 1: Create server page**

Create `src/app/[locale]/(app)/countries/page.tsx`:

```typescript
import { createClient } from "@/lib/supabase/server";
import { CountriesClient } from "./countries-client";

export interface CountryRow {
  id: number;
  name: string;
  flag_emoji: string | null;
  is_active: boolean;
  sort_order: number;
}

export default async function CountriesPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("countries")
    .select("id, name, flag_emoji, is_active, sort_order")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching countries:", error);
  }

  const rows: CountryRow[] = (data ?? []).map((c: Record<string, unknown>) => ({
    id: c.id as number,
    name: c.name as string,
    flag_emoji: c.flag_emoji as string | null,
    is_active: c.is_active as boolean,
    sort_order: c.sort_order as number,
  }));

  return <CountriesClient data={rows} />;
}
```

**Step 2: Create client component**

Create `src/app/[locale]/(app)/countries/countries-client.tsx` with:
- DataTable with columns: Flag, Name, Active (badge), Sort Order, Actions (edit/delete)
- "Add Country" button
- CountryForm dialog for create/edit
- Delete confirmation dialog
- Uses `useTranslations("countries")` and `useTranslations("common")`
- Follow the exact pattern from `tags/tags-client.tsx`

**Step 3: Create country form component**

Create `src/components/countries/country-form.tsx` with:
- Zod schema: `name` (required string), `flag_emoji` (string), `is_active` (boolean), `sort_order` (number)
- React Hook Form dialog
- Supabase browser client for insert/update
- Follow exact pattern from `src/components/tags/tag-form.tsx`

**Step 4: Add sidebar nav item**

In `src/components/layout/sidebar.tsx`, add to the nav groups a new "Customer Portal" group or add countries to the "Management" group:

```typescript
// Add import
import { Globe } from "lucide-react";

// Add to the management group items array:
{ label: t("countriesManagement"), href: "/countries", icon: Globe },
```

**Step 5: Verify by running `npm run dev` and navigating to `/countries`**

**Step 6: Commit**

```bash
git add src/app/[locale]/(app)/countries/ src/components/countries/ src/components/layout/sidebar.tsx
git commit -m "feat: add countries management admin page"
```

---

## Task 4: Document Checklists Admin Page

**Files:**
- Create: `src/app/[locale]/(app)/document-checklists/page.tsx`
- Create: `src/app/[locale]/(app)/document-checklists/document-checklists-client.tsx`
- Create: `src/components/document-checklists/checklist-item-form.tsx`
- Modify: `src/components/layout/sidebar.tsx` (add nav item)

**Step 1: Create server page**

Create `src/app/[locale]/(app)/document-checklists/page.tsx`:
- Fetch all `document_checklists` rows with `.select("*").order("sort_order")`
- Fetch all active countries with `.from("countries").select("id, name, flag_emoji").eq("is_active", true).order("sort_order")`
- Pass both to client component

**Step 2: Create client component**

Create `src/app/[locale]/(app)/document-checklists/document-checklists-client.tsx`:
- **Top bar:** Two `<Select>` dropdowns — Country and Visa Type
- **Filtered DataTable:** Shows only checklist items matching selected country + visa type
- Columns: Sort Order, Document Name, Description (truncated), Required (badge), Actions
- "Add Document" button (only enabled when country + visa type are selected)
- "Copy Checklist" button opens dialog to copy from another country+visa type combo
- Uses `useTranslations("documentChecklists")`, `useTranslations("common")`, `useTranslations("visaType")`

**Step 3: Create checklist item form**

Create `src/components/document-checklists/checklist-item-form.tsx`:
- Zod schema: `name` (required), `description` (string), `is_required` (boolean, default true), `sort_order` (number, default 0)
- Country and visa_type are passed as props (not form fields — they come from the parent filter)
- Dialog form with React Hook Form
- Supabase browser client for insert/update

**Step 4: Implement copy checklist functionality**

In the client component, add a `copyChecklist` function that:
- Opens a dialog with source Country + Visa Type selectors
- Fetches checklist items from source combo
- Inserts them for the target combo (current selection)
- Uses `supabase.from("document_checklists").insert(items.map(...))`

**Step 5: Add sidebar nav item**

```typescript
// Add import
import { ClipboardCheck } from "lucide-react";

// Add to new "Customer Portal" group:
{
  title: t("portalGroup"),
  items: [
    { label: t("documentChecklists"), href: "/document-checklists", icon: ClipboardCheck },
    { label: t("countriesManagement"), href: "/countries", icon: Globe },
  ],
},
```

(Move the countries nav item from management group to this new portal group)

**Step 6: Verify in browser**

**Step 7: Commit**

```bash
git add src/app/[locale]/(app)/document-checklists/ src/components/document-checklists/ src/components/layout/sidebar.tsx
git commit -m "feat: add document checklists admin page with copy functionality"
```

---

## Task 5: Portal Content Admin Page

**Files:**
- Create: `src/app/[locale]/(app)/portal-content/page.tsx`
- Create: `src/app/[locale]/(app)/portal-content/portal-content-client.tsx`
- Create: `src/components/portal-content/content-form.tsx`
- Modify: `src/components/layout/sidebar.tsx` (add nav item)

**Step 1: Create server page**

Fetch all `portal_content` rows ordered by sort_order. Also fetch active countries for the form dropdown.

**Step 2: Create client component**

- DataTable with columns: Title, Content Type (badge), Country, Visa Type, Published (toggle), Actions
- Filters: Content Type dropdown, Country dropdown, Published status
- Search by title
- "Add Article" button

**Step 3: Create content form**

Create `src/components/portal-content/content-form.tsx`:
- Zod schema: `title` (required), `content` (required, rich text), `content_type` (enum), `country` (optional), `visa_type` (optional), `sort_order` (number), `is_published` (boolean)
- Use a `<Textarea>` with generous rows for content (not a full WYSIWYG — keep it simple for now, HTML content like the existing documents page)
- Dialog form, larger size: `sm:max-w-2xl`

**Step 4: Add sidebar nav item to the portal group**

```typescript
import { BookOpen } from "lucide-react";

// Add to portal group:
{ label: t("portalContent"), href: "/portal-content", icon: BookOpen },
```

**Step 5: Verify in browser**

**Step 6: Commit**

```bash
git add src/app/[locale]/(app)/portal-content/ src/components/portal-content/ src/components/layout/sidebar.tsx
git commit -m "feat: add portal content management admin page"
```

---

## Task 6: Modern Mobile Upload Component

This is a reusable component used by both the apply wizard and the returning customer upload page.

**Files:**
- Create: `src/components/portal/document-upload-card.tsx`

**Step 1: Build the DocumentUploadCard component**

Create `src/components/portal/document-upload-card.tsx`:

Props interface:
```typescript
interface DocumentUploadCardProps {
  label: string;
  description?: string;
  isRequired: boolean;
  status: "pending" | "uploaded" | "approved" | "rejected";
  adminNote?: string | null;
  existingFileName?: string | null;
  onUpload: (file: File) => Promise<{ success: boolean; error?: string }>;
  delay?: number;
}
```

Features to implement:
- **Drop zone** with drag-and-drop (desktop) and tap-to-select (mobile)
- **Camera button** using `<input type="file" accept="image/*,application/pdf,.heic" capture="environment">`
- **Client-side image compression** using `browser-image-compression`:
  ```typescript
  import imageCompression from "browser-image-compression";

  const options = { maxSizeMB: 2, maxWidthOrHeight: 2048, useWebWorker: true };
  const compressed = await imageCompression(file, options);
  ```
- **Instant preview**: thumbnail for images, icon for PDFs
- **Progress states**: empty (gray dashed border) → compressing (blue pulse) → uploading (progress bar) → uploaded (green check) → rejected (red with note + re-upload)
- **Status badge** in top-right corner of the card
- **Framer Motion** animations for transitions
- **Responsive**: full-width on mobile, card grid on desktop

Follow the animation style from the existing `upload-client.tsx` but enhance with:
- Compression step before upload
- Status indicators
- Admin rejection note display
- Re-upload button when rejected
- Required/optional badge

**Step 2: Verify component renders in isolation (temporarily import in a test page)**

**Step 3: Commit**

```bash
git add src/components/portal/document-upload-card.tsx
git commit -m "feat: add mobile-first document upload card component with compression"
```

---

## Task 7: Portal Server Actions for V2

**Files:**
- Modify: `src/app/[locale]/(portal)/portal/actions.ts` (add new server actions)

**Step 1: Add new server actions**

Add these functions to the existing `actions.ts`:

```typescript
// Types
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

// --- New Actions ---

export async function getActiveCountries(): Promise<CountryOption[]> { ... }
// Fetch countries where is_active = true, ordered by sort_order

export async function getChecklist(country: string, visaType: string): Promise<ChecklistItem[]> { ... }
// Fetch document_checklists where country and visa_type match, ordered by sort_order

export async function getPortalContent(country: string, visaType: string | null): Promise<PortalContentItem[]> { ... }
// Fetch portal_content where:
//   (country matches OR country IS NULL) AND (visa_type matches OR visa_type IS NULL)
//   AND is_published = true
// Ordered by sort_order

export async function createPortalApplication(data: {
  full_name: string;
  id_number: string;
  date_of_birth: string;
  phone: string;
  email: string;
  passport_no: string;
  passport_expiry: string;
  country: string;
  visa_type: string;
}): Promise<{ trackingCode: string | null; applicationId: number | null; error: string | null }> { ... }
// Insert into applications with source='portal', visa_status='beklemede'
// After insert, auto-populate application_documents from the matching checklist
// Return the tracking_code

export async function uploadPortalDocument(
  trackingCode: string,
  documentId: number,
  formData: FormData
): Promise<{ success: boolean; error: string | null }> { ... }
// Validate tracking code, validate documentId belongs to this application
// Upload file to portal-uploads bucket: {application_id}/{documentId}/{filename}
// Update application_documents row: file_path, file_name, file_size, mime_type, status='uploaded', uploaded_at

export async function getApplicationDocuments(
  trackingCode: string
): Promise<{ documents: ApplicationDocument[]; error: string | null }> { ... }
// Fetch application_documents for the application matching this tracking code
// Join with document_checklists to get names/descriptions for checklist-based items
// Return combined list
```

**Step 2: Verify each action works by running `npm run build` (type checks)**

**Step 3: Commit**

```bash
git add src/app/[locale]/(portal)/portal/actions.ts
git commit -m "feat: add portal v2 server actions (checklist, content, apply, upload)"
```

---

## Task 8: Enhanced Portal Landing Page

**Files:**
- Modify: `src/app/[locale]/(portal)/portal/portal-client.tsx`

**Step 1: Enhance the portal landing page**

Modify the existing portal-client.tsx to add a second entry path. The page should now show:

1. **Title & branding** (keep existing animated header)
2. **Two cards side by side** (stacked on mobile):
   - **Card 1: "I have a tracking code"** — the existing search input + button (move it into a card)
   - **Card 2: "Start new application"** — a prominent card with a button that links to `/portal/apply`
3. **Divider** with "or" text between them on mobile

Keep the existing animations and styling. Use the same glass-morphism card style (rounded-2xl, backdrop-blur-md, border-slate-200/60).

Use `useTranslations("portalApply")` for the new text and keep `useTranslations("portal")` for existing text.

Use `Link` from `@/i18n/navigation` for the "Start new application" link.

**Step 2: Verify in browser**

**Step 3: Commit**

```bash
git add src/app/[locale]/(portal)/portal/portal-client.tsx
git commit -m "feat: enhance portal landing with two-path entry (tracking code + new application)"
```

---

## Task 9: Portal Apply Wizard — Step 1 (Country Selection)

**Files:**
- Create: `src/app/[locale]/(portal)/portal/apply/page.tsx`
- Create: `src/app/[locale]/(portal)/portal/apply/apply-client.tsx`

**Step 1: Create the server page**

Create `src/app/[locale]/(portal)/portal/apply/page.tsx`:
- Fetch active countries using the `getActiveCountries()` server action
- Pass countries to client component

**Step 2: Create the wizard client component**

Create `src/app/[locale]/(portal)/portal/apply/apply-client.tsx`:

This is a single client component that manages all 5 wizard steps via React state.

```typescript
"use client";

// State:
const [step, setStep] = useState(1); // 1-5
const [selectedCountry, setSelectedCountry] = useState<string>("");
const [selectedVisaType, setSelectedVisaType] = useState<string>("");
const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
const [guides, setGuides] = useState<PortalContentItem[]>([]);
const [guideAcknowledged, setGuideAcknowledged] = useState(false);
const [personalInfo, setPersonalInfo] = useState<PersonalInfoData | null>(null);
const [trackingCode, setTrackingCode] = useState<string>("");
const [applicationId, setApplicationId] = useState<number | null>(null);
```

**Step 1 UI (Country + Visa Type selection):**
- **Progress bar** at top showing steps 1-5
- **Country grid**: responsive grid of cards, each showing flag_emoji + country name
- On country select → show visa type selection (radio cards: Turistik, Ticari, Kultur, Ziyaret, Diger)
- On visa type select → fetch checklist (`getChecklist(country, visaType)`) and guides (`getPortalContent(country, visaType)`)
- If checklist is empty, show warning message and "Contact Us" link
- If checklist has items, enable "Next" button
- Animate transitions with Framer Motion

**Step 3: Verify step 1 renders and country selection works**

**Step 4: Commit**

```bash
git add src/app/[locale]/(portal)/portal/apply/
git commit -m "feat: add portal apply wizard - step 1 country selection"
```

---

## Task 10: Portal Apply Wizard — Steps 2-5

**Files:**
- Modify: `src/app/[locale]/(portal)/portal/apply/apply-client.tsx` (add remaining steps)

**Step 1: Implement Step 2 (Read Guide)**

- Display portal content articles for the selected country + visa type
- Each article rendered as a card with title + HTML content (use `dangerouslySetInnerHTML` with DOMPurify or render as plain text)
- Checkbox at bottom: "I have read and understood the above information"
- "Next" button only enabled when checkbox is checked
- If no guides exist, auto-skip to step 3

**Step 2: Implement Step 3 (Personal Info Form)**

- React Hook Form + Zod validation
- Fields: full_name (required), id_number, date_of_birth, phone (required), email, passport_no, passport_expiry
- On submit: save to local state and advance to step 4
- Do NOT submit to server yet — that happens at step 4

**Step 3: Implement Step 4 (Upload Documents)**

- Show checklist items as `<DocumentUploadCard>` components (from Task 6)
- Each card's `onUpload` stores the file locally (or uploads immediately and saves the reference)
- Progress indicator: "X of Y required documents uploaded"
- "Submit Application" button at the bottom — this is where the server call happens:
  1. Call `createPortalApplication(personalInfo + country + visaType)`
  2. On success, get back trackingCode and applicationId
  3. Then upload each collected file via `uploadPortalDocument(trackingCode, documentId, formData)`
  4. Advance to step 5

**Step 4: Implement Step 5 (Confirmation)**

- Big success animation (checkmark with spring animation)
- Display tracking code prominently in a styled box
- "Copy Code" button (uses `navigator.clipboard.writeText()`)
- Warning text: "Save this code!"
- "Go to My Application" button → links to `/portal/{trackingCode}`

**Step 5: Add "Back" navigation**

Each step (except 1) should have a back button. Step state is managed in React state so going back preserves selections.

**Step 6: Verify full wizard flow end-to-end**

**Step 7: Commit**

```bash
git add src/app/[locale]/(portal)/portal/apply/apply-client.tsx
git commit -m "feat: complete portal apply wizard (guide, info, upload, confirmation)"
```

---

## Task 11: Enhanced Portal Status Page (Returning Customers)

**Files:**
- Modify: `src/app/[locale]/(portal)/portal/[trackingCode]/status-client.tsx`
- Modify: `src/app/[locale]/(portal)/portal/[trackingCode]/page.tsx`

**Step 1: Fetch additional data in server page**

In the server page (`page.tsx`), after looking up the application, also fetch:
- `getApplicationDocuments(trackingCode)` — document progress
- `getPortalContent(application.country, application.visa_type)` — guides

Pass all three (application, documents, guides) to StatusClient.

**Step 2: Add Document Progress section to status page**

Below the existing status timeline, add a new collapsible section "Document Progress":
- Overall progress bar: "4 of 7 required documents uploaded"
- List of each document requirement as a mini-card:
  - Name + description
  - Status badge (pending/uploaded/approved/rejected)
  - If rejected: show admin_note in red + "Re-upload" button
  - If custom request from admin (checklist_item_id is null): show "New from your consultant" badge
  - Upload/re-upload button links to the enhanced upload page

**Step 3: Add Guides section**

Below documents, add "Guides & Instructions" expandable section:
- Render portal content articles (same as wizard step 2)

**Step 4: Verify returning customer flow**

**Step 5: Commit**

```bash
git add src/app/[locale]/(portal)/portal/[trackingCode]/
git commit -m "feat: enhance portal status page with document progress and guides"
```

---

## Task 12: Enhanced Portal Upload Page (Returning Customers)

**Files:**
- Modify: `src/app/[locale]/(portal)/portal/[trackingCode]/upload/page.tsx`
- Modify: `src/app/[locale]/(portal)/portal/[trackingCode]/upload/upload-client.tsx`

**Step 1: Update server page to fetch document requirements**

Fetch `getApplicationDocuments(trackingCode)` and pass to client alongside the application.

**Step 2: Replace the upload client**

Replace the existing two-zone upload (passport_photo, visa_photo) with the full document checklist upload:
- Show each `ApplicationDocument` as a `<DocumentUploadCard>`
- Each card's `onUpload` calls `uploadPortalDocument(trackingCode, doc.id, formData)`
- Progress indicator at top
- Keep the beautiful animations from the existing component

**Step 3: Verify upload flow**

**Step 4: Commit**

```bash
git add src/app/[locale]/(portal)/portal/[trackingCode]/upload/
git commit -m "feat: replace portal upload with full document checklist upload"
```

---

## Task 13: Application Detail — Document Review Section (Admin)

**Files:**
- Modify: `src/components/applications/application-detail.tsx`

**Step 1: Add "Portal Documents" section to the application detail sheet**

After the existing info sections, add a new section:
- Header: "Portal Documents" with progress badge "4/7"
- List of application_documents for this application
- Each document shows:
  - Name (from checklist item or custom_name)
  - Status badge with color coding
  - If uploaded: "Download" link + "Approve" / "Reject" buttons
  - If rejected: shows the admin_note
- "Add Custom Requirement" button at the bottom
  - Opens a simple dialog: custom_name, custom_description, is_required
  - Inserts into application_documents with checklist_item_id = null

**Step 2: Implement approve/reject actions**

- Approve: updates status to 'approved', sets reviewed_at
- Reject: opens a dialog for admin_note, updates status to 'rejected', sets reviewed_at and admin_note

**Step 3: Auto-populate documents when application country/visa_type is set**

When viewing an application that has no application_documents yet but has a country + visa_type that matches a checklist, offer a button: "Load document requirements" that auto-populates the application_documents from the checklist.

**Step 4: Verify admin can view, approve, reject, and add custom requirements**

**Step 5: Commit**

```bash
git add src/components/applications/application-detail.tsx
git commit -m "feat: add document review section to application detail (approve/reject/custom)"
```

---

## Task 14: Applications DataTable — Doc Progress Column

**Files:**
- Modify: `src/app/[locale]/(app)/applications/page.tsx` (fetch document counts)
- Modify: `src/app/[locale]/(app)/applications/applications-client.tsx` (add column)

**Step 1: Fetch document progress in server page**

After fetching applications, also fetch document counts per application:
```sql
SELECT application_id,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status IN ('uploaded', 'approved')) as completed
FROM application_documents
GROUP BY application_id
```

Merge the counts into the application rows.

**Step 2: Add "Docs" column to the applications DataTable**

Add a column between status and actions:
- Shows "4/7" badge
- Color: green if all complete, yellow if partial, gray if none or no requirements
- Tooltip: "4 of 7 documents uploaded"

**Step 3: Verify column renders correctly**

**Step 4: Commit**

```bash
git add src/app/[locale]/(app)/applications/
git commit -m "feat: add document progress column to applications datatable"
```

---

## Task 15: Final Wiring & Cleanup

**Files:**
- Modify: `src/components/layout/sidebar.tsx` (finalize nav group)
- Modify: `src/middleware.ts` (ensure /portal/apply skips auth)
- Modify: `CLAUDE.md` (update project status)

**Step 1: Verify middleware handles /portal/apply**

The existing middleware checks `pathname.includes("/portal")` — since `/portal/apply` contains `/portal`, it should already be skipped. Verify this is the case. If not, update the check.

**Step 2: Finalize sidebar navigation**

Ensure the "Customer Portal" group has:
```
Customer Portal
  - Document Checklists
  - Portal Content
  - Countries
```

**Step 3: Update CLAUDE.md**

Update the project status section to reflect the new portal v2 features:
- Add new routes to the structure
- Update "FULLY FUNCTIONAL" count
- Add new tables to the database schema section
- Update the roadmap (mark completed items)

**Step 4: Run `npm run build` to verify everything compiles**

**Step 5: Commit**

```bash
git add src/components/layout/sidebar.tsx src/middleware.ts CLAUDE.md
git commit -m "feat: finalize portal v2 wiring, sidebar nav, and update project docs"
```

---

## Implementation Order & Dependencies

```
Task 1 (DB Migration) ──┐
                         ├── Task 2 (i18n + deps)
                         │     │
                         │     ├── Task 3 (Countries admin)
                         │     ├── Task 4 (Checklists admin)
                         │     ├── Task 5 (Portal content admin)
                         │     │
                         │     ├── Task 6 (Upload component)
                         │     │     │
                         │     │     ├── Task 7 (Server actions)
                         │     │     │     │
                         │     │     │     ├── Task 8 (Portal landing)
                         │     │     │     ├── Task 9 (Wizard step 1)
                         │     │     │     ├── Task 10 (Wizard steps 2-5)
                         │     │     │     ├── Task 11 (Status page)
                         │     │     │     └── Task 12 (Upload page)
                         │     │     │
                         │     │     └── Task 13 (Admin doc review)
                         │     │
                         │     └── Task 14 (DataTable column)
                         │
                         └── Task 15 (Final wiring)
```

**Parallelizable groups:**
- Tasks 3, 4, 5 can run in parallel (independent admin pages)
- Tasks 6 and 7 can run in parallel (component + server actions)
- Tasks 8, 9 can run in parallel with 11, 12 (portal entry vs status page)
- Task 13 can run in parallel with 10 (admin side vs portal side)
