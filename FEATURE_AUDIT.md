# Unusual Consulting — Feature Audit & Simplification Plan

## Current State: 38 sidebar items across 8 groups. Way too much.

---

## KEEP — Core Business (what actually makes money)

These are the features that directly serve the business: taking customer applications, managing the visa process, and tracking appointments.

### Sidebar Group: "Main"

| Route | Verdict | Notes |
|-------|---------|-------|
| **Dashboard** | ✅ KEEP | But needs rework — currently shows 4 generic stat cards. Should show actionable info: apps needing attention, today's appointments, overdue documents |
| **Applications** | ✅ KEEP (core) | The heart of the product. 40+ field form is overwhelming though — see issues below |
| **Companies** | ✅ KEEP | Needed for corporate clients. Simple and works fine |
| **Appointments** | ✅ KEEP | Core workflow — scheduling consulate visits |
| **Calendar** | ✅ KEEP | Visual view of appointments. Useful for daily planning |

**Issues with what we're keeping:**

1. **Applications form is bloated** — 40+ fields in one form is bad UX. The tabbed approach helps but the "Process Tracking" tab mixes too many concerns (visa status, payment, fees, appointment dates, notes, document tracking). Should be split into clear steps or a cleaner layout.

2. **Dashboard is generic** — "Total applications: 47" is not useful at 9am. The dashboard should answer: "What do I need to do right now?" — e.g., applications stuck in "Preparing" for >3 days, appointments in the next 48 hours, documents still missing.

3. **Applications table shows too many columns by default** — the DataTable has good column visibility controls, but the defaults should be smarter. An admin doing daily work needs: name, country, status, appointment date, documents progress. Not invoice_status and currency on first glance.

4. **No quick-action buttons on application rows** — to change a status you need to open the full detail card. A simple dropdown right on the row to move status forward would save dozens of clicks per day.

5. **Calendar is read-only display** — can't create appointments from the calendar view. Should support click-to-create.

---

### Sidebar Group: "Portal Config"

| Route | Verdict | Notes |
|-------|---------|-------|
| **Document Checklists** | ✅ KEEP | Essential — defines what documents each visa type needs |
| **Portal Content** | ✅ KEEP | Video guides and info for applicants |
| **Portal Form Fields** | ✅ KEEP | Dynamic form config — powerful feature |
| **Countries** | ✅ KEEP | Country management for dropdowns |
| **Visa Types** | ✅ KEEP | Visa type options |
| **Booking Templates** | ✅ KEEP | Hotel booking PDF generation |
| **Letter Templates** | ✅ KEEP | Letter of intent AI generation |

**Issues:**

6. **7 items for portal config is too many sidebar entries** — Countries and Visa Types are rarely changed reference data. They should be sub-tabs inside a single "Portal Settings" page, not standalone sidebar items. Same with Booking Templates and Letter Templates — these are configuration, not daily-use pages.

7. **Portal Form Fields is powerful but complex** — the field definitions library + smart field templates + per-country assignments is a 3-layer system. Admin UX needs simplification. Most consultants are not developers — they need a visual form builder, not a field definition library.

---

### Sidebar Group: "Finance"

| Route | Verdict | Notes |
|-------|---------|-------|
| **Finance** | ✅ KEEP | Debt overview is essential for a consulting business |
| **Debt Individual** | ⚠️ MERGE | This is just a filtered view of applications where payment_status = unpaid. Should be a tab/filter on the Finance page, not a separate route |
| **Debt Corporate** | ⚠️ MERGE | Same — filtered view by company. Should be a tab on Finance |

**Issues:**

8. **3 separate pages for what's essentially one concern** — "who owes us money?" should be ONE page with tabs: Overview / By Person / By Company. Not 3 sidebar items.

---

### Sidebar Group: "Reports"

| Route | Verdict | Notes |
|-------|---------|-------|
| **At Consulate** | ✅ KEEP | Critical daily view — what's currently at embassies |
| **Country Reports** | ⚠️ MERGE | This is applications filtered by country. Could be a filter on the main Applications table |
| **Consulate Metrics** | ⚠️ MERGE | Charts are nice but rarely used daily. Merge with Country Metrics into one "Analytics" page |
| **Country Metrics** | ⚠️ MERGE | See above |
| **Referral Report** | ⚠️ KEEP (conditional) | Only if you actively use referral tracking. If not, remove |

**Issues:**

9. **"At Consulate" duplicates an applications filter** — this is literally `WHERE visa_status = 'konsoloslukta'`. Should be a saved filter/view on the Applications page, or a dashboard widget. Having a dedicated sidebar item for one status filter is overkill.

10. **4 report pages that could be 1** — a single "Reports & Analytics" page with tabs (By Country, By Consulate, Metrics Charts) would be much cleaner.

---

## REMOVE — Not Core Business

### Management Group → REMOVE ENTIRELY

