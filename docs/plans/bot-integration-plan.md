# Bot Integration Plan: vizebis_clone + vfsbot

> **Created:** 2026-02-21
> **Status:** Draft - pending review
> **Scope:** Replace Google Sheets with vizebis as the data source for the Denmark bot, remove booking.com automation, wrap the bot in an HTTP service, add status callbacks, and prepare a multi-country structure.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Field Mapping: vizebis Export -> Denmark CustomerData](#2-field-mapping)
3. [New Folder Structure (Multi-Country Ready)](#3-new-folder-structure)
4. [What to Remove](#4-what-to-remove)
5. [What to Add](#5-what-to-add)
6. [Database Schema: automation_jobs](#6-database-schema)
7. [Hotel Data Flow](#7-hotel-data-flow)
8. [API Contract Between Systems](#8-api-contract)
9. [Step-by-Step Implementation Order](#9-implementation-order)

---

## 1. Architecture Overview

### Current State

```
Google Sheets (customer data)
        |
        v
  vfsbot/denmark/pipeline.ts
        |
        ├── Stage 1: Flight Lookup [placeholder]
        ├── Stage 2: Hotel booking on booking.com [REMOVING]
        ├── Stage 3: MFA form on applyvisa.um.dk [KEEPING]
        └── Stage 4: VFS submission [placeholder]
        |
        v
  Google Sheets (status updates)
```

### Target State

```
vizebis_clone (SaaS platform)
        |
        |  POST /api/jobs  (trigger automation)
        v
  vfsbot/service/ (HTTP server)
        |
        ├── Fetch application data (included in job request from vizebis export)
        ├── Receive hotel details (from vizebis booking_hotels, included in job)
        ├── Run country handler (denmark/handler.ts)
        │     ├── MFA form on applyvisa.um.dk [EXISTING]
        │     └── VFS submission [FUTURE]
        └── POST status callbacks to vizebis webhook
        |
        v
  vizebis_clone/api/automation/webhook (receive status updates)
        |
        v
  automation_jobs table (track progress in Supabase)
```

### Key Design Decisions

1. **Push model for application data**: vizebis fetches the export data and sends it in the job request. The bot service does not need Supabase credentials or direct database access.
2. **Hotel data from vizebis**: The booking_hotels table already has hotel records used for PDF generation. We extend it with fields the MFA form needs (postal_code, city) and include hotel data in the job request.
3. **No real hotel bookings**: vizebis already generates fake booking PDFs via the PDF sidecar service. The bot only needs hotel name/address/phone to fill the MFA form.
4. **Country handler pattern**: Each country is a self-contained module implementing a `CountryHandler` interface, making it easy to add Netherlands, Italy, etc.
5. **Webhook-based status updates**: The bot POSTs status updates to vizebis rather than writing to a shared database.

---

## 2. Field Mapping

### 2.1 vizebis Export Format

`GET /api/applications/[id]/export` returns flat JSON:

- **Standard columns** (24 fields): `id`, `tracking_code`, `full_name`, `id_number`, `date_of_birth`, `phone`, `email`, `passport_no`, `passport_expiry`, `visa_status`, `visa_type`, `country`, `appointment_date`, `appointment_time`, `pickup_date`, `travel_date`, `consulate_app_no`, `consulate_office`, `source`, `consulate_fee`, `service_fee`, `currency`, `created_at`, `updated_at`
- **Custom fields**: Flattened from `applications.custom_fields` JSONB. Key format depends on portal_form_fields configuration.
- **Smart fields**: Nested smart field data flattened as `${sfKey}_${subKey}` (e.g., `nationality_country`, `address_street`, `travel_dates_arrival`).

### 2.2 Denmark CustomerData Interface

```typescript
interface CustomerData {
  // Personal
  firstName: string;
  lastName: string;
  lastNameAtBirth: string;
  dateOfBirth: { day: string; month: string; year: string };
  placeOfBirth: string;
  countryOfBirth: string;      // "Turkey" -> GUID
  nationalId: string;
  nationality: string;         // "Turkey" -> GUID
  gender: string;              // "Male" -> GUID
  civilStatus: string;         // "Single" -> GUID

  // Contact
  address: string;
  postalCode: string;
  city: string;
  country: string;             // "Turkey" -> GUID
  email: string;
  phoneCountryCode: string;
  phoneNumber: string;

  // Employment
  employed: boolean;
  occupation?: string;         // "Employee" -> GUID
  occupationTitle?: string;
  employerName?: string;
  employerAddress?: string;
  employerPostalCode?: string;
  employerCity?: string;
  employerCountry?: string;    // -> GUID
  employerPhoneCountryCode?: string;
  employerPhoneNumber?: string;

  // Passport
  passportNumber: string;
  passportIssuedBy: string;    // -> GUID
  passportIssueDate: { day: string; month: string; year: string };
  passportExpiryDate: { day: string; month: string; year: string };

  // Previous Schengen
  hasPreviousVisa: boolean;
  previousVisaDate?: { day: string; month: string; year: string };
  previousVisaSticker?: string;

  // Travel
  arrivalDate: { day: string; month: string; year: string };
  departureDate: { day: string; month: string; year: string };
  purpose: string;             // "Tourism" -> GUID
  entriesRequested: string;    // "Multiple" -> GUID
  destinationCountry: string;  // "Denmark" -> GUID

  // Office
  office: string;              // "Istanbul" -> GUID

  // Hotel (provided by vizebis, not booked by bot)
  hotel?: {
    name: string;
    address: string;
    postalCode: string;
    city: string;
    country: string;
    email: string;
    phoneCountryCode: string;
    phoneNumber: string;
  };
}
```

### 2.3 Field Mapping Table

The vizebis portal needs its `portal_form_fields` configured for Denmark to collect all required MFA data. The export endpoint flattens these. Here is the mapping from export keys to CustomerData fields.

**Portal form fields that MUST be configured for Denmark** (country="Denmark"):

| vizebis Export Key | Source | Denmark CustomerData Field | Notes |
|---|---|---|---|
| `full_name` | Standard column | Split into `firstName` + `lastName` | Split on last space: "AHMET YILMAZ" -> first="AHMET", last="YILMAZ" |
| `last_name_at_birth` | Custom field | `lastNameAtBirth` | New portal field needed |
| `date_of_birth` | Standard column | `dateOfBirth` | Parse "YYYY-MM-DD" -> {day,month,year} |
| `place_of_birth` | Custom field | `placeOfBirth` | New portal field needed |
| `nationality_country` | Smart field (nationality) | `countryOfBirth`, `nationality` | Smart field template already exists |
| `id_number` | Standard column | `nationalId` | TC Kimlik number |
| `gender` | Custom field | `gender` | "Male" / "Female" |
| `civil_status` | Custom field | `civilStatus` | "Single" / "Married" / "Divorced" / "Separated" |
| `address_street` | Smart field (address) | `address` | Smart field template |
| `address_postal_code` | Smart field (address) | `postalCode` | Smart field template |
| `address_city` | Smart field (address) | `city` | Smart field template |
| `address_country` | Smart field (address) | `country` | Smart field template |
| `email` | Standard column | `email` | Direct mapping |
| `phone` | Standard column | `phoneCountryCode` + `phoneNumber` | Parse: "00905397486886" -> code="0090", number="5397486886" |
| `employed` | Custom field | `employed` | "Yes" -> true |
| `occupation` | Custom field | `occupation` | "Employee", "Doctor", etc. |
| `occupation_title` | Custom field | `occupationTitle` | Free text |
| `employer_name` | Custom field | `employerName` | Free text |
| `employer_address` | Custom field | `employerAddress` | Free text |
| `employer_postal_code` | Custom field | `employerPostalCode` | Free text |
| `employer_city` | Custom field | `employerCity` | Free text |
| `employer_country` | Custom field | `employerCountry` | Country name |
| `employer_phone` | Custom field | `employerPhoneCountryCode` + `employerPhoneNumber` | Parse like phone |
| `passport_no` | Standard column | `passportNumber` | Direct mapping |
| `passport_issued_by` | Custom field | `passportIssuedBy` | Country name |
| `passport_issue_date` | Custom field | `passportIssueDate` | Parse date -> {day,month,year} |
| `passport_expiry` | Standard column | `passportExpiryDate` | Parse date -> {day,month,year} |
| `has_previous_visa` | Custom field | `hasPreviousVisa` | "Yes" -> true |
| `previous_visa_date` | Custom field | `previousVisaDate` | Parse date |
| `previous_visa_sticker` | Custom field | `previousVisaSticker` | Free text |
| `travel_date` | Standard column | `arrivalDate` | Parse date |
| `travel_return_date` | Custom field | `departureDate` | New portal field needed |
| `purpose` | Custom field | `purpose` | "Tourism" / "Business" / "Family Visit" |
| `entries_requested` | Custom field | `entriesRequested` | "Multiple" / "Single" |
| `destination_country` | Custom field | `destinationCountry` | Defaults to "Denmark" |
| `consulate_office` | Standard column | `office` | "Istanbul" / "Ankara" / "Izmir" |

### 2.4 Field Mapping Implementation

Create `countries/denmark/field-mapping.ts`:

```typescript
// Transformer: vizebis export JSON -> Denmark CustomerData
export function mapExportToCustomerData(
  exportData: Record<string, unknown>,
  hotelData: HotelDetails
): CustomerData {
  return {
    firstName: extractFirstName(exportData.full_name as string),
    lastName: extractLastName(exportData.full_name as string),
    lastNameAtBirth: (exportData.last_name_at_birth as string) ||
                     extractLastName(exportData.full_name as string),
    dateOfBirth: parseDate(exportData.date_of_birth as string),
    placeOfBirth: exportData.place_of_birth as string,
    countryOfBirth: exportData.nationality_country as string || 'Turkey',
    nationalId: exportData.id_number as string,
    nationality: exportData.nationality_country as string || 'Turkey',
    gender: exportData.gender as string || 'Male',
    civilStatus: exportData.civil_status as string || 'Single',
    // ... (all fields mapped similarly)
    hotel: hotelData,
  };
}
```

### 2.5 Portal Form Fields to Create for Denmark

Before the bot integration works, the following portal_form_fields must exist for country="Denmark" in vizebis:

**Missing fields that need to be added to the portal form:**
- `last_name_at_birth` (short text)
- `place_of_birth` (short text)
- `gender` (dropdown: Male/Female)
- `civil_status` (dropdown: Single/Married/Divorced/Separated)
- `employed` (radio: Yes/No)
- `occupation` (dropdown: Employee, Doctor, Teacher, etc.)
- `occupation_title` (short text)
- `employer_name`, `employer_address`, `employer_postal_code`, `employer_city`, `employer_country`, `employer_phone` (short text / dropdown)
- `passport_issued_by` (dropdown: countries)
- `passport_issue_date` (date)
- `has_previous_visa` (radio: Yes/No)
- `previous_visa_date` (date)
- `previous_visa_sticker` (short text)
- `travel_return_date` (date) - departure/return date
- `purpose` (dropdown: Tourism/Business/Family Visit)
- `entries_requested` (radio: Multiple/Single)
- `destination_country` (dropdown, default Denmark)

**Fields already collectible via existing standard columns or smart fields:**
- `full_name` (standard column)
- `date_of_birth` (standard column)
- `email` (standard column)
- `phone` (standard column)
- `passport_no` (standard column)
- `passport_expiry` (standard column)
- `travel_date` (standard column -> arrival date)
- `consulate_office` (standard column)
- `id_number` (standard column)
- Address fields (smart field template: address)
- Nationality (smart field template: nationality)

---

## 3. New Folder Structure

### Target Structure (Multi-Country Ready)

```
vfsbot/
├── service/                          # NEW: HTTP service layer
│   ├── index.ts                      #   Server entry point (start Express)
│   ├── server.ts                     #   Express app setup + middleware
│   ├── routes/
│   │   ├── jobs.ts                   #   POST /jobs, GET /jobs/:id
│   │   └── health.ts                 #   GET /health
│   ├── vizebis-client.ts             #   (Optional) Fetch data from vizebis API
│   ├── status-reporter.ts            #   POST status callbacks to vizebis webhook
│   ├── job-runner.ts                 #   Job executor (picks country handler, runs pipeline)
│   └── types.ts                      #   JobRequest, JobStatus, WebhookPayload types
│
├── countries/                        # NEW: Country-specific automation modules
│   ├── types.ts                      #   CountryHandler interface
│   ├── registry.ts                   #   Maps country name -> handler module
│   └── denmark/                      #   Denmark (migrated from denmark/src/)
│       ├── config.ts                 #   GUIDs, URLs, timing (sheets/hotel config REMOVED)
│       ├── handler.ts                #   DenmarkHandler implements CountryHandler
│       ├── field-mapping.ts          #   vizebis export -> CustomerData transformer
│       ├── mfa/
│       │   ├── application.ts        #   19-step MFA form automation (UNCHANGED)
│       │   └── gmail.ts              #   Gmail activation + OTP (UNCHANGED)
│       └── vfs/
│           └── submission.ts         #   VFS Denmark submission (PLACEHOLDER)
│
├── denmark/                          # OLD location — DELETE after migration
│   └── ...
│
├── src/                              # Turkey bot (UNTOUCHED — maintenance mode)
│   └── ...
├── python-bot/                       # Registration specialist (UNTOUCHED)
├── dashboard/                        # Turkey dashboard (UNTOUCHED)
└── docs/
    └── strategies/                   # Research docs (UNTOUCHED)
```

### CountryHandler Interface

```typescript
// countries/types.ts
export interface CountryHandler {
  /** Country name matching vizebis countries table */
  country: string;

  /** Convert vizebis export data to country-specific customer format */
  mapFields(
    exportData: Record<string, unknown>,
    hotelData: HotelDetails
  ): unknown;  // Each country defines its own shape

  /** Run the automation pipeline for a single customer */
  run(
    customerData: unknown,
    options: RunOptions
  ): AsyncGenerator<StageUpdate>;
  // AsyncGenerator yields status updates as the pipeline progresses

  /** Which stages this country supports */
  stages: string[];
}
```

### Adding a New Country (Future)

To add Netherlands:
1. Create `countries/netherlands/` with `config.ts`, `handler.ts`, `field-mapping.ts`
2. Register in `countries/registry.ts`
3. Configure portal_form_fields in vizebis for country="Netherlands"
4. Done — the HTTP server and job runner work automatically

---

## 4. What to Remove

### From vfsbot

| File/Module | Reason |
|---|---|
| `denmark/src/sheets/reader.ts` | Google Sheets data source replaced by vizebis export API |
| `denmark/src/sheets/writer.ts` | Status tracking replaced by webhook callbacks to vizebis |
| `denmark/src/hotel/booking.ts` | Real hotel booking replaced by vizebis booking_hotels data |
| `denmark/src/pipeline.ts` | Replaced by `service/job-runner.ts` + `countries/denmark/handler.ts` |
| `denmark/src/index.ts` | Replaced by `service/index.ts` (HTTP server entry) |
| `denmark/src/config.ts` — `SHEETS_CONFIG` | Google Sheets config no longer needed |
| `denmark/src/config.ts` — `HOTELS`, `CARD_CONFIG`, `pickHotel()` | Booking.com config no longer needed |
| `denmark/src/config.ts` — `HotelOption` type | Replaced by `HotelDetails` from vizebis |
| `denmark/google-forms-spec.md` | Google Forms no longer used |
| `denmark/recordings/booking-flow.js` | Booking.com recording no longer needed |

### From vfsbot dependencies (package.json)

| Package | Reason |
|---|---|
| `googleapis` | No more Google Sheets/Gmail API for sheets (Gmail still needed for MFA OTP) |

**Note:** `googleapis` is still needed for Gmail OTP in MFA — only the Sheets usage is removed. Keep the package.

### From vfsbot environment variables

| Variable | Reason |
|---|---|
| `DENMARK_SHEET_ID` | Google Sheets no longer used |
| `CARD_HOLDER_NAME` | No more booking.com reservations |
| `CARD_NUMBER` | No more booking.com reservations |
| `CARD_EXPIRY` | No more booking.com reservations |
| `CARD_CVC` | No more booking.com reservations |

### New environment variables for vfsbot

| Variable | Purpose |
|---|---|
| `BOT_API_KEY` | API key for authenticating requests from vizebis |
| `BOT_PORT` | HTTP server port (default: 3002) |

---

## 5. What to Add

### 5.1 vfsbot — HTTP Server (`service/`)

**Framework:** Express.js (already familiar from the Turkey dashboard)

**Endpoints:**

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/jobs` | Create a new automation job |
| `GET` | `/jobs/:id` | Get job status |
| `POST` | `/jobs/:id/cancel` | Cancel a running job |
| `GET` | `/health` | Health check |

**Auth:** API key in `Authorization: Bearer <BOT_API_KEY>` header.

### 5.2 vfsbot — Status Reporter (`service/status-reporter.ts`)

Replaces Google Sheets writer. POSTs status updates to vizebis webhook endpoint.

```typescript
export async function reportStatus(
  callbackUrl: string,
  webhookSecret: string,
  payload: WebhookPayload
): Promise<void> {
  await fetch(callbackUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${webhookSecret}`,
    },
    body: JSON.stringify(payload),
  });
}
```

### 5.3 vfsbot — Job Runner (`service/job-runner.ts`)

Replaces the pipeline.ts orchestrator. Receives a job request, looks up the country handler, runs the pipeline, and reports status via webhooks.

```typescript
export async function executeJob(job: JobRequest): Promise<void> {
  const handler = getCountryHandler(job.country);

  // Map vizebis export data to country-specific format
  const customerData = handler.mapFields(job.application_data, job.hotel_data);

  // Run automation, yielding status updates
  for await (const update of handler.run(customerData, job.options)) {
    await reportStatus(job.callback_url, job.webhook_secret, {
      job_id: job.job_id,
      application_id: job.application_id,
      ...update,
    });
  }
}
```

### 5.4 vizebis_clone — Automation API Endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/automation/jobs` | Trigger a bot job (fetches export, sends to bot) |
| `GET` | `/api/automation/jobs/[id]` | Get job status from automation_jobs table |
| `POST` | `/api/automation/webhook` | Receive status callbacks from bot |
| `GET` | `/api/automation/hotel-data/[country]` | Get hotel details for a country (used internally) |

### 5.5 vizebis_clone — Automation UI (application detail page)

Add to the existing application detail page (`/applications/[id]`):
- "Start Automation" button (triggers POST to `/api/automation/jobs`)
- Job status display (polls `/api/automation/jobs/[id]`)
- Stage progress indicator (MFA step X/19, VFS status)
- Error display with retry option

---

## 6. Database Schema

### 6.1 New Table: `automation_jobs`

```sql
-- ============================================================
-- 015_automation_jobs.sql
-- Tracks bot automation jobs triggered from the admin panel.
-- ============================================================

CREATE TABLE IF NOT EXISTS automation_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  country         TEXT NOT NULL,

  -- Status
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'queued', 'running', 'completed', 'failed', 'cancelled')),

  -- Stage tracking
  current_stage     TEXT,              -- 'mfa', 'vfs'
  stage_progress    TEXT,              -- 'Step 12/19 - Passport Details'
  stages_completed  JSONB DEFAULT '{}',
  -- Example: {
  --   "mfa": { "status": "completed", "case_number": "DK-2026-12345" },
  --   "vfs": { "status": "running" }
  -- }

  -- Results
  mfa_case_number     TEXT,
  vfs_confirmation    TEXT,

  -- Error
  error_message   TEXT,
  error_stage     TEXT,

  -- Metadata
  triggered_by    UUID,              -- profiles.id of admin who triggered
  bot_instance_id TEXT,              -- Which bot service instance handled this

  -- Timestamps
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_automation_jobs_application_id ON automation_jobs(application_id);
CREATE INDEX idx_automation_jobs_status ON automation_jobs(status);
CREATE INDEX idx_automation_jobs_country ON automation_jobs(country);

-- RLS
ALTER TABLE automation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated access" ON automation_jobs
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Service role access" ON automation_jobs
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
```

### 6.2 Extend `booking_hotels` Table

The MFA form needs structured hotel details — postal code, city, and phone country code as **separate input fields**. Currently these are embedded in free-text columns:

- `address` contains everything: `"Arne Jacobsens Allé 4, Amager Vest, 2300 Copenhagen, Denmark"`
- `phone` contains the country code baked in: `"004532465710"`

We need to split these out so the bot can fill each MFA form field individually.

```sql
-- ============================================================
-- 016_booking_hotels_mfa_fields.sql
-- Split address and phone into structured fields needed by
-- bot automation to fill MFA accommodation step (Step 15).
-- ============================================================

ALTER TABLE booking_hotels ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE booking_hotels ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE booking_hotels ADD COLUMN IF NOT EXISTS phone_country_code TEXT;
-- `phone` column already exists — will now store local number only (e.g. "32465710")
-- `address` column already exists — will now store street only (e.g. "Arne Jacobsens Allé 4")
-- `country` column already exists (from migration 014)
```

**After migration:**
- Update the hotel form component (`components/booking-templates/hotel-form.tsx`) to add 3 new input fields: postal_code, city, phone_country_code
- Change the `address` field label to "Street address" (no longer includes city/postal/country)
- Change the `phone` field label to "Phone number (local, without country code)"
- Backfill the existing "Cabinn Apartments" record:
  - `address`: `"Arne Jacobsens Allé 4"` (was full address string)
  - `postal_code`: `"2300"`
  - `city`: `"Copenhagen"`
  - `phone_country_code`: `"0045"`
  - `phone`: `"32465710"` (was `"004532465710"`)

---

## 7. Hotel Data Flow

### Current Flow (being removed)
```
Bot -> booking.com -> real hotel reservation -> hotel details for MFA form
```

### New Flow
```
1. Admin creates hotel in vizebis Booking Templates page
   - Street address, postal code, city entered as SEPARATE fields
   - Phone country code and local number entered SEPARATELY
   - Same hotel record also holds the PDF template for fake booking generation

2. When portal application is submitted:
   - vizebis picks a hotel (country-aware) from booking_hotels
   - vizebis generates a fake booking PDF via the PDF sidecar
   - generated_documents row records which hotel_id was used

3. When admin triggers automation:
   - vizebis looks up the hotel used for this application's booking PDF
     (generated_documents WHERE application_id=X AND type='booking_pdf' -> hotel_id)
   - Joins with booking_hotels to get structured hotel details
   - Hotel details are included in the job request to the bot
   - Bot uses these details for MFA Step 15 (accommodation)
```

### Hotel Lookup Query (vizebis job creation endpoint)

```sql
SELECT bh.name, bh.address, bh.postal_code, bh.city, bh.country,
       bh.email, bh.phone_country_code, bh.phone
FROM generated_documents gd
JOIN booking_hotels bh ON bh.id = gd.hotel_id
WHERE gd.application_id = $1
  AND gd.type = 'booking_pdf'
ORDER BY gd.created_at DESC
LIMIT 1;
```

### Hotel Details in Job Request

```typescript
interface HotelDetails {
  name: string;           // "Cabinn Apartments"
  address: string;        // "Arne Jacobsens Allé 4"  (street only)
  postalCode: string;     // "2300"
  city: string;           // "Copenhagen"
  country: string;        // "Denmark"
  email: string;          // "apartments@cabinn.com"
  phoneCountryCode: string; // "0045"
  phoneNumber: string;    // "32465710"  (local number only)
}
```

This replaces the hardcoded `HOTELS` array and `pickHotel()` in the old config.ts. The bot no longer picks hotels — vizebis already picked one when generating the booking PDF, and the same hotel details are passed to the bot for the MFA form.

---

## 8. API Contract

### 8.1 vizebis -> bot: Trigger Job

```
POST {BOT_SERVICE_URL}/jobs
Authorization: Bearer {BOT_API_KEY}
Content-Type: application/json
```

**Request:**
```json
{
  "job_id": "uuid-generated-by-vizebis",
  "application_id": 123,
  "country": "Denmark",
  "callback_url": "https://vizebis.example.com/api/automation/webhook",
  "webhook_secret": "whsec_...",
  "stages": ["mfa", "vfs"],
  "dry_run": false,
  "headless": true,
  "application_data": {
    "id": 123,
    "tracking_code": "UC-2026-001",
    "full_name": "AHMET YILMAZ",
    "id_number": "12345678901",
    "date_of_birth": "1990-05-15",
    "phone": "00905397486886",
    "email": "ahmet@gmail.com",
    "passport_no": "U28878098",
    "passport_expiry": "2033-08-03",
    "country": "Denmark",
    "visa_type": "Tourism",
    "consulate_office": "Istanbul",
    "travel_date": "2026-04-14",
    "last_name_at_birth": "YILMAZ",
    "place_of_birth": "ISTANBUL",
    "gender": "Male",
    "civil_status": "Single",
    "nationality_country": "Turkey",
    "address_street": "ATATURK CAD. NO:5",
    "address_postal_code": "34100",
    "address_city": "ISTANBUL",
    "address_country": "Turkey",
    "employed": "Yes",
    "occupation": "Employee",
    "occupation_title": "SOFTWARE ENGINEER",
    "employer_name": "ACME LTD",
    "employer_address": "LEVENT MAH",
    "employer_postal_code": "34330",
    "employer_city": "ISTANBUL",
    "employer_country": "Turkey",
    "employer_phone": "00902121234567",
    "passport_issued_by": "Turkey",
    "passport_issue_date": "2023-08-03",
    "has_previous_visa": "Yes",
    "previous_visa_date": "2023-05-12",
    "previous_visa_sticker": "GRC009770450",
    "travel_return_date": "2026-04-21",
    "purpose": "Tourism",
    "entries_requested": "Multiple",
    "destination_country": "Denmark"
  },
  "hotel_data": {
    "name": "Copenhagen Marriott Hotel",
    "address": "Kalvebod Brygge 5",
    "postalCode": "1560",
    "city": "Copenhagen",
    "country": "Denmark",
    "email": "copenhagen.marriott@marriott.com",
    "phoneCountryCode": "0045",
    "phoneNumber": "88332100"
  }
}
```

**Response (immediate):**
```json
{
  "job_id": "uuid",
  "status": "queued",
  "message": "Job accepted"
}
```

**Error Response:**
```json
{
  "error": "Missing required field: application_data.full_name",
  "status": 400
}
```

### 8.2 bot -> vizebis: Status Webhook

```
POST {callback_url}
Authorization: Bearer {webhook_secret}
Content-Type: application/json
```

**Payload:**
```json
{
  "job_id": "uuid",
  "application_id": 123,
  "status": "running",
  "current_stage": "mfa",
  "stage_progress": "Step 12/19 - Passport Details",
  "stages_completed": {
    "mfa": { "status": "running", "step": 12, "total_steps": 19 }
  },
  "mfa_case_number": null,
  "vfs_confirmation": null,
  "error_message": null,
  "timestamp": "2026-02-21T14:30:00Z"
}
```

**Status values:** `queued` | `running` | `completed` | `failed` | `cancelled`

**Stage status values:** `pending` | `running` | `completed` | `failed` | `skipped`

**Terminal webhook (success):**
```json
{
  "job_id": "uuid",
  "application_id": 123,
  "status": "completed",
  "current_stage": "mfa",
  "stages_completed": {
    "mfa": { "status": "completed", "case_number": "DK-2026-12345" }
  },
  "mfa_case_number": "DK-2026-12345",
  "timestamp": "2026-02-21T14:45:00Z"
}
```

**Terminal webhook (failure):**
```json
{
  "job_id": "uuid",
  "application_id": 123,
  "status": "failed",
  "current_stage": "mfa",
  "stage_progress": "Step 8/19 - Contact Details",
  "error_message": "No GUID mapping for civilStatus=\"Widowed\". Available: Single, Married, Divorced, Separated.",
  "error_stage": "mfa",
  "timestamp": "2026-02-21T14:32:00Z"
}
```

### 8.3 vizebis: Job Creation Flow (internal)

When admin clicks "Start Automation" on an application:

```
1. POST /api/automation/jobs  (vizebis internal API route)
   Body: { application_id: 123, stages: ["mfa"] }

2. Server-side:
   a. Fetch application export:  GET /api/applications/123/export
   b. Look up hotel for this application:
      - Find generated_documents where application_id=123 AND type='booking_pdf'
      - Join with booking_hotels on hotel_id
      - Extract hotel details (name, address, postal_code, city, country, email, phone_country_code, phone)
   c. Create automation_jobs row (status='pending')
   d. POST to bot service: {BOT_SERVICE_URL}/jobs with full payload
   e. Update automation_jobs status='queued'
   f. Return job_id to client

3. Bot processes job, sends webhook callbacks
4. Webhook handler updates automation_jobs row with each callback
5. Client polls GET /api/automation/jobs/{id} for status
```

### 8.4 vizebis: Get Job Status

```
GET /api/automation/jobs/{id}
Authorization: (Supabase auth cookie)
```

**Response:**
```json
{
  "id": "uuid",
  "application_id": 123,
  "country": "Denmark",
  "status": "running",
  "current_stage": "mfa",
  "stage_progress": "Step 15/19 - Accommodation",
  "stages_completed": {
    "mfa": { "status": "running", "step": 15, "total_steps": 19 }
  },
  "mfa_case_number": null,
  "vfs_confirmation": null,
  "error_message": null,
  "triggered_by": "admin-user-uuid",
  "started_at": "2026-02-21T14:30:00Z",
  "created_at": "2026-02-21T14:29:55Z"
}
```

---

## 9. Step-by-Step Implementation Order

### Phase 1: Database & vizebis Backend (vizebis_clone)

**Step 1.1: Database migration — automation_jobs table**
- Create `supabase/migrations/015_automation_jobs.sql`
- Apply migration to Supabase project
- Fields: id, application_id, country, status, current_stage, stage_progress, stages_completed, mfa_case_number, vfs_confirmation, error_message, error_stage, triggered_by, bot_instance_id, started_at, completed_at, created_at, updated_at

**Step 1.2: Database migration — extend booking_hotels**
- Create `supabase/migrations/016_booking_hotels_mfa_fields.sql`
- Add columns: `postal_code`, `city`, `phone_country_code`
- Backfill existing "Cabinn Apartments" record:
  - Split `address` "Arne Jacobsens Allé 4, Amager Vest, 2300 Copenhagen, Denmark" -> street only
  - Extract `postal_code` = "2300", `city` = "Copenhagen"
  - Split `phone` "004532465710" -> `phone_country_code` = "0045", `phone` = "32465710"

**Step 1.3: Update hotel form UI**
- Add `postal_code`, `city`, `phone_country_code` input fields to the hotel form component in `components/booking-templates/hotel-form.tsx`
- Update Zod schema to include the new fields
- Change `address` label to "Street address"
- Change `phone` label to "Phone number (without country code)"
- Add `phone_country_code` field with placeholder "0045"

**Step 1.4: Build webhook receiver endpoint**
- Create `src/app/api/automation/webhook/route.ts`
- Validates webhook_secret, updates automation_jobs row
- This can be built and tested independently

**Step 1.5: Build job creation endpoint**
- Create `src/app/api/automation/jobs/route.ts` (POST handler)
- Fetches application export, looks up hotel data, creates automation_jobs row, sends to bot
- Create `src/app/api/automation/jobs/[id]/route.ts` (GET handler)
- Returns job status from automation_jobs table

**Step 1.6: Configure Denmark portal form fields**
- Add all required portal_form_fields for country="Denmark" via the Portal Form Fields admin page
- Ensure the export endpoint returns all fields the bot needs
- Test with a sample application submission

### Phase 2: Bot Restructuring (vfsbot)

**Step 2.1: Create new directory structure**
- Create `service/` directory
- Create `countries/` directory
- Create `countries/denmark/` directory

**Step 2.2: Migrate Denmark automation**
- Move `denmark/src/config.ts` -> `countries/denmark/config.ts`
  - Remove: SHEETS_CONFIG, HOTELS, CARD_CONFIG, HotelOption, pickHotel()
  - Keep: MFA_URLS, GUID maps, MFA_FIELDS, TIMING, GMAIL_CONFIG, CustomerData, resolveGuid, generateEmailAlias, generatePassword
- Move `denmark/src/mfa/` -> `countries/denmark/mfa/` (unchanged)
- Move `denmark/src/vfs/` -> `countries/denmark/vfs/` (unchanged)
- Update all import paths

**Step 2.3: Create field mapping**
- Create `countries/denmark/field-mapping.ts`
- Implement `mapExportToCustomerData()` using the mapping table from Section 2
- Include date parsing (YYYY-MM-DD -> {day,month,year})
- Include phone parsing (full number -> country code + number)
- Include name splitting (full_name -> first + last)

**Step 2.4: Create country handler**
- Create `countries/types.ts` with `CountryHandler` interface
- Create `countries/denmark/handler.ts` implementing the interface
- Create `countries/registry.ts` with Denmark registered

**Step 2.5: Delete old files**
- Delete `denmark/src/sheets/` (reader.ts, writer.ts)
- Delete `denmark/src/hotel/booking.ts`
- Delete `denmark/src/pipeline.ts`
- Delete `denmark/src/index.ts`
- Delete `denmark/google-forms-spec.md`
- Delete `denmark/recordings/booking-flow.js`
- Keep `denmark/recordings/mfa-flow.js` (reference, or move to countries/denmark/recordings/)

### Phase 3: Bot HTTP Service (vfsbot)

**Step 3.1: Create HTTP server**
- Create `service/server.ts` — Express app with JSON body parsing
- Create `service/index.ts` — Entry point, starts server
- Add API key auth middleware

**Step 3.2: Create job routes**
- Create `service/routes/jobs.ts`
  - `POST /jobs` — Validate request, spawn job runner
  - `GET /jobs/:id` — Return in-memory job status
  - `POST /jobs/:id/cancel` — Set cancellation flag

**Step 3.3: Create status reporter**
- Create `service/status-reporter.ts`
- Replaces sheets/writer.ts functionality
- POSTs status updates to vizebis callback URL

**Step 3.4: Create job runner**
- Create `service/job-runner.ts`
- Receives job request, resolves country handler, runs pipeline
- Reports status at each stage transition
- Handles errors gracefully, always sends terminal webhook

**Step 3.5: Create health endpoint**
- Create `service/routes/health.ts`
- Returns server status, active job count

### Phase 4: Integration & Testing

**Step 4.1: End-to-end test with dry run**
- Start bot service: `pnpm tsx service/index.ts`
- Create a test application in vizebis portal
- Trigger automation from vizebis admin
- Verify: job created, data sent to bot, field mapping works, status callbacks received
- Use `--dry-run` to fill forms without submitting

**Step 4.2: Verify field mapping completeness**
- Submit a complete Denmark portal application in vizebis
- Export the data: `GET /api/applications/[id]/export`
- Run field mapper manually, check every CustomerData field is populated
- Fix any missing/mismatched fields

**Step 4.3: Full MFA automation test**
- Run with a real customer dataset (non-dry-run)
- Verify all 19 MFA form steps fill correctly
- Verify status callbacks update automation_jobs table
- Verify case number extraction and final callback

**Step 4.4: Error handling test**
- Test with missing fields (should fail gracefully)
- Test with invalid GUID mappings (should report clear error)
- Test network failures (webhook delivery retry)
- Test bot service restart during a running job

### Phase 5: UI (vizebis_clone)

**Step 5.1: Add automation controls to application detail page**
- "Start Automation" button on application detail page
- Only shown when country is supported (Denmark for now)
- Confirms action before triggering

**Step 5.2: Job status display**
- Real-time-ish status display (poll every 5s)
- Stage progress indicator
- MFA step counter (Step X/19)
- Success/error state with details

**Step 5.3: Job history**
- List of past automation jobs for this application
- Retry failed jobs button
- Download screenshots (if bot saves them to a shared location)

### Phase 6: Cleanup & Documentation

**Step 6.1: Update CLAUDE.md files**
- Update `vfsbot/CLAUDE.md` — document new service/ and countries/ structure
- Update `vfsbot/denmark/CLAUDE.md` -> `vfsbot/countries/denmark/CLAUDE.md`
- Update `vizebis_clone/CLAUDE.md` — document automation_jobs, new API routes

**Step 6.2: Update environment variable documentation**
- Document new env vars: BOT_API_KEY, BOT_PORT, BOT_SERVICE_URL, WEBHOOK_SECRET
- Remove deprecated: DENMARK_SHEET_ID, CARD_* vars

**Step 6.3: Remove old denmark/ directory**
- After confirming countries/denmark/ works, delete the old denmark/ directory
- Update any remaining import paths

---

## Appendix A: Environment Variables Summary

### vfsbot (bot service)

```env
# Server
BOT_PORT=3002
BOT_API_KEY=bot_sk_...              # Shared secret with vizebis

# Gmail (existing — still needed for MFA OTP)
GMAIL_REFRESH_TOKEN=xxx
GMAIL_ACCOUNT=deniz19369@gmail.com

# Removed:
# DENMARK_SHEET_ID        (Google Sheets replaced)
# CARD_HOLDER_NAME        (booking.com removed)
# CARD_NUMBER             (booking.com removed)
# CARD_EXPIRY             (booking.com removed)
# CARD_CVC                (booking.com removed)
```

### vizebis_clone

```env
# Existing (unchanged)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
PDF_SERVICE_URL=...
GEMINI_API_KEY=...

# New
BOT_SERVICE_URL=http://localhost:3002    # Bot service base URL
BOT_API_KEY=bot_sk_...                   # Must match bot's BOT_API_KEY
WEBHOOK_SECRET=whsec_...                 # Secret for webhook verification
```

---

## Appendix B: Risk & Considerations

1. **Portal form fields must be complete**: If any required field is missing from the Denmark portal config, the export won't contain it and the MFA form will fail. Validate before triggering automation.

2. **GUID mappings are finite**: The Denmark MFA portal uses GUIDs for dropdown values. New values (e.g., a new occupation, a new country) require manual extraction and addition to config.ts. The bot should fail loudly with a clear message when a mapping is missing.

3. **Hotel data completeness**: The booking_hotels table needs the new postal_code, city, phone_country_code columns filled. Existing hotel records need to be updated with this data.

4. **Single job per application**: Consider enforcing a constraint that only one job can be 'running' per application_id at a time. Prevent accidental double-triggers.

5. **Bot service availability**: The bot service must be running for automation to work. Consider deploying it alongside the PDF sidecar service (e.g., on Railway). Add monitoring and restart policies.

6. **MFA portal changes**: If applyvisa.um.dk changes their form structure, selectors, or GUIDs, the bot will break. The MFA application.ts code is tightly coupled to the current portal layout.

7. **VFS Global shared infrastructure**: The VFS stage (Stage 4, placeholder) will likely share patterns across countries since many use visa.vfsglobal.com. Consider a shared VFS module in `countries/shared/vfs/` when implementing.
