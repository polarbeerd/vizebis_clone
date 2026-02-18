# Group Applications, Notes & Form Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add group application support (families apply together sharing city/travel dates), application notes timeline in admin, and clean up Step 3 form to remove the Application Details section card.

**Architecture:** New `application_groups` and `application_notes` tables. Portal wizard gets a new step (Individual/Group choice). Group flow adds a "folder" concept where members are added one by one with shared city/travel dates. Admin gets a Notes tab in the application detail dialog and a Group badge in the table. Country selection and Individual/Group choice use single-click navigation (no selection + next button).

**Tech Stack:** Next.js App Router, Supabase (PostgreSQL), React Hook Form + Zod, Framer Motion, next-intl, shadcn/ui, TanStack Table

---

### Task 1: DB Migration — application_groups, application_notes, group_id

**Files:**
- Create: `supabase/migrations/012_group_apps_and_notes.sql`

**Step 1: Write and apply the migration**

```sql
-- Group applications
CREATE TABLE application_groups (
  id               SERIAL PRIMARY KEY,
  group_name       TEXT NOT NULL,
  country          TEXT NOT NULL,
  application_city TEXT NOT NULL,
  travel_dates     JSONB,
  tracking_code    TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  status           TEXT DEFAULT 'draft',
  created_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE application_groups ENABLE ROW LEVEL SECURITY;

-- Service role (portal) can insert/read groups
CREATE POLICY "Service role manages groups"
  ON application_groups FOR ALL
  USING (true)
  WITH CHECK (true);

-- Link applications to groups
ALTER TABLE applications ADD COLUMN group_id INTEGER REFERENCES application_groups(id);

-- Application notes
CREATE TABLE application_notes (
  id              SERIAL PRIMARY KEY,
  application_id  INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  category        TEXT DEFAULT 'internal',
  is_pinned       BOOLEAN DEFAULT false,
  author_id       UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE application_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users manage notes"
  ON application_notes FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
```

Apply via Supabase MCP `apply_migration` with name `group_apps_and_notes`.

**Step 2: Verify**

Run `SELECT column_name FROM information_schema.columns WHERE table_name = 'application_groups'` and `SELECT column_name FROM information_schema.columns WHERE table_name = 'application_notes'` via Supabase MCP to confirm tables exist.

**Step 3: Commit**

```bash
git add supabase/migrations/012_group_apps_and_notes.sql
git commit -m "feat: add application_groups, application_notes tables + group_id column"
```

---

### Task 2: i18n keys for all new features

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/tr.json`

**Step 1: Add keys to both files**

Under `"portalApply"` namespace, add these keys:

```json
"stepChoice": "Application Type",
"choiceTitle": "How would you like to apply?",
"choiceSubtitle": "Select your application type",
"individualTitle": "Individual Application",
"individualDesc": "Apply for a single person",
"groupTitle": "Group Application",
"groupDesc": "Apply for a family or group",

"groupFolderTitle": "Create Group Folder",
"groupFolderSubtitle": "Set up shared details for your group",
"groupNameLabel": "Group Name",
"groupNamePlaceholder": "Yasaroglu Ailesi",
"groupCityLabel": "Application City",
"groupTravelLabel": "Travel Dates",
"createFolder": "Create Folder",

"folderMemberCount": "{count} Applications",
"folderEmpty": "No applications yet. Add your first group member.",
"addMember": "Add Application",
"submitGroup": "Submit",
"editMember": "Edit",
"deleteMember": "Delete",
"memberVisa": "Visa Type",
"memberPassport": "Passport No",
"memberId": "ID No",
"memberDob": "Date of Birth",

"groupSubmittedTitle": "Group Application Submitted!",
"groupSubmittedSubtitle": "Your group application has been submitted successfully.",
"groupTrackingCode": "Group Reference",

