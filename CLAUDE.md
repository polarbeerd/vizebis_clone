# Unusual Consulting — Project Memory

## Quick Reference

- **Project:** Visa consulting management platform — "Unusual Consulting"
- **Brand:** "our experience is your power" — modern, playful, professional
- **Logo:** `public/logo.jpg` (black bg, pink/cream "UNUSUAL CONSULTING" text)
- **Status:** 40 routes total — 27 fully functional, 7 UI-only, 1 broken, 5 portal (new)
- **Run:** `npm run dev` → http://localhost:3000
- **Build:** `npm run build` (passing clean)
- **Supabase project:** `vizebiscopy` — anon key connected, service role key placeholder

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.1.6 |
| Language | TypeScript | 5.x |
| CSS | Tailwind CSS | v4 |
| UI Components | shadcn/ui (25 components) | latest |
| Database/Auth | Supabase (PostgreSQL, Auth, Storage, Realtime) | 2.95.x |
| Tables | TanStack Table | 8.21.x |
| Forms | React Hook Form + Zod | 7.71 / 4.3 |
| Charts | Recharts | 3.7.x |
| Animations | Framer Motion | 12.34.x |
| i18n | next-intl (Turkish + English) | 4.8.x |
| Icons | lucide-react | 0.563.x |
| State | Zustand | 5.0.x |
| Toasts | Sonner | latest |

---

## Project Structure

