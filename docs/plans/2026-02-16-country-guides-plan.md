# Country Guide Pages Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a purpose-built Country Guides admin editor and redesign the portal apply wizard step 2 to show stacked videos + numbered key points per country.

**Architecture:** Reuse the existing `portal_content` table with two new content types (`video`, `key_point`). Replace the generic DataTable-based admin page with an inline editor that manages videos and key points per country. The portal wizard step 2 reads these and renders them with glassmorphism cards and animations.

**Tech Stack:** Next.js App Router, Supabase (PostgreSQL), React Hook Form, Framer Motion, next-intl, shadcn/ui, Tailwind CSS v4, Sonner toasts.

---

### Task 1: DB Migration — Add video/key_point content types

**Files:**
- Create: `supabase/migrations/011_country_guides_content_types.sql`

**Context:** The `portal_content.content_type` column has a CHECK constraint limiting values to `['country_guide', 'process_guide', 'faq', 'general']`. We need to add `'video'` and `'key_point'` to this constraint. The `video_url` column already exists.

**Step 1: Write and apply the migration**

```sql
-- Drop the old CHECK constraint and add expanded one
ALTER TABLE portal_content DROP CONSTRAINT IF EXISTS portal_content_content_type_check;
ALTER TABLE portal_content ADD CONSTRAINT portal_content_content_type_check
  CHECK (content_type = ANY (ARRAY[
    'country_guide'::text,
    'process_guide'::text,
    'faq'::text,
    'general'::text,
    'video'::text,
    'key_point'::text
  ]));
```

Apply via Supabase MCP `apply_migration` with project_id `puxhataoolzchfkecqsy`.

**Step 2: Verify**

Run SQL to confirm: `SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'portal_content'::regclass AND contype = 'c';`

**Step 3: Commit**

```bash
git add supabase/migrations/011_country_guides_content_types.sql
git commit -m "feat: add video and key_point content types to portal_content"
```

---

### Task 2: i18n keys

**Files:**
- Modify: `messages/en.json` — `portalContent` namespace + `sidebar` namespace
- Modify: `messages/tr.json` — same

**Step 1: Add new keys to `messages/en.json`**

In `portalContent` namespace, add/update:

```json
"title": "Country Guides",
"description": "Manage video guides and key points for each country",
"videosSection": "Videos",
"keyPointsSection": "Key Points",
"addVideo": "Add Video",
"addKeyPoint": "Add Key Point",
"videoTitle": "Video Title",
"videoUrlPlaceholder": "https://www.youtube.com/watch?v=...",
"keyPointText": "Key point text",
"selectCountryPrompt": "Select a country to manage its guide content",
"noVideos": "No videos added yet",
"noKeyPoints": "No key points added yet",
"saveAll": "Save All Changes",
"saveSuccess": "Guide content saved successfully",
"deleteVideoConfirm": "Remove this video?",
"deleteKeyPointConfirm": "Remove this key point?",
"guideAcknowledge": "I have read and understood the information above",
"noGuideAvailable": "No guide content available for this country. You can proceed to the next step."
```

In `sidebar` namespace, change `"portalContent": "Portal Content"` to `"portalContent": "Country Guides"`.

**Step 2: Add matching Turkish keys to `messages/tr.json`**

In `portalContent`:

```json
"title": "Ülke Rehberleri",
"description": "Her ülke için video rehberleri ve önemli noktaları yönetin",
"videosSection": "Videolar",
"keyPointsSection": "Önemli Noktalar",
"addVideo": "Video Ekle",
"addKeyPoint": "Önemli Nokta Ekle",
"videoTitle": "Video Başlığı",
"videoUrlPlaceholder": "https://www.youtube.com/watch?v=...",
"keyPointText": "Önemli nokta metni",
"selectCountryPrompt": "Rehber içeriğini yönetmek için bir ülke seçin",
"noVideos": "Henüz video eklenmedi",
"noKeyPoints": "Henüz önemli nokta eklenmedi",
"saveAll": "Tüm Değişiklikleri Kaydet",
"saveSuccess": "Rehber içeriği başarıyla kaydedildi",
"deleteVideoConfirm": "Bu video kaldırılsın mı?",
"deleteKeyPointConfirm": "Bu önemli nokta kaldırılsın mı?",
"guideAcknowledge": "Yukarıdaki bilgileri okudum ve anladım",
"noGuideAvailable": "Bu ülke için rehber içeriği mevcut değil. Sonraki adıma geçebilirsiniz."
```