"visaTypeLabel": "Visa Type",
"visaTypePlaceholder": "Select visa type..."
```

Turkish translations under the same keys:

```json
"stepChoice": "Basvuru Turu",
"choiceTitle": "Nasil basvurmak istersiniz?",
"choiceSubtitle": "Basvuru turunuzu secin",
"individualTitle": "Bireysel Basvuru",
"individualDesc": "Tek kisi icin basvuru",
"groupTitle": "Grup Basvurusu",
"groupDesc": "Aile veya grup icin basvuru",

"groupFolderTitle": "Grup Klasoru Olustur",
"groupFolderSubtitle": "Grubunuz icin ortak bilgileri ayarlayin",
"groupNameLabel": "Grup Adi",
"groupNamePlaceholder": "Yasaroglu Ailesi",
"groupCityLabel": "Basvuru Sehri",
"groupTravelLabel": "Seyahat Tarihleri",
"createFolder": "Klasor Olustur",

"folderMemberCount": "{count} Basvuru",
"folderEmpty": "Henuz basvuru yok. Ilk grup uyesini ekleyin.",
"addMember": "Basvuru Ekle",
"submitGroup": "Gonder",
"editMember": "Duzenle",
"deleteMember": "Sil",
"memberVisa": "Vize Turu",
"memberPassport": "Pasaport No",
"memberId": "TC Kimlik No",
"memberDob": "Dogum Tarihi",

"groupSubmittedTitle": "Grup Basvurusu Gonderildi!",
"groupSubmittedSubtitle": "Grup basvurunuz basariyla gonderildi.",
"groupTrackingCode": "Grup Referans Numarasi",

"visaTypeLabel": "Vize Turu",
"visaTypePlaceholder": "Vize turu secin..."
```

Also add under `"applications"` namespace:

```json
"notesTab": "Notes" / "Notlar",
"addNote": "Add note..." / "Not ekle...",
"noteCategories": {
  "internal": "Internal" / "Dahili",
  "client_followup": "Client Follow-up" / "Musteri Takibi",
  "consulate": "Consulate" / "Konsolosluk"
},
"pinNote": "Pin" / "Sabitle",
"unpinNote": "Unpin" / "Kaldir",
"groupBadge": "Group" / "Grup",
"groupMembers": "Group Members" / "Grup Uyeleri"
```

**Step 2: Verify**

Run `npm run build` — should pass clean with no missing key errors.

**Step 3: Commit**

```bash
git add messages/en.json messages/tr.json
git commit -m "feat: add i18n keys for group apps, notes, and form redesign"
```

---

### Task 3: Server actions — group CRUD + member management

**Files:**
- Modify: `src/app/[locale]/(portal)/portal/actions.ts`

**Step 1: Add group server actions**

Add these functions after the existing `createPortalApplication`:

```typescript
// ── Group Actions ──────────────────────────────────

export async function createGroup(data: {
  groupName: string;
  country: string;
  applicationCity: string;
  travelDates: Record<string, unknown>;
}): Promise<{ groupId: number | null; trackingCode: string | null; error: string | null }> {
  const supabase = createServiceClient();
  const { data: group, error } = await supabase
    .from("application_groups")
    .insert({
      group_name: data.groupName,
      country: data.country,
      application_city: data.applicationCity,
      travel_dates: data.travelDates,
      status: "draft",
    })
    .select("id, tracking_code")
    .single();

  if (error) return { groupId: null, trackingCode: null, error: error.message };
  return { groupId: group.id, trackingCode: group.tracking_code, error: null };
}