```
src/
├── app/
│   ├── [locale]/
│   │   ├── layout.tsx              # Locale layout + NextIntlClientProvider + Toaster
│   │   ├── page.tsx                # Redirects to /dashboard
│   │   ├── login/
│   │   │   ├── page.tsx            # Login/Register page
│   │   │   └── actions.ts          # Server actions: login, register, logout
│   │   ├── (app)/                  # Auth-protected route group
│   │   │   ├── layout.tsx          # Sidebar + Header + ChatWidget + auth check
│   │   │   ├── loading.tsx         # Loading spinner
│   │   │   ├── dashboard/          # Stats cards + recent activity
│   │   │   ├── applications/       # DataTable + CRUD + filters + color coding + tracking_code
│   │   │   ├── companies/          # DataTable + CRUD + active/passive toggle
│   │   │   ├── appointments/       # DataTable + CRUD
│   │   │   ├── calendar/           # Monthly grid calendar
│   │   │   ├── documents/          # Document templates with HTML editor
│   │   │   ├── tags/               # Color-coded tag management
│   │   │   ├── forms/              # Dynamic form builder
│   │   │   ├── passwords/          # Password manager with categories
│   │   │   ├── finance/            # Debt summary cards
│   │   │   ├── debt-individual/    # Unpaid applications report
│   │   │   ├── debt-corporate/     # Company debt aggregation
│   │   │   ├── country-reports/    # Applications by country
│   │   │   ├── at-consulate/       # Apps at consulate
│   │   │   ├── consulate-metrics/  # Charts (bar, pie, line)
│   │   │   ├── country-metrics/    # Charts with date filter
│   │   │   ├── referral-report/    # Referral CRUD + performance
│   │   │   ├── ai-analysis/       # Natural language data query chat
│   │   │   ├── ai-assistant/      # Visa letter generator form
│   │   │   ├── ai-prompts/        # Prompt template CRUD
│   │   │   ├── ai-settings/       # OpenAI API configuration
│   │   │   ├── email-hosting/     # Email dashboard + inbox
│   │   │   ├── email-management/  # Notification settings + templates
│   │   │   ├── settings/          # 7-tab settings (company, SMS, notifications, telegram, users, website, reports)
│   │   │   ├── security/          # 2FA settings (email, SMS, TOTP)
│   │   │   ├── support/           # Ticket system
│   │   │   ├── support-center/    # FAQ knowledge base
│   │   │   ├── profile/           # User profile + password change
│   │   │   ├── notifications/     # Notification list
│   │   │   ├── logs/              # Activity log viewer
│   │   │   ├── contracts/         # Digital contract display
│   │   │   ├── invoices/          # Platform invoice list
│   │   │   └── cdn-files/         # File upload/management
│   │   └── (portal)/              # Public portal (NO auth required)
│   │       ├── layout.tsx          # Minimal layout: header + animated bg, no sidebar
│   │       └── portal/
│   │           ├── page.tsx + portal-client.tsx     # Landing: tracking code entry
│   │           ├── actions.ts                       # Server actions (service role client)
│   │           └── [trackingCode]/
│   │               ├── page.tsx + status-client.tsx  # Animated status timeline + details
│   │               ├── edit/page.tsx + edit-client.tsx   # Personal info form
│   │               └── upload/page.tsx + upload-client.tsx # Document upload
│   └── globals.css
├── components/
│   ├── ui/                        # 25 shadcn/ui components
│   ├── layout/
│   │   ├── sidebar.tsx            # 30-item nav, logo stretches full width
│   │   ├── header.tsx             # User dropdown, notifications, mobile menu
│   │   └── locale-switcher.tsx    # TR/EN toggle
│   ├── dashboard/
│   │   └── stat-card.tsx          # Reusable stat card (5 color variants)
│   ├── data-table/                # 4 components: table, toolbar, pagination, column-header
│   ├── applications/              # application-form, application-detail, sms-modal, deleted-applications
│   ├── companies/                 # company-form
│   ├── appointments/              # appointment-form
│   ├── documents/                 # document-form
│   ├── tags/                      # tag-form
│   ├── forms/                     # form-builder
│   ├── chat/                      # chat-widget (floating realtime)
│   └── portal/                    # Portal-specific components
│       ├── portal-header.tsx      # Minimal header: logo + locale switcher
│       ├── status-timeline.tsx    # Animated horizontal/vertical stepper
│       └── animated-background.tsx # Floating gradient orbs
├── lib/
│   ├── utils.ts                   # cn(), formatCurrency(), formatDate(), formatDateTime()
│   └── supabase/
│       ├── client.ts              # Browser client (createBrowserClient)
│       ├── server.ts              # Server client (createServerClient + cookies)
│       ├── service.ts             # Service role client (bypasses RLS, portal only)
│       └── middleware.ts          # Session refresh helper
├── i18n/
│   ├── routing.ts                 # Locales: ["tr", "en"], default: "tr"
│   ├── request.ts                 # Server-side message loading
│   └── navigation.ts             # Locale-aware Link, redirect, usePathname, useRouter
└── middleware.ts                  # Combined next-intl + Supabase session (skips portal)
messages/
├── tr.json                        # Turkish translations (~836 keys, 46 namespaces)
└── en.json                        # English translations (~836 keys, 46 namespaces)
public/
└── logo.jpg                       # Unusual Consulting brand logo
supabase/
└── migrations/
    ├── 001_core_schema.sql        # Full schema (746 lines, 23 tables, 10 enums)
    └── 002_portal_schema.sql      # Portal additions (tracking_code, portal-uploads bucket)
```

---

## Database Schema (23 Tables + 2 Portal Columns)

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `profiles` | Users (extends auth.users) | full_name, role, permissions JSONB, telegram_chat_id |
| `companies` | Client companies | company_name, company_code, tax info, is_active |
| `applications` | Visa applications (CORE) | 40+ fields + `tracking_code` (UUID, unique) + `portal_last_accessed` |
| `appointments` | Consulate appointments | full_name, passport, country, visa_type, dates |
| `documents` | Document templates | name, html_content, type, status, priority, access_level |
| `tags` | Color-coded labels | name, color hex |
| `application_tags` | Many-to-many join | application_id, tag_id |
| `referrals` | Referral sources | name, commission_rate, is_active |
| `forms` | Dynamic customer forms | name, fields JSONB, share_token |
| `form_submissions` | Form responses | form_id, data JSONB, status |
| `password_categories` | Password groupings | name |
| `passwords` | Stored credentials | title, username, password, url, category_id |
| `chat_messages` | Internal messaging | sender_id, receiver_id, message, is_read |
| `notifications` | User notifications | title, message, type, is_read, link |
| `activity_logs` | Audit trail | action, entity_type, entity_id, details JSONB, ip_address |
| `tickets` | Support tickets | subject, message, status, priority |
| `ticket_replies` | Ticket thread | ticket_id, message, sender_id |
| `ai_prompts` | AI prompt templates | name, prompt_text, variables JSONB |
| `ai_settings` | AI config (1 row) | api_key, model, max_tokens, temperature |
| `email_templates` | Notification templates | name, subject, html_content |
| `settings` | Key-value config | key TEXT PK, value JSONB |
| `cdn_files` | Uploaded files | file_name, file_path, file_size, mime_type |
| `countries` | Country dropdown | name (29 seeded) |