In `sidebar`: `"portalContent": "Ülke Rehberleri"`.

**Step 3: Commit**

```bash
git add messages/en.json messages/tr.json
git commit -m "feat: add country guides i18n keys (EN + TR)"
```

---

### Task 3: Admin — Country Guides Editor (page + client component)

**Files:**
- Rewrite: `src/app/[locale]/(app)/portal-content/page.tsx`
- Rewrite: `src/app/[locale]/(app)/portal-content/portal-content-client.tsx`
- Delete or ignore: `src/components/portal-content/content-form.tsx` (no longer needed — inline editing replaces modal)

**Context:** The current admin page is a DataTable with a Dialog form. We're replacing it entirely with a purpose-built inline editor. The page.tsx server component fetches countries + all portal_content. The client component renders a country dropdown, videos section, key points section, and a save button.

**Step 1: Rewrite `page.tsx`**

The server component should:
1. Fetch all active countries (same query as existing)
2. Fetch ALL `portal_content` rows (not just for one country — the client filters by selected country)
3. Pass both to `<CountryGuidesClient />`

```tsx
import { createClient } from "@/lib/supabase/server";
import { CountryGuidesClient } from "./portal-content-client";

export interface GuideRow {
  id: number;
  title: string;
  content: string;
  content_type: string;
  country: string | null;
  video_url: string | null;
  sort_order: number;
  is_published: boolean;
}

export interface CountryOption {
  id: number;
  name: string;
  flag_emoji: string | null;
}

export default async function CountryGuidesPage() {
  const supabase = await createClient();

  const [contentRes, countriesRes] = await Promise.all([
    supabase
      .from("portal_content")
      .select("id, title, content, content_type, country, video_url, sort_order, is_published")
      .in("content_type", ["video", "key_point"])
      .order("sort_order", { ascending: true }),
    supabase
      .from("countries")
      .select("id, name, flag_emoji")
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  const content: GuideRow[] = (contentRes.data ?? []) as GuideRow[];
  const countries: CountryOption[] = (countriesRes.data ?? []) as CountryOption[];

  return <CountryGuidesClient data={content} countries={countries} />;
}
```

**Step 2: Rewrite `portal-content-client.tsx` — CountryGuidesClient**

This is the main component. Structure:

```
CountryGuidesClient
├── Header (title + description)
├── Country selector (Select dropdown with flags)
├── If country selected:
│   ├── Videos section
│   │   ├── List of inline video rows (title input + URL input + delete button)
│   │   └── "Add Video" button
│   ├── Key Points section
│   │   ├── List of inline key point rows (text input + delete button)
│   │   └── "Add Key Point" button
│   └── Save button (bottom)
└── If no country selected:
    └── "Select a country" prompt
```

Key implementation details:

- **State:** `selectedCountry` string. When changed, filter `data` prop to get videos and key points for that country.
- **Local state for editing:** Two arrays: `localVideos` and `localKeyPoints`. Each item has: `id` (number or `null` for new), `title`, `video_url`/`content`, `sort_order`. Use `useState` with initial values derived from filtered data.
- **When country changes:** Reset localVideos/localKeyPoints from `data` prop filtered by `selectedCountry`.
- **Add:** Push new item with `id: null` and next sort_order.
- **Delete:** Remove from local array. Track deleted IDs separately for DB delete.
- **Save handler:** Compare local state with original data. Delete removed items, update existing, insert new. Use Supabase browser client. Toast on success, `router.refresh()`.
- **UI:** Use shadcn `Card` for sections. `Input` for fields. `Button` for actions. `Trash2` icon for delete. `Plus` icon for add.

No drag-and-drop reordering needed — items are ordered by their position in the array (sort_order assigned on save).

