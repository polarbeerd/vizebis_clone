# Group Applications, Notes & Form Redesign — Design

## Goal

Three changes to the portal and admin panel:
1. **Group applications** — families/groups apply together sharing one consulate city and travel date
2. **Application notes** — quick-add timeline notes per application in admin
3. **Step 3 form cleanup** — remove "Application Details" section card, make visa type and city regular fields

## Architecture

### Portal Wizard Flow (Revised)

| Step | Individual | Group |
|------|-----------|-------|
| **1. Country** | Click country card → go to Step 2 immediately (no "Next" button) | Same |
| **2. Guide** | Videos + key points, "Devam" to proceed | Same |
| **3. Choice** | "Bireysel mi, Grup mu?" — click card → go directly (no "Next") | Same screen |
| **4a. Form** | Visa type dropdown at top (dynamically loads fields). City is a regular dropdown. Fill → Submit → Confirmation | — |
| **4b. Folder** | — | Create folder: group name, city, travel dates. Then folder view with applicant cards |
| **4b-i. Add** | — | Member form (visa type + dynamic fields, minus city & travel dates). "Devam" → back to folder |
| **4b-ii. Review** | — | Cards per member (name, passport, ID, DOB) with Edit/Delete. "Basvuru Ekle" for more. "Gonder" submits all |

Single-click navigation: country selection and individual/group choice both navigate immediately on click. No selection highlight + next button pattern.

### Data Model

**New table: `application_groups`**

```sql
CREATE TABLE application_groups (
  id              SERIAL PRIMARY KEY,
  group_name      TEXT NOT NULL,
  country         TEXT NOT NULL,
  application_city TEXT NOT NULL,
  travel_dates    JSONB,
  tracking_code   TEXT UNIQUE NOT NULL,
  status          TEXT DEFAULT 'draft',  -- draft | submitted
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

**applications table — new column:**

```sql
ALTER TABLE applications ADD COLUMN group_id INTEGER REFERENCES application_groups(id);
```

- `group_id` is NULL for individual apps
- Group members each get their own applications row + tracking_code
- Group also has its own tracking_code for viewing all members

**New table: `application_notes`**

```sql
CREATE TABLE application_notes (
  id              SERIAL PRIMARY KEY,
  application_id  INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  category        TEXT DEFAULT 'internal',  -- internal | client_followup | consulate
  is_pinned       BOOLEAN DEFAULT false,
  author_id       UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

### Step 3 Form Changes

- Remove the "Application Details" `SectionCard` (the one with city segmented control + visa type dropdown)
- Visa type: regular dropdown at the very top of the form. Selecting it fetches dynamic fields for that visa type
- Application city: regular dropdown below visa type (for individual) or inherited from folder (for group)
- All dynamic sections render below as today (Personal Details, Birth Info, Passport, etc.)

### Group Folder UI — Customer Side

**Step 3: Individual/Group Choice**

Two cards side by side:
- Bireysel Basvuru (User icon) — "Tek kisi icin basvuru"
- Grup Basvurusu (Users icon) — "Aile veya grup icin basvuru"

Click → navigate immediately, no selection state.

**Folder Creation Form**

Three fields:
- Grup Adi — text input, placeholder: "Yasaroglu Ailesi"
- Basvuru Sehri — dropdown (city list)
- Seyahat Tarihleri — travel dates smart field

"Klasor Olustur" creates the group (status=draft) and shows folder view.

**Folder View**

- Header: group name + country flag + city + travel dates
- Applicant cards: full name (bold), passport no | ID no | birth date, visa type badge, Duzenle + Sil buttons
- Empty state if no members yet
- "+ Basvuru Ekle" button
- Bottom bar: member count on left, "Gonder" submit button on right (disabled if 0 members)

**Add Member Form**

- Visa type dropdown at top (loads dynamic fields)
- All personal fields in sections (same as individual form)
- NO application city field (from folder)
- NO travel dates field (from folder)
- "Devam" saves member, returns to folder view
- Edit mode: same form pre-filled

### Application Notes — Admin Side

A "Notes" tab in the application detail dialog:

- Pinned notes at top (if any)
- Chronological list below (newest first): content, author name, category badge, relative timestamp, pin/unpin toggle
- Quick-add input at bottom: text input + category dropdown + send button
- Plain text only, no rich text editor

### Admin Dashboard — Group Visibility

- Group apps appear as individual rows in the applications table (normal search/filter)
- "Group" badge on rows with group_id, showing group name
- Clicking the badge opens a popover/dialog showing all members of that group

## Files to Modify/Create

### New files
- `src/components/portal/group-folder-view.tsx` — folder view + member cards
- `src/components/portal/group-folder-form.tsx` — folder creation form
- `src/components/applications/notes-tab.tsx` — admin notes timeline + quick-add
- DB migration for application_groups, application_notes, group_id column

### Modified files
- `src/app/[locale]/(portal)/portal/apply/apply-client.tsx` — new step 3 (choice), form cleanup, group flow
- `src/app/[locale]/(portal)/portal/actions.ts` — createGroup, addGroupMember, submitGroup actions
- `src/components/applications/application-form.tsx` — add Notes tab
- `src/components/applications/application-detail.tsx` — group badge
- `src/app/[locale]/(app)/applications/applications-client.tsx` — group badge in table
- `messages/en.json` + `messages/tr.json` — new i18n keys