**Enums:** visa_status, visa_type, currency_type, payment_status, payment_method, invoice_status, document_type, document_status, priority_type, access_level, user_role

**Storage Buckets:** `portal-uploads` (defined in migration 002, needs manual creation in dashboard)

---

## Application Status Workflow

```
Beklemede → Hazırlanıyor → Konsoloslukta → Vize Çıktı → Pasaport Teslim
                                          → Ret Oldu
```

Row color coding: Green (delivered), Blue (approved), Yellow (at consulate), Gray (pending), Red (rejected). Red background for appointments within 10 days.

---

## Key Patterns

### Page Pattern
Every page follows: **Server Component** (page.tsx) fetches data → **Client Component** (*-client.tsx) renders UI.

### DataTable Pattern
Reusable `<DataTable>` accepts: `columns`, `data`, `searchKey`, `filterableColumns`, `rowClassName`, `onExportCsv`, `toolbarExtra`.

### Form Pattern
Dialog-based forms use React Hook Form + Zod. Supabase browser client for mutations. Toast notifications via Sonner.

### i18n Pattern
Server components: `getTranslations("namespace")`. Client components: `useTranslations("namespace")`. All text in `messages/tr.json` and `messages/en.json`. **Always use `@/i18n/navigation` (NOT `next/navigation`) for locale-aware routing in client components.**

### Portal Pattern
Portal uses **service role client** (bypasses RLS) since visitors are unauthenticated. Server actions validate tracking codes. Middleware skips Supabase session refresh for `/portal` routes.

---

## Current Status — What Works vs What Doesn't

### FULLY FUNCTIONAL (27 routes) — Connected to Supabase
- Authentication (login, register, logout, session management)
- Dashboard (live stats, recent activity)
- Applications (full CRUD, 40+ fields, tracking code, CSV export, color coding)
- Companies, Appointments, Calendar (full CRUD)
- Documents, Tags, Forms, Passwords (full CRUD)
- Finance reports (debt-individual, debt-corporate, at-consulate, country-reports)
- Metrics (consulate-metrics, country-metrics with Recharts)
- Referral report (CRUD + performance)
- Settings (7 tabs), Email management, Profile, Notifications, Logs, CDN files
- Customer Portal (tracking lookup, status timeline, edit info, upload docs)

### UI-ONLY SHELLS (7 routes) — Need backend integration
- **AI Analysis** — placeholder responses, needs OpenAI API
- **AI Assistant** — placeholder letter generation, needs OpenAI API
- **AI Prompts** — hardcoded array, NOT connected to `ai_prompts` table
- **AI Settings** — NOT connected to `ai_settings` table
- **Email Hosting / Inbox** — no email server integration
- **Contracts** — static UI, no dynamic data
- **Invoices** — empty data array, no invoice generation

### KNOWN BUG (1 route)
- **Support** — queries `support_tickets` but table is named `tickets` → fix: rename query target

### NOT YET CONNECTED
- **SMS sending** — sms-modal.tsx is UI-only, needs NetGSM/Twilio API
- **Telegram Bot** — settings page exists, no actual bot implementation
- **2FA** — security page is UI-only, needs Supabase Auth MFA setup
- **Supabase Storage buckets** — need to create `portal-uploads`, `passport-photos`, `visa-photos`, `cdn-files` buckets in dashboard
- **Service role key** — `.env.local` has placeholder, needs real key from Supabase project settings
- **Type generation** — run `npx supabase gen types typescript` for full type safety

---

## What to Implement Next — Prioritized Roadmap

### Tier 1: Quick Wins (< 1 hour each)
These fix broken things and connect existing UI to existing tables.

