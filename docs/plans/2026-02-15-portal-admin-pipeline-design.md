# Portal Admin Pipeline — Design Document

## Context

Unusual Consulting's portal is a one-shot data collection form for visa applicants. Customers are directed from a WhatsApp bot to fill out the portal form, submit, and the consultant handles everything from there via WhatsApp/phone. The collected data feeds into an auto-fill bot that enters it into the Denmark embassy site (applyvisa.um.dk) and VFS appointment system.

**Current gaps:**
- Smart field data (nationality, address, employment, etc.) stored in `custom_fields._smart` JSONB is invisible in the admin panel
- No JSON export for the auto-fill bot
- No way to distinguish portal vs admin-created applications
- Portal confirmation page over-emphasizes tracking code (customers don't need it)

## Design

### 1. Simplify Portal Confirmation (Step 4)

Strip down the post-submit confirmation:
- Animated checkmark (keep)
- "Your application has been received successfully"
- "Our team will contact you via WhatsApp"
- Subtle reference number (small text, for internal use if customer calls)
- "Submit Another Application" button
- Remove: tracking code emphasis, "save this code" warnings, "Go to Portal" button

Tracking code still generated in DB for admin use.

### 2. Admin Portal Data Tab

Add a "Portal Data" tab to the Application Detail sheet.

**Content:** Flat, editable list of all portal-submitted data:
- Custom regular fields from `custom_fields` (non-smart, non-underscore keys)
- Smart field data from `custom_fields._smart`, flattened
- Application city from `custom_fields.application_city`

**Rendering:** Simple key-value rows with editable inputs. Labels from `portal_field_definitions` for regular fields; hardcoded labels for smart field sub-keys (with i18n).

**Save:** Admin edits any value, clicks Save, writes back to `custom_fields` JSONB.

### 3. JSON Export API + Copy Button

**A) Server action:** `getApplicationExport(applicationId)` returns flat JSON merging:
- Standard columns (full_name, phone, email, passport_no, etc.)
- Custom fields (flattened from JSONB)
- Smart field data (flattened — e.g. `employment_status.employer_name` becomes `employer_name`)

**B) API route:** `GET /api/applications/[id]/export` returns the same JSON (for bot consumption).

**C) Copy JSON button:** In Application Detail, a button that copies the flattened JSON to clipboard.

Field mapping to embassy-specific names deferred to future work.

### 4. Source Badge + Filter

- Fetch `source` column in applications page query
- Show "Portal" (blue badge) or "Admin" (gray badge) on each table row
- Add `source` to filterable columns in the DataTable toolbar

## What We're NOT Building

- No portal dashboard / magic links / OTP (customers don't return)
- No email/SMS notifications (consultant uses WhatsApp)
- No document upload changes (text fields only for now)
- No field mapping config table (bot uses portal keys directly for now)
- No group entry support (individual only for now)

## Success Criteria

1. Admin can see every field a customer submitted (including smart fields) in the detail sheet
2. Admin can edit any portal-submitted field and save
3. Bot can call an API endpoint with application ID and receive flat JSON
4. Admin can visually distinguish portal vs admin applications and filter by source
5. Portal confirmation is clean and simple — no tracking code stress
6. `npm run build` passes clean
