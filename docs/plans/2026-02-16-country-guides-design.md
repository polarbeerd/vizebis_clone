# Country Guide Pages — Design Document

## Problem

After selecting a country in the portal apply wizard (step 2), customers see an empty or minimal info page. There's no video guidance or key points to help them prepare for the visa application process. The admin has no intuitive way to manage country-specific guide content.

## Decisions

| Question | Answer |
|----------|--------|
| Content model | Multiple videos + multiple key points per country |
| Scope | Per country only (not per visa type) |
| Video layout | Stacked vertically |
| Admin UX | Purpose-built editor (replaces current Portal Content page) |
| Key point detail | Text only (no icons, no separate titles) |

## Data Model

Reuse the existing `portal_content` table. Two content types:

- `content_type = 'video'` — one row per video. Uses `title` for the video title and a new `video_url` column for the YouTube/Vimeo embed URL.
- `content_type = 'key_point'` — one row per key point. Uses `content` for the text body.

Both filtered by `country` column. `sort_order` controls display order within each type. `visa_type` is NULL for country-level guides.

**Schema change:** Add `video_url TEXT` column to `portal_content`.

## Admin UI — Country Guides Editor

Replaces the current Portal Content page at `/portal-content`.

- **Top:** Country selector dropdown (flags + names from `countries` table).
- **Videos section:** Inline list of videos. Each row: title input + video URL input + drag handle + delete button. "Add Video" button at bottom.
- **Key Points section:** Inline list of key points. Each row: text input + drag handle + delete button. "Add Key Point" button at bottom.
- Save button persists all changes. Uses upsert pattern — delete removed items, update existing, insert new.
- No DataTable, no modals. Direct inline editing.

## Portal UI — Step 2

After country selection, step 2 renders:

1. **Videos:** Stacked vertically. Each video in a glassmorphism card with title above the embedded player. Use `react-player` or `iframe` for YouTube/Vimeo. Framer Motion fade-in animations.
2. **Key Points:** Numbered list below videos. Each key point in a glassmorphism card with a colored number badge and the text. Staggered entrance animation.
3. **Acknowledge checkbox:** At bottom — "I have read and understood the guide" before proceeding to step 3.

If no content exists for a country, show a simple "No guide available" message and let the user proceed.

## i18n

New keys in `portalContent` namespace for labels like "Videos", "Key Points", "Add Video", "Add Key Point", "Video URL", "I have read the guide", "No guide available", etc. Both TR and EN.

## Files to Modify

1. `portal_content` table — add `video_url` column (migration)
2. `src/app/[locale]/(app)/portal-content/` — rewrite as Country Guides editor
3. `src/components/portal-content/` — new editor components
4. `src/app/[locale]/(portal)/portal/apply/apply-client.tsx` — step 2 rendering
5. `src/app/[locale]/(portal)/portal/actions.ts` — fetch guide content
6. `messages/en.json` + `messages/tr.json` — new keys
7. Sidebar label update: "Portal Content" → "Country Guides"