1. **Fix support page** — change `support_tickets` → `tickets` in query
2. **Connect AI Prompts** — replace hardcoded array with Supabase query to `ai_prompts` table
3. **Connect AI Settings** — wire settings form to `ai_settings` table
4. **Add service role key** — get real key from Supabase dashboard, paste into `.env.local`
5. **Create storage buckets** — `portal-uploads`, `cdn-files` in Supabase dashboard
6. **Generate TypeScript types** — `npx supabase gen types typescript` for full type safety

### Tier 2: High-Impact Features (hours)
Features that differentiate the platform and add real value.

7. **WhatsApp Business API integration** — the #1 communication channel for visa consultants. Clients expect updates on WhatsApp. Send appointment reminders, status changes, document requests. Modern immigration CRMs (SmartX, SAN Softwares) all offer this as a core feature.
8. **AI-powered document assistant** — connect AI Analysis + AI Assistant to OpenAI/Anthropic API. Let admins query application data in natural language ("show me all pending Germany applications") and auto-generate visa support letters. Docketwise pioneered this approach.
9. **Automated notifications & reminders** — trigger email/SMS when: application status changes, appointment is within 7 days, passport is expiring soon, payment is overdue. Use Supabase Edge Functions + database webhooks.
10. **Smart document checklist** — per-country, per-visa-type checklists that tell customers exactly what documents they need. Track completion status per application. This is a massive UX win that most competitors lack.
11. **Public shareable forms** — the `forms` table already has `share_token`. Build a public `/forms/{token}` route where customers can fill intake forms without login, with data flowing directly into `form_submissions`.

### Tier 3: Competitive Advantages (days)
Features that make Unusual Consulting best-in-class.

12. **Customer portal SMS/email notifications** — when an admin changes visa status, automatically send the customer a link to their portal page with a personalized message. Close the loop.
13. **Analytics dashboard v2** — conversion funnel (lead → application → approved → delivered), average processing time per country/visa type, revenue forecasting. These metrics help consultants optimize their business.
14. **OCR document scanning** — auto-extract passport data (name, number, expiry) from uploaded passport photos. Reduces manual data entry by 80%. Use Google Vision API or Tesseract.
15. **Multi-currency invoicing** — generate professional invoices (PDF) from application fee data. The `invoices` page already exists as a shell. Support TL/USD/EUR with automatic exchange rates.
16. **Appointment calendar sync** — Google Calendar / Outlook integration so appointments appear in the consultant's personal calendar. iCal export at minimum.
17. **Supabase Realtime chat** — the `chat_widget.tsx` exists but uses no Realtime subscription. Wire it up to Supabase Realtime for live internal messaging between team members.
18. **Role-based access control** — the `profiles` table has `role` and `permissions` JSONB fields. Implement proper RBAC so admins, managers, and agents see different things. Important for scaling the team.

### Tier 4: Future Vision
19. **Mobile app** — React Native or Expo app for consultants on the go
20. **Telegram bot** — automated status updates to customers via Telegram
21. **Email hosting integration** — connect to mail provider (Postmark, SendGrid) for branded emails
22. **2FA** — Supabase Auth MFA with TOTP/SMS
23. **Audit trail improvements** — log every admin action automatically via Supabase triggers

---

## Industry Context

The visa consulting software market in 2025-2026 is dominated by:
- **DocketWise** — multilingual form prep, AI document assistant, immigration-specific CRM
- **SmartX CRM** — WhatsApp integration, automated workflows, document tracking
- **SAN e-Visa** — lead management, bulk SMS, multi-channel comms
- **INSZoom** — 90+ country form templates, e-filing, compliance tracking

What separates the best platforms: **WhatsApp integration**, **AI-powered automation**, **client self-service portals**, **real-time status tracking**, and **smart document checklists**. Unusual Consulting already has the portal and status tracking — the next differentiators are WhatsApp, AI, and automated notifications.

---

## Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=https://puxhataoolzchfkecqsy.supabase.co   # ✅ Connected
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...                                  # ✅ Real key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here                  # ❌ Placeholder — get from Supabase dashboard > Settings > API
# Future:
# OPENAI_API_KEY=sk-...                                              # For AI features
# WHATSAPP_API_TOKEN=...                                             # For WhatsApp Business API
# NETGSM_API_KEY=...                                                 # For SMS sending
```