export async function addGroupMember(data: {
  groupId: number;
  standardFields: Record<string, string>;
  customFields: Record<string, string>;
  smartFieldData?: Record<string, unknown>;
  country: string;
  visa_type: string;
  applicationCity: string;
  travelDates: Record<string, unknown>;
}): Promise<{ memberId: number | null; trackingCode: string | null; error: string | null }> {
  // Reuse the same field mapping logic as createPortalApplication
  const supabase = createServiceClient();

  const std = data.standardFields;
  const fullName = [std.name, std.surname].filter(Boolean).join(" ");

  const standardInsert: Record<string, unknown> = {};
  if (fullName) standardInsert.full_name = fullName;
  if (std.phone) standardInsert.phone = std.phone;
  if (std.email) standardInsert.email = std.email;
  if (std.id_number) standardInsert.id_number = std.id_number;
  if (std.date_of_birth) standardInsert.date_of_birth = std.date_of_birth;
  if (std.passport_no) standardInsert.passport_no = std.passport_no;
  const expiry = std.passport_expiry ?? std.date_expiry;
  if (expiry) standardInsert.passport_expiry = expiry;

  // Merge custom fields + smart data + group-shared fields
  const mergedCustom: Record<string, unknown> = { ...data.customFields };
  mergedCustom.application_city = data.applicationCity;
  if (data.smartFieldData && Object.keys(data.smartFieldData).length > 0) {
    mergedCustom._smart = data.smartFieldData;
  }
  // Inject group's travel dates into smart data
  if (data.travelDates) {
    const smart = (mergedCustom._smart as Record<string, unknown>) ?? {};
    smart.travel_dates = data.travelDates;
    mergedCustom._smart = smart;
  }

  const { data: app, error } = await supabase
    .from("applications")
    .insert({
      ...standardInsert,
      custom_fields: mergedCustom,
      country: data.country,
      visa_type: data.visa_type,
      visa_status: "beklemede",
      source: "portal",
      payment_status: "odenmedi",
      invoice_status: "fatura_yok",
      currency: "TL",
      consulate_fee: 0,
      service_fee: 0,
      group_id: data.groupId,
    })
    .select("id, tracking_code")
    .single();

  if (error) return { memberId: null, trackingCode: null, error: error.message };

  // Auto-populate application_documents
  const { data: checklist } = await supabase
    .from("document_checklists")
    .select("id")
    .eq("country", data.country)
    .eq("visa_type", data.visa_type);

  if (checklist && checklist.length > 0) {
    const docs = checklist.map((c: { id: number }) => ({
      application_id: app.id,
      checklist_item_id: c.id,
      status: "pending",
    }));
    await supabase.from("application_documents").insert(docs);
  }

  return { memberId: app.id, trackingCode: app.tracking_code, error: null };
}

export async function getGroupMembers(groupId: number) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("applications")
    .select("id, full_name, passport_no, id_number, date_of_birth, visa_type, tracking_code")
    .eq("group_id", groupId)
    .order("created_at", { ascending: true });

  if (error) return [];
  return data ?? [];
}

export async function deleteGroupMember(applicationId: number) {
  const supabase = createServiceClient();
  const { error } = await supabase.from("applications").delete().eq("id", applicationId);
  return { error: error?.message ?? null };
}