**Step 3: Verify build**

```bash
npm run build
```

**Step 4: Commit**

```bash
git add src/app/[locale]/(app)/portal-content/page.tsx src/app/[locale]/(app)/portal-content/portal-content-client.tsx
git commit -m "feat: replace portal content page with purpose-built country guides editor"
```

---

### Task 4: Portal — Redesign Step 2 rendering

**Files:**
- Modify: `src/app/[locale]/(portal)/portal/apply/apply-client.tsx` (step 2 section, ~lines 868-960)
- Modify: `src/app/[locale]/(portal)/portal/actions.ts` (getPortalContent — filter for video + key_point types)

**Context:** The portal step 2 currently renders ALL portal_content items as generic cards with optional video embeds. We need to:
1. Filter to only `video` and `key_point` content types
2. Render videos section (stacked, with title above each embed)
3. Render key points section (numbered badges + text)
4. Keep the acknowledge checkbox

**Step 1: Update `getPortalContent` in `actions.ts`**

Currently fetches all published content for a country. Add a `.in("content_type", ["video", "key_point"])` filter:

```tsx
export async function getPortalContent(
  country: string
): Promise<PortalContentItem[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("portal_content")
    .select("id, title, content, content_type, video_url")
    .eq("is_published", true)
    .in("content_type", ["video", "key_point"])
    .or(`country.is.null,country.eq.${country}`)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching portal content:", error);
    return [];
  }

  return (data ?? []) as PortalContentItem[];
}
```

**Step 2: Redesign step 2 rendering in `apply-client.tsx`**

Replace the current step 2 block (~lines 868-960) with:

1. Split guides into `videos` and `keyPoints`:
   ```tsx
   const videos = guides.filter(g => g.content_type === "video" && g.video_url);
   const keyPoints = guides.filter(g => g.content_type === "key_point");
   ```

2. **Videos section:** Stacked vertically. Each video in a glassmorphism card:
   - Title above in bold
   - 16:9 aspect ratio iframe (existing `extractYouTubeId` helper)
   - Framer Motion `initial={{ opacity: 0, scale: 0.95 }}` animation

3. **Key Points section:** Below videos. Each key point in a glassmorphism card:
   - Numbered circle badge (gradient `from-blue-500 to-violet-600`, white text)
   - Text content beside the badge
   - Staggered entrance: `transition={{ delay: i * 0.08 }}`

4. **Acknowledge checkbox:** Keep the existing one, update label to use `t("guideAcknowledge")` or keep `t("acknowledgeGuide")` if it already exists.

5. **Empty state:** If no guides at all, show `t("noGuideAvailable")` message and auto-acknowledge (or skip step entirely — existing `hasGuides` logic already handles this by jumping from step 1 to step 3).

**Step 3: Verify build**

```bash
npm run build
```

**Step 4: Commit**

```bash
git add src/app/[locale]/(portal)/portal/apply/apply-client.tsx src/app/[locale]/(portal)/portal/actions.ts
git commit -m "feat: redesign portal step 2 with separate video and key point sections"
```

---

### Task 5: Sidebar label update

**Files:**
- Modify: `src/components/layout/sidebar.tsx` (line ~76)

**Step 1: Update sidebar nav label**

The sidebar already reads from `t("portalContent")` which we've updated in Task 2 to say "Country Guides" / "Ülke Rehberleri". No code change needed if i18n keys were updated correctly.

Verify the sidebar reads from `sidebar` namespace: check line 76 uses `t("portalContent")`.

**Step 2: Verify build and visual check**

```bash
npm run build
```

**Step 3: Commit (if any code change was needed)**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat: update sidebar label to Country Guides"
```

---

### Task 6: Final build verification + cleanup

**Step 1: Run full build**

```bash
npm run build
```

Fix any TypeScript errors.

**Step 2: Verify no unused imports**

Check that `content-form.tsx` is no longer imported anywhere. If it is, remove the import. The file can stay in the repo (it's used by old content types) or be deleted if fully unused.

**Step 3: Commit any fixes**

```bash
git add -A
git commit -m "chore: cleanup unused imports and fix build"
```
