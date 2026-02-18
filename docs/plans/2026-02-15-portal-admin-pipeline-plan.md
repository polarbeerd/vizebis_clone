# Portal Admin Pipeline — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable admins to see/edit all portal-submitted data, export as JSON for the auto-fill bot, filter by source, and simplify the portal confirmation page.

**Architecture:** Add a "Portal Data" section to the existing Application Detail sheet that reads `custom_fields` JSONB, renders as flat editable list, and saves edits back. Create a Next.js API route for JSON export. Add source badge + filter to the applications table. Simplify Step 4 of the apply wizard.

**Tech Stack:** Next.js App Router, Supabase, React, TypeScript, shadcn/ui, next-intl, TanStack Table

---

### Task 1: Add i18n keys for all new features

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/tr.json`

**Step 1:** Add the following keys to `messages/en.json`:

Under `"applicationDetail"` add:
```json
"portalData": "Portal Data",
"portalDataEmpty": "No portal data available",
"applicationCity": "Application City",
"customFields": "Custom Fields",
"smartFields": "Smart Fields",
"savePortalData": "Save Changes",
"portalDataSaved": "Portal data saved successfully",
"portalDataSaveError": "Failed to save portal data",
"copyJson": "Copy JSON",
"jsonCopied": "JSON copied to clipboard",
"exportJson": "Export JSON",
"source": "Source",
"sourcePortal": "Portal",
"sourceAdmin": "Admin"
```

Under `"portalApply"` add:
```json
"confirmationContact": "Our team will contact you via WhatsApp shortly.",
"referenceNumber": "Reference Number",
"submitAnother": "Submit Another Application"
```

**Step 2:** Add the same keys with Turkish translations to `messages/tr.json`:

Under `"applicationDetail"` add:
```json
"portalData": "Portal Verileri",
"portalDataEmpty": "Portal verisi bulunmuyor",
"applicationCity": "Basvuru Sehri",
"customFields": "Ozel Alanlar",
"smartFields": "Akilli Alanlar",
"savePortalData": "Degisiklikleri Kaydet",
"portalDataSaved": "Portal verileri basariyla kaydedildi",
"portalDataSaveError": "Portal verileri kaydedilemedi",
"copyJson": "JSON Kopyala",
"jsonCopied": "JSON panoya kopyalandi",
"exportJson": "JSON Disari Aktar",
"source": "Kaynak",
"sourcePortal": "Portal",
"sourceAdmin": "Admin"
```

Under `"portalApply"` add:
```json
"confirmationContact": "Ekibimiz sizinle WhatsApp uzerinden en kisa surede iletisime gececektir.",
"referenceNumber": "Referans Numarasi",
"submitAnother": "Yeni Basvuru Yap"
```

**Step 3:** Run `npm run build` to verify no JSON parse errors.

---

### Task 2: Simplify Portal Confirmation (Step 4)

**Files:**
- Modify: `src/app/[locale]/(portal)/portal/apply/apply-client.tsx` (lines ~1063-1180)

**Step 1:** Replace the Step 4 confirmation section (the entire `{step === 4 && (...)}` block) with a simplified version:

- Keep the animated checkmark (the spring-animated green circle with Check icon)
- Change the title to use `t("confirmationTitle")` (keep existing)
- Replace the subtitle with `t("confirmationContact")` — the WhatsApp promise message
- Replace the big gradient tracking code box with a subtle small reference row:
  ```tsx
  <p className="text-xs text-slate-400 dark:text-slate-500">
    {t("referenceNumber")}: <span className="font-mono">{trackingCode}</span>
  </p>
  ```
- Remove the amber warning box ("save this code")
- Remove the "Go to Portal" link button
- Add a "Submit Another Application" button that resets the wizard:
  ```tsx
  <Button
    variant="outline"
    className="h-11 rounded-xl px-6"
    onClick={() => {
      setStep(1);
      setSelectedCountry("");
      setSelectedCity("");
      setSelectedVisaType("");
      setFormFields([]);
      setSmartAssignments([]);
      setSmartFieldData({});
      setGuides([]);
      setGuideAcknowledged(false);
      setTrackingCode("");
      setFormSubmitted(false);
      setSmartSubmitted(false);
    }}
  >
    {t("submitAnother")}
  </Button>
  ```

**Step 2:** The `handleCopyCode` function and `codeCopied` state can remain (harmless) or be removed. The `Copy` icon import is still used elsewhere so keep it.

**Step 3:** Run `npm run build` — must pass clean.

---

### Task 3: Add `custom_fields` and `source` to ApplicationDetail type + fetch

**Files:**
- Modify: `src/components/applications/application-detail.tsx` (lines 34-76, 200-267)

**Step 1:** Add two fields to the `ApplicationDetail` interface (around line 76):

```typescript
custom_fields: Record<string, unknown> | null;
source: string | null;
```

The existing query already uses `SELECT *` (line 213), so `custom_fields` and `source` are already being fetched — they just weren't typed. No query change needed.

**Step 2:** Run `npm run build` — must pass clean.

---

### Task 4: Add Portal Data section to Application Detail sheet

**Files:**
- Modify: `src/components/applications/application-detail.tsx`

**Step 1:** Add state for portal data editing. After the existing state declarations (around line 196), add:

```typescript
const [portalEdits, setPortalEdits] = React.useState<Record<string, string>>({});
const [savingPortal, setSavingPortal] = React.useState(false);
```

**Step 2:** Add a helper to flatten smart field data. Before the component return, add:

```typescript
function flattenPortalData(customFields: Record<string, unknown> | null): Array<{ key: string; label: string; value: string; section: string }> {
  if (!customFields) return [];
  const rows: Array<{ key: string; label: string; value: string; section: string }> = [];

  for (const [key, val] of Object.entries(customFields)) {
    if (key === "_smart") {
      // Smart field data: nested objects
      const smart = val as Record<string, Record<string, unknown>>;
      for (const [sfKey, sfData] of Object.entries(smart)) {
        for (const [subKey, subVal] of Object.entries(sfData)) {
          if (subKey === "_valid") continue; // internal flag
          const displayKey = `${sfKey}.${subKey}`;
          rows.push({
            key: displayKey,
            label: `${sfKey} → ${subKey}`.replace(/_/g, " "),
            value: String(subVal ?? ""),
            section: "smart",
          });
        }
      }
    } else if (key.startsWith("_")) {
      continue; // skip internal keys
    } else {
      rows.push({
        key,
        label: key.replace(/_/g, " "),
        value: String(val ?? ""),
        section: "custom",
      });
    }
  }
  return rows;
}
```

**Step 3:** Add the Portal Data section BEFORE the "Portal Documents" section (before line 760 `{/* Section: Portal Documents */}`). Insert after the "Other" section and photos section:

```tsx
{/* Section: Portal Data */}
{application.custom_fields && Object.keys(application.custom_fields).length > 0 && (
  <>
    <Separator className="my-3" />
    <div className="flex items-center justify-between mb-2">
      <h4 className="text-sm font-semibold">{t("portalData")}</h4>
      {application.source === "portal" && (
        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800">
          {t("sourcePortal")}
        </Badge>
      )}
    </div>

    {/* Application city */}
    {(application.custom_fields as Record<string, unknown>).application_city && (
      <FieldRow
        label={t("applicationCity")}
        value={String((application.custom_fields as Record<string, unknown>).application_city)}
      />
    )}

    {/* Flat list of all portal fields */}
    {flattenPortalData(application.custom_fields as Record<string, unknown>).map((row) => (
      <div key={row.key} className="flex justify-between py-1.5 gap-2">
        <span className="text-muted-foreground text-sm capitalize whitespace-nowrap">
          {row.label}
        </span>
        <Input
          className="h-7 text-sm font-medium text-right max-w-[60%]"
          value={portalEdits[row.key] ?? row.value}
          onChange={(e) =>
            setPortalEdits((prev) => ({ ...prev, [row.key]: e.target.value }))
          }
        />
      </div>
    ))}

    {/* Save button */}
    {Object.keys(portalEdits).length > 0 && (
      <Button
        size="sm"
        className="mt-2 w-full"
        disabled={savingPortal}
        onClick={async () => {
          if (!applicationId) return;
          setSavingPortal(true);
          try {
            // Rebuild custom_fields from edits
            const current = { ...(application.custom_fields as Record<string, unknown>) };
            for (const [editKey, editVal] of Object.entries(portalEdits)) {
              if (editKey.includes(".")) {
                // Smart field: "employment_status.employer_name" → _smart.employment_status.employer_name
                const [sfKey, subKey] = editKey.split(".");
                if (!current._smart) current._smart = {};
                const smart = current._smart as Record<string, Record<string, unknown>>;
                if (!smart[sfKey]) smart[sfKey] = {};
                smart[sfKey][subKey] = editVal;
              } else {
                current[editKey] = editVal;
              }
            }
            const { error } = await supabase
              .from("applications")
              .update({ custom_fields: current })
              .eq("id", applicationId);
            if (error) throw error;
            // Update local state
            setApplication({ ...application, custom_fields: current });
            setPortalEdits({});
            toast.success(t("portalDataSaved"));
          } catch {
            toast.error(t("portalDataSaveError"));
          } finally {
            setSavingPortal(false);
          }
        }}
      >
        {savingPortal ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
        {t("savePortalData")}
      </Button>
    )}
  </>
)}
```

**Step 4:** Run `npm run build` — must pass clean.

---

### Task 5: Add Copy JSON button to Application Detail

**Files:**
- Modify: `src/components/applications/application-detail.tsx`

**Step 1:** Add a "Copy JSON" button next to the portal link copy button in the tracking code area (around line 445-462). After the existing copy portal link button, add:

```tsx
<Button
  variant="ghost"
  size="icon-xs"
  onClick={() => {
    if (!application) return;
    // Flatten all data for export
    const exportData: Record<string, unknown> = {
      id: application.id,
      tracking_code: application.tracking_code,
      full_name: application.full_name,
      id_number: application.id_number,
      date_of_birth: application.date_of_birth,
      phone: application.phone,
      email: application.email,
      passport_no: application.passport_no,
      passport_expiry: application.passport_expiry,
      visa_status: application.visa_status,
      visa_type: application.visa_type,
      country: application.country,
      appointment_date: application.appointment_date,
      appointment_time: application.appointment_time,
      consulate_office: application.consulate_office,
      source: application.source,
    };
    // Merge custom fields (non-smart)
    if (application.custom_fields) {
      const cf = application.custom_fields as Record<string, unknown>;
      for (const [k, v] of Object.entries(cf)) {
        if (k === "_smart") {
          // Flatten smart fields
          const smart = v as Record<string, Record<string, unknown>>;
          for (const [sfKey, sfData] of Object.entries(smart)) {
            for (const [subKey, subVal] of Object.entries(sfData)) {
              if (subKey === "_valid") continue;
              exportData[`${sfKey}_${subKey}`] = subVal;
            }
          }
        } else if (!k.startsWith("_")) {
          exportData[k] = v;
        }
      }
    }
    navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
    toast.success(t("jsonCopied"));
  }}
  title={t("copyJson")}
>
  <span className="text-[10px] font-mono">{"{}"}</span>
</Button>
```

**Step 2:** Run `npm run build` — must pass clean.

---

### Task 6: Create JSON Export API Route

**Files:**
- Create: `src/app/api/applications/[id]/export/route.ts`

**Step 1:** Create the API route file:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const applicationId = parseInt(id, 10);
  if (isNaN(applicationId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const supabase = await createClient();

  // Check auth
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: app, error } = await supabase
    .from("applications")
    .select("*")
    .eq("id", applicationId)
    .eq("is_deleted", false)
    .single();

  if (error || !app) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Build flat export object
  const exportData: Record<string, unknown> = {};

  // Standard columns
  const standardKeys = [
    "id", "tracking_code", "full_name", "id_number", "date_of_birth",
    "phone", "email", "passport_no", "passport_expiry",
    "visa_status", "visa_type", "country",
    "appointment_date", "appointment_time", "pickup_date", "travel_date",
    "consulate_app_no", "consulate_office", "source",
    "consulate_fee", "service_fee", "currency",
    "created_at", "updated_at",
  ];
  for (const key of standardKeys) {
    exportData[key] = (app as Record<string, unknown>)[key] ?? null;
  }

  // Custom fields (non-smart)
  const cf = (app as Record<string, unknown>).custom_fields as Record<string, unknown> | null;
  if (cf) {
    for (const [k, v] of Object.entries(cf)) {
      if (k === "_smart") {
        // Flatten smart fields
        const smart = v as Record<string, Record<string, unknown>>;
        for (const [sfKey, sfData] of Object.entries(smart)) {
          for (const [subKey, subVal] of Object.entries(sfData)) {
            if (subKey === "_valid") continue;
            exportData[`${sfKey}_${subKey}`] = subVal;
          }
        }
      } else if (!k.startsWith("_")) {
        exportData[k] = v;
      }
    }
  }

  return NextResponse.json(exportData);
}
```

**Step 2:** Run `npm run build` — must pass clean.

---

### Task 7: Add Source Badge + Filter to Applications Table

**Files:**
- Modify: `src/app/[locale]/(app)/applications/page.tsx` (line ~28-51)
- Modify: `src/app/[locale]/(app)/applications/applications-client.tsx`

**Step 1:** In `page.tsx`, add `source` to the select query. Find the `.select(...)` call and add `source` to the column list (after `tracking_code`):

```
tracking_code,
source,
companies ( company_name )
```

Also add `source` to the row type interface / return mapping so it's passed to the client.

**Step 2:** In `applications-client.tsx`, add the source column definition. Insert after the `tracking_code` column (around line 369) and before the `full_name` column:

```typescript
{
  accessorKey: "source",
  header: t("source"),
  cell: ({ row }: { row: { getValue: (key: string) => unknown } }) => {
    const source = row.getValue("source") as string;
    if (source === "portal") {
      return (
        <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800">
          {t("sourcePortal")}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-950/30 dark:text-slate-400 dark:border-slate-700">
        {t("sourceAdmin")}
      </Badge>
    );
  },
},
```

**Step 3:** Add source to the `filterableColumns` array (after the existing `payment_status` filter):

```typescript
{
  id: "source",
  title: t("source"),
  options: [
    { label: t("sourcePortal"), value: "portal" },
    { label: t("sourceAdmin"), value: "admin" },
  ],
},
```

**Step 4:** Run `npm run build` — must pass clean.

---

### Task 8: Final Build Verification

**Step 1:** Run `npm run build` — must pass clean with 0 errors.

**Step 2:** Verify the i18n keys exist in both `en.json` and `tr.json`.

---

## Files Summary

**Create (1 file):**
- `src/app/api/applications/[id]/export/route.ts`

**Modify (5 files):**
- `messages/en.json` — new i18n keys
- `messages/tr.json` — new i18n keys
- `src/app/[locale]/(portal)/portal/apply/apply-client.tsx` — simplified Step 4
- `src/components/applications/application-detail.tsx` — Portal Data section + Copy JSON button + source badge
- `src/app/[locale]/(app)/applications/page.tsx` — add `source` to query
- `src/app/[locale]/(app)/applications/applications-client.tsx` — source column + filter

## Verification

1. Portal wizard Step 4: shows simple confirmation + WhatsApp message + subtle ref number + "Submit Another"
2. Application Detail: "Portal Data" section shows all custom + smart fields in flat editable list
3. Application Detail: "Copy JSON" button copies flattened JSON to clipboard
4. API: `GET /api/applications/{id}/export` returns flat JSON (requires auth)
5. Applications table: "Source" column with blue/gray badge + filterable
6. `npm run build` passes clean