export async function submitGroup(groupId: number) {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("application_groups")
    .update({ status: "submitted" })
    .eq("id", groupId);
  return { error: error?.message ?? null };
}
```

**Step 2: Verify**

Run `npm run build` — should compile with no errors.

**Step 3: Commit**

```bash
git add "src/app/[locale]/(portal)/portal/actions.ts"
git commit -m "feat: add server actions for group CRUD and member management"
```

---

### Task 4: Form cleanup — remove Application Details section, single-click country

**Files:**
- Modify: `src/app/[locale]/(portal)/portal/apply/apply-client.tsx`

This task handles:
1. Country cards click → go to next step immediately (no selection highlight + Next)
2. Remove the "Application Details" `SectionCard` (city segmented control + visa type dropdown)
3. Add visa type dropdown and city dropdown as bare fields at the top of the form

**Step 1: Make country selection single-click**

In the country cards grid (around line 804-860), change the `onClick` handler on each country card. Instead of `setSelectedCountry(c.name)`, make it set the country AND advance:

```typescript
onClick={() => {
  setSelectedCountry(c.name);
  // Fetch guides for this country, then advance
  fetchGuides(c.name);
}}
```

Where `fetchGuides` is extracted from the existing `goNextFromStep1` logic: it calls `getPortalContent(country)` and advances to step 2.

Remove the "Next" button from Step 1 entirely. Remove the `canProceedStep1` gating. Remove the selected-country highlight/checkmark pattern — just use a subtle hover effect.

**Step 2: Remove Application Details SectionCard**

Delete the entire `SectionCard` block at lines ~1020-1123 that contains the "Application Details" title, city segmented control / dropdown, and visa type select.

**Step 3: Add visa type + city as bare fields at the top of Step 3 form**

Before the `renderSectionedForm()` call, render:

```tsx
{/* Visa type — controls which fields appear */}
<div className="mb-2">
  <Label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
    {t("visaTypeLabel")} <span className="text-red-500">*</span>
  </Label>
  <Select value={selectedVisaType} onValueChange={handleVisaTypeChange}>
    <SelectTrigger className="h-11 rounded-xl border-slate-200/80 dark:border-slate-700/80">
      <SelectValue placeholder={t("visaTypePlaceholder")} />
    </SelectTrigger>
    <SelectContent>
      {visaTypes.map((vt) => (
        <SelectItem key={vt} value={vt}>{vt}</SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>

{/* Application city */}
<div className="mb-6">
  <Label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
    {t("applicationCity")} <span className="text-red-500">*</span>
  </Label>
  <Select value={selectedCity} onValueChange={setSelectedCity}>
    <SelectTrigger className="h-11 rounded-xl border-slate-200/80 dark:border-slate-700/80">
      <SelectValue placeholder={t("applicationCity")} />
    </SelectTrigger>
    <SelectContent>
      {cities.map((c) => (
        <SelectItem key={c.value} value={c.value}>
          {locale === "tr" ? c.label_tr : c.label_en}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>

{/* Dynamic form sections */}
{selectedVisaType && renderSectionedForm()}
```

Remove the `SegmentedControl` import if no longer used elsewhere. Remove the `SEGMENTED_THRESHOLD` usage.

**Step 4: Verify**

Run `npm run build` — should pass clean.

**Step 5: Commit**

```bash
git add "src/app/[locale]/(portal)/portal/apply/apply-client.tsx"
git commit -m "feat: single-click country, remove Application Details section, bare visa/city fields"
```

---

### Task 5: Individual/Group choice step

**Files:**
- Modify: `src/app/[locale]/(portal)/portal/apply/apply-client.tsx`

**Step 1: Add the choice step**

Update the wizard steps from 4 to 5. Add a new step between "guide" and "info":

Update `ALL_STEPS`:
```typescript
const ALL_STEPS = [
  { id: "country", key: "stepCountry", icon: Globe },
  { id: "guide", key: "stepGuide", icon: FileText },
  { id: "choice", key: "stepChoice", icon: Users },
  { id: "info", key: "stepInfo", icon: User },
  { id: "confirmation", key: "stepConfirmation", icon: CheckCircle2 },
] as const;
```

Add state:
```typescript
const [applicationType, setApplicationType] = useState<"individual" | "group" | null>(null);
```

Render the choice step (when `step === 3`): two motion cards side by side, User icon + Users icon. Click → set applicationType + advance step. No Next button.

```tsx
{step === 3 && (
  <motion.div key="step-choice" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.25 }}>
    <div className="mb-6 text-center sm:mb-8">
      <h2 className="text-xl font-bold">{t("choiceTitle")}</h2>
      <p className="mt-1.5 text-sm text-slate-500">{t("choiceSubtitle")}</p>
    </div>
    <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
      {[
        { type: "individual" as const, icon: User, title: t("individualTitle"), desc: t("individualDesc") },
        { type: "group" as const, icon: Users, title: t("groupTitle"), desc: t("groupDesc") },
      ].map((opt) => (
        <motion.button
          key={opt.type}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            setApplicationType(opt.type);
            setStep(4);
          }}
          className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200/60 bg-white/70 p-6 shadow-sm backdrop-blur-md transition-colors hover:border-[#FEBEBF] dark:border-slate-700/60 dark:bg-slate-900/70"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FEBEBF]/20">
            <opt.icon className="h-7 w-7 text-brand-600" />
          </div>
          <span className="text-base font-semibold text-slate-900 dark:text-white">{opt.title}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">{opt.desc}</span>
        </motion.button>
      ))}
    </div>
  </motion.div>
)}
```

Update step 4 rendering: if `applicationType === "individual"`, show the form. If `applicationType === "group"`, show the group folder flow (Task 6).

Update step numbering throughout (step > 1 for guide complete, step > 2 for choice complete, etc.).

**Step 2: Verify**

Run `npm run build` — should pass clean.

**Step 3: Commit**

```bash
git add "src/app/[locale]/(portal)/portal/apply/apply-client.tsx"
git commit -m "feat: add Individual/Group choice step with single-click navigation"
```

---

### Task 6: Group folder creation form

**Files:**
- Create: `src/components/portal/group-folder-form.tsx`

**Step 1: Create the component**

This component renders when `applicationType === "group"` and no folder exists yet. It has three fields: group name (text input), application city (Select from cities config), travel dates (TravelDates smart field).

```tsx
"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TravelDates } from "@/components/portal/smart-fields/travel-dates";
import { getCitiesForCountry, type CityOption } from "@/config/application-cities";
import { usePortalLocale } from "@/components/portal/portal-locale-provider";

interface GroupFolderFormProps {
  country: string;
  onCreateFolder: (data: {
    groupName: string;
    applicationCity: string;
    travelDates: Record<string, unknown>;
  }) => void;
  creating: boolean;
}

export function GroupFolderForm({ country, onCreateFolder, creating }: GroupFolderFormProps) {
  const t = useTranslations("portalApply");
  const { locale } = usePortalLocale();
  const cities = getCitiesForCountry(country);

  const [groupName, setGroupName] = React.useState("");
  const [city, setCity] = React.useState("");
  const [travelDates, setTravelDates] = React.useState<Record<string, unknown>>({});

  const canCreate = groupName.trim() && city && travelDates._valid;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-lg space-y-5"
    >
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FEBEBF]/20">
          <FolderPlus className="h-7 w-7 text-brand-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t("groupFolderTitle")}</h2>
        <p className="mt-1 text-sm text-slate-500">{t("groupFolderSubtitle")}</p>
      </div>

      <div className="space-y-4 rounded-2xl border border-slate-200/60 bg-white/70 p-6 backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-900/70">
        {/* Group name */}
        <div>
          <Label className="mb-1.5 block text-sm font-medium">{t("groupNameLabel")}</Label>
          <Input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder={t("groupNamePlaceholder")}
            className="h-11 rounded-xl"
          />
        </div>

        {/* Application city */}
        <div>
          <Label className="mb-1.5 block text-sm font-medium">{t("groupCityLabel")}</Label>
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue placeholder={t("groupCityLabel")} />
            </SelectTrigger>
            <SelectContent>
              {cities.map((c: CityOption) => (
                <SelectItem key={c.value} value={c.value}>
                  {locale === "tr" ? c.label_tr : c.label_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Travel dates (smart field) */}
        <div>
          <Label className="mb-1.5 block text-sm font-medium">{t("groupTravelLabel")}</Label>
          <TravelDates
            value={travelDates}
            onChange={setTravelDates}
            isRequired={true}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => onCreateFolder({ groupName: groupName.trim(), applicationCity: city, travelDates })}
          disabled={!canCreate || creating}
          className="h-11 rounded-xl bg-[#FEBEBF] text-white px-8 font-semibold shadow-md hover:brightness-90"
        >
          {t("createFolder")}
        </Button>
      </div>
    </motion.div>
  );
}
```

**Step 2: Verify**

Run `npm run build`.

**Step 3: Commit**

```bash
git add src/components/portal/group-folder-form.tsx
git commit -m "feat: group folder creation form component"
```

---

### Task 7: Group folder view — member cards + add/submit

**Files:**
- Create: `src/components/portal/group-folder-view.tsx`

**Step 1: Create the component**

Shows group header, member cards, add button, and submit button. Each card shows name, passport, ID, DOB, visa type + edit/delete buttons.

Props: `groupId`, `groupName`, `country`, `countryFlag`, `city`, `travelDates`, `members` array, `onAddMember`, `onEditMember(memberId)`, `onDeleteMember(memberId)`, `onSubmit`, `submitting`.

Use Framer Motion staggered card animations. Cards use glassmorphism style. Empty state message when no members. Bottom bar with member count left + submit button right.

**Step 2: Verify**

Run `npm run build`.

**Step 3: Commit**

```bash
git add src/components/portal/group-folder-view.tsx
git commit -m "feat: group folder view with member cards"
```

---

### Task 8: Wire group flow into apply wizard

**Files:**
- Modify: `src/app/[locale]/(portal)/portal/apply/apply-client.tsx`

**Step 1: Add group state and handlers**

```typescript
const [groupId, setGroupId] = useState<number | null>(null);
const [groupTrackingCode, setGroupTrackingCode] = useState<string | null>(null);
const [groupMembers, setGroupMembers] = useState<any[]>([]);
const [groupCity, setGroupCity] = useState("");
const [groupTravelDates, setGroupTravelDates] = useState<Record<string, unknown>>({});
const [groupName, setGroupName] = useState("");
const [showMemberForm, setShowMemberForm] = useState(false);
const [editingMemberId, setEditingMemberId] = useState<number | null>(null);
const [creatingFolder, setCreatingFolder] = useState(false);
const [submittingGroup, setSubmittingGroup] = useState(false);
```

**Step 2: Wire folder creation**

When `applicationType === "group"` and `groupId === null`, show `<GroupFolderForm>`. On create:

```typescript
async function handleCreateFolder(data: { groupName: string; applicationCity: string; travelDates: Record<string, unknown> }) {
  setCreatingFolder(true);
  const result = await createGroup({
    groupName: data.groupName,
    country: selectedCountry,
    applicationCity: data.applicationCity,
    travelDates: data.travelDates,
  });
  if (result.error) {
    toast.error(result.error);
  } else {
    setGroupId(result.groupId);
    setGroupTrackingCode(result.trackingCode);
    setGroupCity(data.applicationCity);
    setGroupTravelDates(data.travelDates);
    setGroupName(data.groupName);
  }
  setCreatingFolder(false);
}
```

**Step 3: Wire folder view**

When `groupId` exists and `!showMemberForm`, show `<GroupFolderView>`. Wire add/edit/delete/submit handlers.

When `showMemberForm`, show the same dynamic form as individual (minus city and travel dates fields). Filter out `application_city` from rendered fields and `travel_dates` from smart field assignments when in group mode. On "Devam", call `addGroupMember` server action and refresh members list.

**Step 4: Wire group submission**

```typescript
async function handleSubmitGroup() {
  setSubmittingGroup(true);
  const result = await submitGroup(groupId!);
  if (result.error) {
    toast.error(result.error);
  } else {
    setStep(5); // confirmation step
  }
  setSubmittingGroup(false);
}
```

In the confirmation step, show group tracking code if `applicationType === "group"`.

**Step 5: Verify**

Run `npm run build`.

**Step 6: Commit**

```bash
git add "src/app/[locale]/(portal)/portal/apply/apply-client.tsx"
git commit -m "feat: wire group folder creation, member management, and submission into wizard"
```

---

### Task 9: Application notes tab — admin side

**Files:**
- Create: `src/components/applications/notes-tab.tsx`
- Modify: `src/components/applications/application-form.tsx`

**Step 1: Create notes-tab.tsx**

Component that fetches + displays notes for an application. Contains:
- Pinned notes section (if any)
- Reverse-chronological note list
- Quick-add input at bottom with category select + send button

Each note card: content text, author name (from JOIN with profiles), category badge, relative timestamp (use `formatDistanceToNow` from date-fns with `{ addSuffix: true, locale: tr }`), pin/unpin button.

Uses `createClient()` (browser Supabase) for CRUD since admin is authenticated.

Props: `applicationId: number`

**Step 2: Add Notes tab to application-form.tsx**

Add a new tab after the existing tabs:

```tsx
<TabsTrigger value="notes">{t("notesTab")}</TabsTrigger>
```

And the content:

```tsx
<TabsContent value="notes" className="mt-4">
  {application?.id && <NotesTab applicationId={application.id} />}
</TabsContent>
```

Only show tab when editing an existing application (not when creating new).

**Step 3: Verify**

Run `npm run build`.

**Step 4: Commit**

```bash
git add src/components/applications/notes-tab.tsx
git add "src/components/applications/application-form.tsx"
git commit -m "feat: add application notes tab with timeline and quick-add"
```

---

### Task 10: Group badge in admin applications table

**Files:**
- Modify: `src/app/[locale]/(app)/applications/applications-client.tsx`
- Modify: `src/app/[locale]/(app)/applications/page.tsx`

**Step 1: Fetch group data**

In `page.tsx`, add `group_id` to the applications select. Also fetch `application_groups` for a lookup map:

```typescript
const { data: groups } = await supabase
  .from("application_groups")
  .select("id, group_name");
```

Pass `groups` array to the client component.

**Step 2: Add group column to table**

Add a column after `source` that shows a "Group" badge if the application has a `group_id`. Badge shows the group name. Clicking it could filter the table by that group.

```typescript
{
  accessorKey: "group_id",
  header: () => t("groupBadge"),
  size: 100,
  cell: ({ row }) => {
    const groupId = row.getValue("group_id") as number | null;
    if (!groupId) return null;
    const group = groups.find((g) => g.id === groupId);
    return (
      <Badge variant="outline" className="text-xs cursor-pointer">
        {group?.group_name ?? t("groupBadge")}
      </Badge>
    );
  },
}
```

**Step 3: Verify**

Run `npm run build`.

**Step 4: Commit**

```bash
git add "src/app/[locale]/(app)/applications/applications-client.tsx"
git add "src/app/[locale]/(app)/applications/page.tsx"
git commit -m "feat: add group badge column to admin applications table"
```

---

### Task 11: Final build verification

**Step 1: Full build**

Run `npm run build` and verify zero errors.

**Step 2: Manual testing checklist**

- [ ] Portal: click country → goes directly to Step 2 (no Next button)
- [ ] Portal: Step 3 shows Individual/Group choice cards
- [ ] Portal: click Individual → form with visa type + city dropdowns at top
- [ ] Portal: click Group → folder creation form
- [ ] Portal: create folder → see empty folder view with "Basvuru Ekle"
- [ ] Portal: add member → fill form → "Devam" → see card in folder
- [ ] Portal: add second member → see two cards
- [ ] Portal: edit member → form pre-filled
- [ ] Portal: delete member → card removed
- [ ] Portal: submit group → confirmation with group tracking code
- [ ] Admin: applications table shows "Group" badge for group apps
- [ ] Admin: open application → Notes tab with quick-add input
- [ ] Admin: add a note → appears in timeline
- [ ] Admin: pin a note → floats to top

**Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: address any build or runtime issues from integration"
```