| Route | Verdict | Why |
|-------|---------|-----|
| **Documents** | ❌ REMOVE | HTML template editor for document templates. These templates aren't used anywhere in the actual workflow — the real documents are generated via the Python PDF sidecar and Gemini AI. This is dead weight. |
| **Tags** | ❌ REMOVE | Color-coded labels sound useful but add complexity without clear workflow value. Visa status + country + payment status already provide sufficient categorization. |
| **Forms** | ❌ REMOVE | Dynamic form builder that duplicates what Portal Form Fields already does. The portal form system is more sophisticated. This is a second, disconnected form system. |
| **Passwords** | ❌ REMOVE | A built-in password manager has no business being in a visa consulting platform. Use 1Password/Bitwarden. |

### AI Group → REMOVE (for now)

| Route | Verdict | Why |
|-------|---------|-----|
| **AI Analysis** | ❌ REMOVE | Placeholder with no backend. Natural language data queries are cool but not core. |
| **AI Assistant** | ❌ REMOVE | Letter generation already happens automatically via Letter Templates + Gemini. This manual form is redundant. |
| **AI Prompts** | ❌ REMOVE | Not connected to any database table. Dead code. |
| **AI Settings** | ❌ REMOVE | Not connected to anything. Dead code. |

*Note: The actual AI that matters (Gemini letter generation) lives in the Letter Templates config and fires automatically on portal submission. That stays.*

### Email Group → REMOVE ENTIRELY

| Route | Verdict | Why |
|-------|---------|-----|
| **Email Hosting** | ❌ REMOVE | No email server. Completely non-functional. |
| **Email Management** | ❌ REMOVE | Templates for a notification system that doesn't exist yet. Remove and build properly when you actually integrate email. |

### System Group → HEAVILY TRIM

| Route | Verdict | Why |
|-------|---------|-----|
| **Settings** | ✅ KEEP | But trim the 7 tabs. Keep: Company info, Users. Remove: SMS config (not working), Telegram (not working), Website (not relevant), Reports config |
| **Security** | ❌ REMOVE | 2FA is not implemented. UI-only shell. |
| **Contracts** | ❌ REMOVE | Static HTML. Not dynamic. Not useful. |
| **Logs** | ⚠️ KEEP (optional) | Audit trail has value but isn't daily-use. Could be a sub-tab in Settings |
| **Invoices** | ❌ REMOVE | Empty placeholder. Zero functionality. |
| **CDN Files** | ❌ REMOVE | Generic file upload. Not specific to visa workflow. Portal uploads handle document files. |
| **Support** | ❌ REMOVE | Broken (wrong table name) and not core. Use Intercom/Crisp if you need support. |
| **Support Center** | ❌ REMOVE | 6 hardcoded FAQs. Not worth a sidebar item. |

---

## PROPOSED NEW SIDEBAR (13 items → down from 38)

```
── MAIN
   ├── Dashboard          (reworked: actionable widgets)
   ├── Applications       (core table + inline status actions)
   ├── Appointments       (with calendar toggle view)
   └── Companies

── PORTAL CONFIG
   ├── Form & Checklists  (merge: form fields + doc checklists + countries + visa types)
   ├── Content & Guides   (portal content stays as-is)
   └── Document Generation (merge: booking templates + letter templates)

── FINANCE & REPORTS
   ├── Finance            (merge: overview + individual + corporate as tabs)
   └── Reports            (merge: at-consulate + country reports + metrics as tabs)

── SYSTEM
   ├── Settings           (trimmed: company info + user management only)
   └── Activity Logs      (optional, can hide under Settings)
```

That's **11-13 items** vs the current **38**. The admin opens the app and immediately sees what matters.

---

## CUSTOMER PORTAL — Keep As-Is (it's good)

The portal is well-built:
- 4-step wizard (country → guides → form → confirmation)
- Status tracking with animated timeline
- Document upload with drag-drop
- Edit personal info

**Minor portal issues:**

11. **No way back from Step 2 guides** — if someone picks the wrong country, they should be able to go back to Step 1. Check that back navigation works at every step.

12. **Tracking code is the only access method** — no email/SMS link sent. If the customer loses the code, they're locked out. Need to add email-based lookup or phone verification as backup.

13. **Portal header logo links to /portal/apply** — correct behavior, but there's no "already applied?" link to get to the status page. A customer returning to the portal has to know to append their tracking code to the URL.

---

## SUMMARY OF ISSUES (numbered for reference)

1. Applications form has 40+ fields — overwhelming admin UX
2. Dashboard shows vanity metrics, not actionable info
3. Applications table default columns aren't optimized for daily work
4. No inline status-change actions on application rows
5. Calendar is read-only — can't create appointments from it
6. Portal config has 7 sidebar items for what should be 2-3
7. Portal Form Fields admin is too complex for non-technical users
8. Finance is split across 3 pages unnecessarily
9. "At Consulate" is just a status filter pretending to be a page
10. 4 report pages should be 1 with tabs
11. Portal wizard may lack back navigation between steps
12. No fallback if customer loses tracking code
13. No "check my status" entry point on portal landing
