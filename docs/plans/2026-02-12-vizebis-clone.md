# VizeBis Clone — Full Platform Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a full-featured visa consulting management platform (clone of VizeBis) with 37 pages, covering applications, companies, appointments, documents, reports, AI features, chat, email, and settings.

**Architecture:** Next.js 14+ App Router with Supabase (auth, PostgreSQL, storage, realtime). Single-tenant deployment. Server Components by default, Client Components where interactivity is needed. i18n via next-intl with Turkish and English support.

**Tech Stack:**
- **Framework:** Next.js 14+ (App Router, `src/` directory)
- **Database/Auth/Storage:** Supabase (PostgreSQL, Auth, Storage, Realtime)
- **UI:** Tailwind CSS + shadcn/ui
- **Tables:** TanStack Table v8
- **Charts:** Recharts
- **i18n:** next-intl (Turkish + English)
- **Forms:** React Hook Form + Zod
- **AI:** OpenAI API (GPT-3.5/4)
- **State:** Zustand (minimal, mostly server state via Supabase)

---

## Phase 1: Project Setup & Infrastructure

### Task 1.1: Initialize Next.js Project

**Files:**
- Create: project root files via CLI

**Step 1: Create Next.js app**
```bash
cd "/Users/tiodeniz/VSCode Workspace/vizebis_clone"
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```
Select: Yes to all defaults, App Router, src/ directory, Tailwind, TypeScript.

**Step 2: Verify it runs**
```bash
npm run dev
```
Expected: App running on localhost:3000

**Step 3: Commit**
```bash
git init && git add -A && git commit -m "chore: initialize Next.js project"
```

---

### Task 1.2: Install Core Dependencies

**Step 1: Install dependencies**
```bash
npm install @supabase/supabase-js @supabase/ssr next-intl @tanstack/react-table react-hook-form @hookform/resolvers zod zustand recharts date-fns lucide-react clsx tailwind-merge
```

**Step 2: Install dev dependencies**
```bash
npm install -D @types/node supabase
```

**Step 3: Commit**
```bash
git add -A && git commit -m "chore: install core dependencies"
```

---

### Task 1.3: Setup shadcn/ui

**Step 1: Initialize shadcn**
```bash
npx shadcn@latest init
```
Select: Default style, Slate base color, CSS variables yes.

**Step 2: Add essential components**
```bash
npx shadcn@latest add button input label select textarea checkbox radio-group dialog sheet table card badge tabs form dropdown-menu popover calendar command tooltip avatar separator scroll-area switch toast sonner
```

**Step 3: Commit**
```bash
git add -A && git commit -m "chore: setup shadcn/ui with essential components"
```

---

### Task 1.4: Setup Utility Functions

**Files:**
- Create: `src/lib/utils.ts`

**Step 1: Create utility file**

```typescript
// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: "TL" | "USD" | "EUR" = "TL"): string {
  const localeMap = { TL: "tr-TR", USD: "en-US", EUR: "de-DE" };
  const currencyMap = { TL: "TRY", USD: "USD", EUR: "EUR" };
  return new Intl.NumberFormat(localeMap[currency], {
    style: "currency",
    currency: currencyMap[currency],
  }).format(amount);
}

export function formatDate(date: string | Date, locale: string = "tr-TR"): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date, locale: string = "tr-TR"): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}
```

**Step 2: Commit**
```bash
git add src/lib/utils.ts && git commit -m "feat: add utility functions"
```

---

### Task 1.5: Setup next-intl (i18n)

**Files:**
- Create: `src/i18n/routing.ts`
- Create: `src/i18n/request.ts`
- Create: `src/i18n/navigation.ts`
- Create: `src/middleware.ts`
- Create: `messages/en.json`
- Create: `messages/tr.json`

**Step 1: Create routing config**

```typescript
// src/i18n/routing.ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["tr", "en"],
  defaultLocale: "tr",
  localePrefix: "as-needed",
});
```

**Step 2: Create request config**

```typescript
// src/i18n/request.ts
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
```

**Step 3: Create navigation helpers**

```typescript
// src/i18n/navigation.ts
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
```

**Step 4: Create middleware**

```typescript
// src/middleware.ts
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
```

**Step 5: Create initial translation files**

```json
// messages/tr.json
{
  "common": {
    "save": "Kaydet",
    "cancel": "İptal",
    "delete": "Sil",
    "edit": "Düzenle",
    "add": "Ekle",
    "search": "Ara",
    "filter": "Filtrele",
    "export": "Dışa Aktar",
    "print": "Yazdır",
    "refresh": "Yenile",
    "loading": "Yükleniyor...",
    "noData": "Veri bulunamadı",
    "confirm": "Onayla",
    "back": "Geri",
    "next": "İleri",
    "close": "Kapat",
    "yes": "Evet",
    "no": "Hayır",
    "all": "Tümü",
    "active": "Aktif",
    "passive": "Pasif",
    "status": "Durum",
    "actions": "İşlemler",
    "description": "Açıklama",
    "date": "Tarih",
    "total": "Toplam"
  },
  "nav": {
    "dashboard": "Dashboard",
    "applications": "Başvurular",
    "addApplication": "Başvuru Ekle",
    "companies": "Firmalar",
    "appointments": "Randevular",
    "calendar": "Takvim",
    "documents": "Evrak Yönetimi",
    "tags": "Etiket Yönetimi",
    "forms": "Form Yönetimi",
    "passwords": "Şifre Yönetimi",
    "finance": "Finans Merkezi",
    "debtIndividual": "Borç Bireysel",
    "debtCorporate": "Borç Kurumsal",
    "countryReports": "Ülke Raporları",
    "atConsulate": "Konsoloslukta",
    "consulateMetrics": "Konsolosluk Metrikleri",
    "countryMetrics": "Ülke Metrikleri",
    "referralReport": "Referans Raporu",
    "aiAnalysis": "AI Veri Analizi",
    "aiAssistant": "AI Asistan",
    "aiPrompts": "AI Prompt Yönetimi",
    "aiSettings": "AI Ayarları",
    "emailHosting": "Email Hosting",
    "emailManagement": "Email Yönetimi",
    "settings": "Firma Ayarları",
    "support": "Destek & Ticket",
    "supportCenter": "Destek Merkezi",
    "security": "2FA Güvenlik",
    "contracts": "Sözleşme İmza",
    "logs": "Log Kontrol",
    "invoices": "Faturalar",
    "cdnFiles": "CDN Dosyalarım",
    "profile": "Profil",
    "notifications": "Bildirimler"
  },
  "auth": {
    "login": "Giriş Yap",
    "logout": "Çıkış Yap",
    "email": "E-posta",
    "password": "Şifre",
    "forgotPassword": "Şifremi Unuttum",
    "register": "Kayıt Ol"
  },
  "dashboard": {
    "totalApplications": "Toplam Başvuru",
    "pendingApplications": "Bekleyen Başvuru",
    "completedApplications": "Tamamlanan",
    "totalDebt": "Toplam Borç",
    "recentApplications": "Son Başvurular",
    "recentAppointments": "Son Randevular",
    "thisWeekAppointments": "Bu Haftanın Randevuları",
    "lastWeekAppointments": "Geçen Haftanın Randevuları"
  },
  "applications": {
    "title": "Başvuru Listesi",
    "addNew": "Yeni Başvuru",
    "fullName": "Ad Soyad",
    "idNumber": "TC Kimlik No",
    "dateOfBirth": "Doğum Tarihi",
    "phone": "Telefon",
    "email": "E-posta",
    "subCompany": "Alt Firma",
    "passportNo": "Pasaport No",
    "passportExpiry": "Pasaport Bitiş",
    "visaStart": "Vize Başlangıç",
    "visaEnd": "Vize Bitiş",
    "visaStatus": "Vize Durumu",
    "visaType": "Vize Türü",
    "country": "Ülke",
    "appointmentDate": "Randevu Tarihi",
    "appointmentTime": "Randevu Saati",
    "pickupDate": "Çıkış Tarihi",
    "travelDate": "Seyahat Tarihi",
    "consulateFee": "Konsolosluk Ücreti",
    "serviceFee": "Servis Ücreti",
    "currency": "Döviz",
    "invoiceStatus": "Fatura Durumu",
    "invoiceDate": "Fatura Tarihi",
    "invoiceNumber": "Fatura Numarası",
    "paymentStatus": "Ödeme Durumu",
    "paymentDate": "Ödeme Tarihi",
    "paymentMethod": "Ödeme Yöntemi",
    "paymentNote": "Ödeme Notu",
    "consulateAppNo": "Konsolosluk Başvuru No",
    "consulateOffice": "Konsolosluk Ofisi",
    "passportPhoto": "Pasaport Fotoğrafı",
    "visaPhoto": "Vize Fotoğrafı",
    "reference": "Referans",
    "visaRejected": "Vize Ret Mi?",
    "notes": "Açıklama",
    "assignedUser": "Atanan Kullanıcı",
    "assignmentNote": "Atama Notu",
    "personalInfo": "Kişisel Bilgiler",
    "passportVisaInfo": "Pasaport ve Vize Bilgileri",
    "appointmentTravel": "Randevu ve Seyahat",
    "feeInfo": "Ücret Bilgileri",
    "consulateInfo": "Konsolosluk Bilgileri",
    "files": "Dosyalar",
    "other": "Diğer"
  },
  "visaStatus": {
    "pending": "Beklemede",
    "preparing": "Hazırlanıyor",
    "atConsulate": "Konsoloslukta",
    "approved": "Vize Çıktı",
    "rejected": "Ret Oldu",
    "passportDelivered": "Pasaport Teslim"
  },
  "visaType": {
    "select": "Tür Seçin",
    "cultural": "Kültür",
    "commercial": "Ticari",
    "tourist": "Turistik",
    "visit": "Ziyaret",
    "other": "Diğer"
  },
  "paymentMethod": {
    "select": "Yöntem Seçin",
    "cash": "Nakit",
    "creditCard": "Kredi Kartı",
    "bankTransfer": "Havale/EFT",
    "virtualPos": "Sanal Pos"
  },
  "invoiceStatus": {
    "none": "Fatura Yok",
    "exists": "Fatura Var",
    "issued": "Fatura Kesildi"
  },
  "companies": {
    "title": "Firmalar",
    "addNew": "Yeni Firma",
    "companyName": "Firma Adı",
    "companyCode": "Firma Kodu",
    "phone": "Telefon",
    "email": "E-posta",
    "taxNumber": "Vergi No",
    "taxOffice": "Vergi Dairesi",
    "province": "İl",
    "district": "İlçe",
    "address": "Adres",
    "customerType": "Müşteri Tipi",
    "debtTL": "Borç (TL)",
    "debtUSD": "Borç (USD)",
    "debtEUR": "Borç (EUR)",
    "applicationCount": "Başvuru Sayısı",
    "passiveCompanies": "Pasif Firmalar"
  }
}
```

```json
// messages/en.json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "add": "Add",
    "search": "Search",
    "filter": "Filter",
    "export": "Export",
    "print": "Print",
    "refresh": "Refresh",
    "loading": "Loading...",
    "noData": "No data found",
    "confirm": "Confirm",
    "back": "Back",
    "next": "Next",
    "close": "Close",
    "yes": "Yes",
    "no": "No",
    "all": "All",
    "active": "Active",
    "passive": "Passive",
    "status": "Status",
    "actions": "Actions",
    "description": "Description",
    "date": "Date",
    "total": "Total"
  },
  "nav": {
    "dashboard": "Dashboard",
    "applications": "Applications",
    "addApplication": "Add Application",
    "companies": "Companies",
    "appointments": "Appointments",
    "calendar": "Calendar",
    "documents": "Document Management",
    "tags": "Tag Management",
    "forms": "Form Management",
    "passwords": "Password Manager",
    "finance": "Finance Center",
    "debtIndividual": "Individual Debt",
    "debtCorporate": "Corporate Debt",
    "countryReports": "Country Reports",
    "atConsulate": "At Consulate",
    "consulateMetrics": "Consulate Metrics",
    "countryMetrics": "Country Metrics",
    "referralReport": "Referral Report",
    "aiAnalysis": "AI Data Analysis",
    "aiAssistant": "AI Assistant",
    "aiPrompts": "AI Prompt Management",
    "aiSettings": "AI Settings",
    "emailHosting": "Email Hosting",
    "emailManagement": "Email Management",
    "settings": "Company Settings",
    "support": "Support & Ticket",
    "supportCenter": "Support Center",
    "security": "2FA Security",
    "contracts": "Contract Signing",
    "logs": "Log Control",
    "invoices": "Invoices",
    "cdnFiles": "CDN Files",
    "profile": "Profile",
    "notifications": "Notifications"
  },
  "auth": {
    "login": "Login",
    "logout": "Logout",
    "email": "Email",
    "password": "Password",
    "forgotPassword": "Forgot Password",
    "register": "Register"
  },
  "dashboard": {
    "totalApplications": "Total Applications",
    "pendingApplications": "Pending Applications",
    "completedApplications": "Completed",
    "totalDebt": "Total Debt",
    "recentApplications": "Recent Applications",
    "recentAppointments": "Recent Appointments",
    "thisWeekAppointments": "This Week's Appointments",
    "lastWeekAppointments": "Last Week's Appointments"
  },
  "applications": {
    "title": "Application List",
    "addNew": "New Application",
    "fullName": "Full Name",
    "idNumber": "ID Number",
    "dateOfBirth": "Date of Birth",
    "phone": "Phone",
    "email": "Email",
    "subCompany": "Sub-Company",
    "passportNo": "Passport No",
    "passportExpiry": "Passport Expiry",
    "visaStart": "Visa Start",
    "visaEnd": "Visa End",
    "visaStatus": "Visa Status",
    "visaType": "Visa Type",
    "country": "Country",
    "appointmentDate": "Appointment Date",
    "appointmentTime": "Appointment Time",
    "pickupDate": "Pickup Date",
    "travelDate": "Travel Date",
    "consulateFee": "Consulate Fee",
    "serviceFee": "Service Fee",
    "currency": "Currency",
    "invoiceStatus": "Invoice Status",
    "invoiceDate": "Invoice Date",
    "invoiceNumber": "Invoice Number",
    "paymentStatus": "Payment Status",
    "paymentDate": "Payment Date",
    "paymentMethod": "Payment Method",
    "paymentNote": "Payment Note",
    "consulateAppNo": "Consulate App No",
    "consulateOffice": "Consulate Office",
    "passportPhoto": "Passport Photo",
    "visaPhoto": "Visa Photo",
    "reference": "Reference",
    "visaRejected": "Visa Rejected?",
    "notes": "Notes",
    "assignedUser": "Assigned User",
    "assignmentNote": "Assignment Note",
    "personalInfo": "Personal Info",
    "passportVisaInfo": "Passport & Visa Info",
    "appointmentTravel": "Appointment & Travel",
    "feeInfo": "Fee Info",
    "consulateInfo": "Consulate Info",
    "files": "Files",
    "other": "Other"
  },
  "visaStatus": {
    "pending": "Pending",
    "preparing": "Preparing",
    "atConsulate": "At Consulate",
    "approved": "Visa Approved",
    "rejected": "Rejected",
    "passportDelivered": "Passport Delivered"
  },
  "visaType": {
    "select": "Select Type",
    "cultural": "Cultural",
    "commercial": "Commercial",
    "tourist": "Tourist",
    "visit": "Visit",
    "other": "Other"
  },
  "paymentMethod": {
    "select": "Select Method",
    "cash": "Cash",
    "creditCard": "Credit Card",
    "bankTransfer": "Bank Transfer",
    "virtualPos": "Virtual POS"
  },
  "invoiceStatus": {
    "none": "No Invoice",
    "exists": "Invoice Exists",
    "issued": "Invoice Issued"
  },
  "companies": {
    "title": "Companies",
    "addNew": "New Company",
    "companyName": "Company Name",
    "companyCode": "Company Code",
    "phone": "Phone",
    "email": "Email",
    "taxNumber": "Tax Number",
    "taxOffice": "Tax Office",
    "province": "Province",
    "district": "District",
    "address": "Address",
    "customerType": "Customer Type",
    "debtTL": "Debt (TL)",
    "debtUSD": "Debt (USD)",
    "debtEUR": "Debt (EUR)",
    "applicationCount": "Application Count",
    "passiveCompanies": "Passive Companies"
  }
}
```

**Step 6: Update next.config**

```javascript
// next.config.mjs
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default withNextIntl(nextConfig);
```

**Step 7: Commit**
```bash
git add -A && git commit -m "feat: setup next-intl with Turkish and English translations"
```

---

### Task 1.6: Setup Supabase Client

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/middleware.ts`
- Create: `.env.local`

**Step 1: Create .env.local**
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

**Step 2: Create browser client**

```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**Step 3: Create server client**

```typescript
// src/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component — ignore
          }
        },
      },
    }
  );
}
```

**Step 4: Create middleware helper**

```typescript
// src/lib/supabase/middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );
  await supabase.auth.getUser();
  return supabaseResponse;
}
```

**Step 5: Update middleware to combine i18n + Supabase**

```typescript
// src/middleware.ts
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { updateSession } from "./lib/supabase/middleware";
import { type NextRequest } from "next/server";

const intlMiddleware = createIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);
  const intlResponse = intlMiddleware(request);

  // Merge Supabase cookies into intl response
  response.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie.name, cookie.value);
  });

  return intlResponse;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
```

**Step 6: Commit**
```bash
git add -A && git commit -m "feat: setup Supabase client (browser, server, middleware)"
```

---

## Phase 2: Database Schema

### Task 2.1: Create Supabase Migration — Core Tables

**Files:**
- Create: `supabase/migrations/001_core_schema.sql`

**Step 1: Create migration file**

```sql
-- supabase/migrations/001_core_schema.sql

-- ============================================
-- ENUMS
-- ============================================
CREATE TYPE visa_status AS ENUM (
  'beklemede', 'hazirlaniyor', 'konsoloslukta',
  'vize_cikti', 'ret_oldu', 'pasaport_teslim'
);

CREATE TYPE visa_type AS ENUM (
  'kultur', 'ticari', 'turistik', 'ziyaret', 'diger'
);

CREATE TYPE currency_type AS ENUM ('TL', 'USD', 'EUR');

CREATE TYPE payment_status AS ENUM ('odenmedi', 'odendi');

CREATE TYPE payment_method AS ENUM (
  'nakit', 'kredi_karti', 'havale_eft', 'sanal_pos'
);

CREATE TYPE invoice_status AS ENUM (
  'fatura_yok', 'fatura_var', 'fatura_kesildi'
);

CREATE TYPE document_type AS ENUM ('genel', 'vize', 'pasaport', 'diger');
CREATE TYPE document_status AS ENUM ('aktif', 'pasif', 'taslak');
CREATE TYPE priority_type AS ENUM ('normal', 'dusuk', 'yuksek', 'acil');
CREATE TYPE access_level AS ENUM ('firma_uyeleri', 'herkes', 'sadece_admin');
CREATE TYPE user_role AS ENUM ('firma_admin', 'firma_calisan');

-- ============================================
-- PROFILES (extends Supabase auth.users)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  role user_role DEFAULT 'firma_calisan',
  avatar_url TEXT,
  telegram_chat_id TEXT,
  permissions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- COMPANIES (Firmalar)
-- ============================================
CREATE TABLE companies (
  id SERIAL PRIMARY KEY,
  customer_type TEXT DEFAULT 'bireysel',
  company_name TEXT NOT NULL,
  company_code TEXT UNIQUE,
  phone TEXT,
  email TEXT,
  tax_number TEXT,
  tax_office TEXT,
  password TEXT,
  province TEXT,
  district TEXT,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- REFERRALS (Referanslar)
-- ============================================
CREATE TABLE referrals (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  commission_rate DECIMAL(5,2) DEFAULT 0,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- APPLICATIONS (Başvurular)
-- ============================================
CREATE TABLE applications (
  id SERIAL PRIMARY KEY,
  -- Personal Info
  full_name TEXT NOT NULL,
  id_number TEXT,
  date_of_birth DATE,
  phone TEXT,
  email TEXT,
  company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,

  -- Passport & Visa
  passport_no TEXT,
  passport_expiry DATE,
  visa_start DATE,
  visa_end DATE,
  visa_status visa_status DEFAULT 'beklemede',
  visa_type visa_type,

  -- Appointment & Travel
  country TEXT,
  appointment_date DATE,
  appointment_time TIME,
  pickup_date DATE,
  travel_date DATE,

  -- Fees
  consulate_fee DECIMAL(12,2) DEFAULT 0,
  service_fee DECIMAL(12,2) DEFAULT 0,
  currency currency_type DEFAULT 'TL',
  invoice_status invoice_status DEFAULT 'fatura_yok',
  invoice_date DATE,
  invoice_number TEXT,
  payment_status payment_status DEFAULT 'odenmedi',
  payment_date DATE,
  payment_method payment_method,
  payment_note TEXT,

  -- Consulate
  consulate_app_no TEXT,
  consulate_office TEXT,

  -- Files (Supabase Storage paths)
  passport_photo TEXT,
  visa_photo TEXT,

  -- Other
  referral_id INTEGER REFERENCES referrals(id) ON DELETE SET NULL,
  visa_rejected BOOLEAN DEFAULT false,
  notes TEXT,
  assigned_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assignment_note TEXT,

  -- Meta
  is_deleted BOOLEAN DEFAULT false,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- APPOINTMENTS (Randevular)
-- ============================================
CREATE TABLE appointments (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  passport_no TEXT,
  id_number TEXT,
  date_of_birth DATE,
  email TEXT,
  passport_expiry DATE,
  company_name TEXT,
  country TEXT,
  visa_type visa_type,
  travel_date DATE,
  appointment_date DATE,
  payment_status TEXT DEFAULT 'beklemede',
  notes TEXT,
  passport_photo TEXT,
  application_id INTEGER REFERENCES applications(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- DOCUMENTS (Evraklar)
-- ============================================
CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  html_content TEXT,
  document_type document_type DEFAULT 'genel',
  category TEXT,
  status document_status DEFAULT 'aktif',
  priority priority_type DEFAULT 'normal',
  access_level access_level DEFAULT 'firma_uyeleri',
  tags TEXT[],
  view_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- TAGS (Etiketler)
-- ============================================
CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6c757d',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE application_tags (
  application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (application_id, tag_id)
);

-- ============================================
-- FORMS
-- ============================================
CREATE TABLE forms (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  fields JSONB DEFAULT '[]',
  status TEXT DEFAULT 'aktif',
  access_level access_level DEFAULT 'herkes',
  share_token TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE form_submissions (
  id SERIAL PRIMARY KEY,
  form_id INTEGER REFERENCES forms(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  status TEXT DEFAULT 'bekleyen',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- PASSWORD MANAGER
-- ============================================
CREATE TABLE password_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE passwords (
  id SERIAL PRIMARY KEY,
  category_id INTEGER REFERENCES password_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  application_id INTEGER REFERENCES applications(id) ON DELETE SET NULL,
  username TEXT,
  password TEXT,
  url TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- CHAT MESSAGES
-- ============================================
CREATE TABLE chat_messages (
  id SERIAL PRIMARY KEY,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- NOTIFICATIONS
-- ============================================
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- ACTIVITY LOGS
-- ============================================
CREATE TABLE activity_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- SUPPORT TICKETS
-- ============================================
CREATE TABLE tickets (
  id SERIAL PRIMARY KEY,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'acik',
  priority priority_type DEFAULT 'normal',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ticket_replies (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  sender_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- AI PROMPTS & SETTINGS
-- ============================================
CREATE TABLE ai_prompts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ai_settings (
  id SERIAL PRIMARY KEY,
  api_key TEXT,
  model TEXT DEFAULT 'gpt-3.5-turbo',
  max_tokens INTEGER DEFAULT 2000,
  temperature DECIMAL(3,2) DEFAULT 0.7,
  usage_limit INTEGER DEFAULT 100,
  auto_generate BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- EMAIL TEMPLATES
-- ============================================
CREATE TABLE email_templates (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT,
  html_content TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- SETTINGS (key-value for company settings)
-- ============================================
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- CDN FILES
-- ============================================
CREATE TABLE cdn_files (
  id SERIAL PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- COUNTRY LIST (for dropdowns)
-- ============================================
CREATE TABLE countries (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER DEFAULT 0
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_applications_company ON applications(company_id);
CREATE INDEX idx_applications_status ON applications(visa_status);
CREATE INDEX idx_applications_country ON applications(country);
CREATE INDEX idx_applications_appointment ON applications(appointment_date);
CREATE INDEX idx_applications_created ON applications(created_at);
CREATE INDEX idx_applications_deleted ON applications(is_deleted);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_chat_messages_receiver ON chat_messages(receiver_id, is_read);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at);

-- ============================================
-- RLS POLICIES (basic — all authenticated)
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE passwords ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE cdn_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;

-- Authenticated users can access all data (single-tenant)
CREATE POLICY "Authenticated access" ON profiles FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated access" ON companies FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated access" ON applications FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated access" ON appointments FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated access" ON documents FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated access" ON tags FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated access" ON application_tags FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated access" ON forms FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated access" ON form_submissions FOR ALL USING (true); -- public forms
CREATE POLICY "Authenticated access" ON password_categories FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated access" ON passwords FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated access" ON chat_messages FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated access" ON notifications FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated access" ON activity_logs FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated access" ON tickets FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated access" ON ticket_replies FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated access" ON ai_prompts FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated access" ON ai_settings FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated access" ON email_templates FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated access" ON settings FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated access" ON cdn_files FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated access" ON countries FOR ALL USING (true); -- public read

-- ============================================
-- TRIGGER: auto-update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_forms_updated_at BEFORE UPDATE ON forms FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_passwords_updated_at BEFORE UPDATE ON passwords FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_ai_prompts_updated_at BEFORE UPDATE ON ai_prompts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- TRIGGER: auto-create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- SEED: Country list
-- ============================================
INSERT INTO countries (name) VALUES
('ABD'),('ALMANYA'),('AVUSTURYA'),('BELCIKA'),('BULGARISTAN'),
('CEK CUMHURRIYETI'),('CEZAYIR'),('CIN'),('DANIMARKA'),('DUBAI'),
('FINLADIYA'),('FRANSA'),('HINDISTAN'),('HOLLANDA'),('INGILTERE'),
('ISPANYA'),('ISVEC'),('ISVICRE'),('ITALYA'),('KATAR'),
('KUVEYT'),('MACARISTAN'),('PAKISTAN'),('PORTEKIZ'),('ROMANYA'),
('RUSYA'),('SLOVENYA'),('SUUDI ARABISTAN'),('YUNANISTAN');

-- Seed default AI settings
INSERT INTO ai_settings (model, max_tokens, temperature) VALUES ('gpt-3.5-turbo', 2000, 0.7);
```

**Step 2: Apply migration via Supabase dashboard or CLI**
```bash
npx supabase db push
```

**Step 3: Generate TypeScript types**
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/supabase/database.types.ts
```

**Step 4: Commit**
```bash
git add -A && git commit -m "feat: add database schema migration with all tables"
```

---

## Phase 3: Layout, Navigation & Auth

### Task 3.1: Create Auth Pages (Login/Register)

**Files:**
- Create: `src/app/[locale]/login/page.tsx`
- Create: `src/app/[locale]/login/actions.ts`

**Step 1: Create login server action**

```typescript
// src/app/[locale]/login/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function login(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });
  if (error) return { error: error.message };
  redirect("/dashboard");
}

export async function register(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    options: {
      data: { full_name: formData.get("fullName") as string },
    },
  });
  if (error) return { error: error.message };
  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
```

**Step 2: Create login page**

```tsx
// src/app/[locale]/login/page.tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { login, register } from "./actions";

export default function LoginPage() {
  const t = useTranslations("auth");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(formData: FormData) {
    const result = isRegister ? await register(formData) : await login(formData);
    if (result?.error) setError(result.error);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            VizeBis {isRegister ? t("register") : t("login")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <Label htmlFor="fullName">Ad Soyad</Label>
                <Input id="fullName" name="fullName" required />
              </div>
            )}
            <div>
              <Label htmlFor="email">{t("email")}</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div>
              <Label htmlFor="password">{t("password")}</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button type="submit" className="w-full">
              {isRegister ? t("register") : t("login")}
            </Button>
          </form>
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="mt-4 text-sm text-blue-600 hover:underline w-full text-center block"
          >
            {isRegister ? t("login") : t("register")}
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 3: Commit**
```bash
git add -A && git commit -m "feat: add login and register pages with Supabase auth"
```

---

### Task 3.2: Create App Layout with Sidebar Navigation

**Files:**
- Create: `src/app/[locale]/(app)/layout.tsx`
- Create: `src/components/layout/sidebar.tsx`
- Create: `src/components/layout/header.tsx`
- Create: `src/components/layout/locale-switcher.tsx`

**Step 1: Create sidebar component**

```tsx
// src/components/layout/sidebar.tsx
"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, FileText, Building2, CalendarDays, Calendar,
  FolderOpen, Tag, FileCheck, Lock, Landmark, Receipt, Globe,
  Building, BarChart3, MapPin, Users, Bot, MessageSquare,
  Cpu, Settings, Mail, MailPlus, Shield, FileSignature,
  ScrollText, HardDrive, Headphones, HelpCircle, Bell, User
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const navGroups = [
  {
    label: "main",
    items: [
      { key: "dashboard", href: "/dashboard", icon: LayoutDashboard },
      { key: "applications", href: "/applications", icon: FileText },
      { key: "companies", href: "/companies", icon: Building2 },
      { key: "appointments", href: "/appointments", icon: CalendarDays },
      { key: "calendar", href: "/calendar", icon: Calendar },
    ],
  },
  {
    label: "management",
    items: [
      { key: "documents", href: "/documents", icon: FolderOpen },
      { key: "tags", href: "/tags", icon: Tag },
      { key: "forms", href: "/forms", icon: FileCheck },
      { key: "passwords", href: "/passwords", icon: Lock },
    ],
  },
  {
    label: "finance",
    items: [
      { key: "finance", href: "/finance", icon: Landmark },
      { key: "debtIndividual", href: "/debt-individual", icon: Receipt },
      { key: "debtCorporate", href: "/debt-corporate", icon: Building },
    ],
  },
  {
    label: "reports",
    items: [
      { key: "countryReports", href: "/country-reports", icon: Globe },
      { key: "atConsulate", href: "/at-consulate", icon: MapPin },
      { key: "consulateMetrics", href: "/consulate-metrics", icon: BarChart3 },
      { key: "countryMetrics", href: "/country-metrics", icon: BarChart3 },
      { key: "referralReport", href: "/referral-report", icon: Users },
    ],
  },
  {
    label: "ai",
    items: [
      { key: "aiAnalysis", href: "/ai-analysis", icon: Bot },
      { key: "aiAssistant", href: "/ai-assistant", icon: MessageSquare },
      { key: "aiPrompts", href: "/ai-prompts", icon: Cpu },
      { key: "aiSettings", href: "/ai-settings", icon: Settings },
    ],
  },
  {
    label: "email",
    items: [
      { key: "emailHosting", href: "/email-hosting", icon: Mail },
      { key: "emailManagement", href: "/email-management", icon: MailPlus },
    ],
  },
  {
    label: "system",
    items: [
      { key: "settings", href: "/settings", icon: Settings },
      { key: "security", href: "/security", icon: Shield },
      { key: "contracts", href: "/contracts", icon: FileSignature },
      { key: "logs", href: "/logs", icon: ScrollText },
      { key: "invoices", href: "/invoices", icon: Receipt },
      { key: "cdnFiles", href: "/cdn-files", icon: HardDrive },
      { key: "support", href: "/support", icon: Headphones },
      { key: "supportCenter", href: "/support-center", icon: HelpCircle },
    ],
  },
];

export function Sidebar() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r bg-white h-screen flex flex-col">
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold text-blue-600">VizeBis</h1>
      </div>
      <ScrollArea className="flex-1 py-2">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-2">
            {group.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {t(item.key)}
                </Link>
              );
            })}
            <div className="my-2 mx-4 border-b" />
          </div>
        ))}
      </ScrollArea>
    </aside>
  );
}
```

**Step 2: Create header component**

```tsx
// src/components/layout/header.tsx
"use client";

import { Bell, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./locale-switcher";
import { logout } from "@/app/[locale]/login/actions";

export function Header({ userName }: { userName?: string }) {
  const t = useTranslations();

  return (
    <header className="h-14 border-b bg-white flex items-center justify-between px-6">
      <div />
      <div className="flex items-center gap-3">
        <LocaleSwitcher />
        <Link href="/notifications">
          <Button variant="ghost" size="icon">
            <Bell className="h-4 w-4" />
          </Button>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <User className="h-4 w-4" />
              {userName || t("nav.profile")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href="/profile">{t("nav.profile")}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => logout()}>
              <LogOut className="h-4 w-4 mr-2" />
              {t("auth.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
```

**Step 3: Create locale switcher**

```tsx
// src/components/layout/locale-switcher.tsx
"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale() {
    const newLocale = locale === "tr" ? "en" : "tr";
    router.replace(pathname, { locale: newLocale });
  }

  return (
    <Button variant="ghost" size="sm" onClick={switchLocale}>
      {locale === "tr" ? "EN" : "TR"}
    </Button>
  );
}
```

**Step 4: Create app layout**

```tsx
// src/app/[locale]/(app)/layout.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header userName={profile?.full_name || user.email} />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

**Step 5: Create root locale layout**

```tsx
// src/app/[locale]/layout.tsx
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import "../globals.css";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as any)) notFound();

  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

**Step 6: Commit**
```bash
git add -A && git commit -m "feat: add app layout with sidebar navigation, header, and locale switcher"
```

---

## Phase 4: Dashboard

### Task 4.1: Create Dashboard Page

**Files:**
- Create: `src/app/[locale]/(app)/dashboard/page.tsx`
- Create: `src/components/dashboard/stat-card.tsx`
- Create: `src/components/dashboard/recent-table.tsx`

**Step 1: Create stat card component**

```tsx
// src/components/dashboard/stat-card.tsx
import { Card, CardContent } from "@/components/ui/card";
import { type LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  variant?: "default" | "blue" | "green" | "yellow" | "red";
}

const variantStyles = {
  default: "bg-white",
  blue: "bg-blue-50 border-blue-200",
  green: "bg-green-50 border-green-200",
  yellow: "bg-yellow-50 border-yellow-200",
  red: "bg-red-50 border-red-200",
};

export function StatCard({ title, value, icon: Icon, description, variant = "default" }: StatCardProps) {
  return (
    <Card className={variantStyles[variant]}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
          </div>
          <Icon className="h-8 w-8 text-muted-foreground/50" />
        </div>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Create dashboard page**

```tsx
// src/app/[locale]/(app)/dashboard/page.tsx
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { StatCard } from "@/components/dashboard/stat-card";
import { FileText, Clock, CheckCircle, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const supabase = await createClient();

  // Fetch stats
  const { count: totalApps } = await supabase
    .from("applications").select("*", { count: "exact", head: true }).eq("is_deleted", false);
  const { count: pendingApps } = await supabase
    .from("applications").select("*", { count: "exact", head: true })
    .eq("is_deleted", false).eq("visa_status", "beklemede");
  const { count: completedApps } = await supabase
    .from("applications").select("*", { count: "exact", head: true })
    .eq("is_deleted", false).eq("visa_status", "pasaport_teslim");

  // Fetch recent applications
  const { data: recentApps } = await supabase
    .from("applications")
    .select("id, full_name, country, visa_status, created_at")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(5);

  // Fetch recent appointments
  const { data: recentAppointments } = await supabase
    .from("appointments")
    .select("id, full_name, country, appointment_date, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  const statusColors: Record<string, string> = {
    beklemede: "bg-gray-100 text-gray-800",
    hazirlaniyor: "bg-gray-100 text-gray-800",
    konsoloslukta: "bg-yellow-100 text-yellow-800",
    vize_cikti: "bg-blue-100 text-blue-800",
    ret_oldu: "bg-red-100 text-red-800",
    pasaport_teslim: "bg-green-100 text-green-800",
  };

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title={t("totalApplications")} value={totalApps || 0} icon={FileText} variant="blue" />
        <StatCard title={t("pendingApplications")} value={pendingApps || 0} icon={Clock} variant="yellow" />
        <StatCard title={t("completedApplications")} value={completedApps || 0} icon={CheckCircle} variant="green" />
        <StatCard title={t("totalDebt")} value="—" icon={DollarSign} variant="red" />
      </div>

      {/* Recent Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("recentApplications")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentApps?.map((app) => (
                <div key={app.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm">{app.full_name}</p>
                    <p className="text-xs text-muted-foreground">{app.country}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusColors[app.visa_status] || ""} variant="secondary">
                      {app.visa_status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(app.created_at)}
                    </span>
                  </div>
                </div>
              ))}
              {(!recentApps || recentApps.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">No data</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("recentAppointments")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentAppointments?.map((apt) => (
                <div key={apt.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm">{apt.full_name}</p>
                    <p className="text-xs text-muted-foreground">{apt.country}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {apt.appointment_date ? formatDate(apt.appointment_date) : "—"}
                  </span>
                </div>
              ))}
              {(!recentAppointments || recentAppointments.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">No data</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

**Step 3: Commit**
```bash
git add -A && git commit -m "feat: add dashboard page with stats and recent activity"
```

---

## Phase 5: Applications (Core Module)

### Task 5.1: Create Reusable Data Table Component

**Files:**
- Create: `src/components/data-table/data-table.tsx`
- Create: `src/components/data-table/data-table-pagination.tsx`
- Create: `src/components/data-table/data-table-toolbar.tsx`

> This is the foundation component used by Applications, Companies, Appointments, and all report pages. Build it once, use everywhere.

**Step 1: Create the DataTable component** — a reusable TanStack Table wrapper with sorting, filtering, pagination, and column visibility. Full code provided in implementation.

**Step 2: Create pagination component** — page buttons, items-per-page selector (10, 25, 50, 100).

**Step 3: Create toolbar** — search input, filter dropdowns, export/print/refresh buttons.

**Step 4: Commit**
```bash
git add -A && git commit -m "feat: add reusable DataTable component with sorting, filtering, pagination"
```

---

### Task 5.2: Create Application List Page

**Files:**
- Create: `src/app/[locale]/(app)/applications/page.tsx`
- Create: `src/app/[locale]/(app)/applications/columns.tsx`
- Create: `src/app/[locale]/(app)/applications/filters.tsx`

**Implementation:** Server component that fetches applications from Supabase, renders DataTable with:
- 14 columns: ID, Ad Soyad, Pasaport, Firma, Ülke, Randevu, Çıkış Tarihi, İletişim, Ücret, FT, Ödeme, Durum, Açıklama, Aksiyonlar
- Status filter dropdown (all visa statuses)
- Country filter dropdown
- Date quick-filters: Bugün, Bu Ay, Geçen Ay, Önümüzdeki Ay
- Date range picker
- Column visibility toggle
- Row color coding based on visa_status
- Red background for appointments within 10 days
- CSV export
- Items per page: 10, 25, 50, 100

**Step 5: Commit**
```bash
git add -A && git commit -m "feat: add applications list page with filters and color coding"
```

---

### Task 5.3: Create Application Add/Edit Modal

**Files:**
- Create: `src/components/applications/application-form.tsx`

**Implementation:** Modal dialog with tabbed form (6 sections from the scrape):
1. Kişisel Bilgiler (Personal Info) — 6 fields
2. Pasaport ve Vize Bilgileri — 6 fields
3. Randevu ve Seyahat — 5 fields
4. Ücret Bilgileri — 10 fields
5. Konsolosluk Bilgileri — 2 fields + file uploads
6. Diğer — 5 fields

Uses React Hook Form + Zod validation. Saves to Supabase. File uploads go to Supabase Storage.

**Step: Commit**
```bash
git add -A && git commit -m "feat: add application add/edit form with all 40 fields"
```

---

### Task 5.4: Create Application Detail Modal + Quick Update

**Files:**
- Create: `src/components/applications/application-detail.tsx`
- Create: `src/components/applications/quick-update.tsx`

**Implementation:** Detail view modal (read-only with all fields), quick update dropdown for status changes inline in the table.

---

### Task 5.5: Create Application SMS Modal + Deleted Applications

**Files:**
- Create: `src/components/applications/sms-modal.tsx`
- Create: `src/components/applications/deleted-applications.tsx`

**Implementation:** SMS sending form with ready-made templates, soft-deleted applications viewer.

---

## Phase 6: Companies

### Task 6.1: Create Companies Page

**Files:**
- Create: `src/app/[locale]/(app)/companies/page.tsx`
- Create: `src/components/companies/company-form.tsx`

**Implementation:** DataTable with columns: ID, Firma Kodu, Firma Adı, Telefon, Borç (TL/USD/EUR), Başvuru Sayısı, İşlemler. Add/Edit modal with 11 fields. Active/Passive toggle.

---

## Phase 7: Appointments

### Task 7.1: Create Appointments Page

**Files:**
- Create: `src/app/[locale]/(app)/appointments/page.tsx`
- Create: `src/components/appointments/appointment-form.tsx`

**Implementation:** DataTable with 16 columns. Add/Edit form with 14 fields. File upload for passport photo.

---

## Phase 8: Calendar

### Task 8.1: Create Calendar Page

**Files:**
- Create: `src/app/[locale]/(app)/calendar/page.tsx`

**Implementation:** Full calendar view showing appointments. Use a calendar library or build a custom week/month view. Clicking a date shows appointments for that day.

---

## Phase 9: Documents

### Task 9.1: Create Document Management Page

**Files:**
- Create: `src/app/[locale]/(app)/documents/page.tsx`
- Create: `src/components/documents/document-form.tsx`

**Implementation:** Filter form (category, status, type, search), DataTable with 9 columns, Add/Edit form with 9 fields including HTML content editor. Export, print, refresh actions.

---

## Phase 10: Tags

### Task 10.1: Create Tag Management Page

**Files:**
- Create: `src/app/[locale]/(app)/tags/page.tsx`

**Implementation:** Tag list with filters (visa status, search, date range). CRUD operations for tags.

---

## Phase 11: Reports (6 pages)

### Task 11.1: Individual Debt Report
**File:** `src/app/[locale]/(app)/debt-individual/page.tsx`
DataTable with 16 columns. Read-only report from applications with unpaid fees.

### Task 11.2: Corporate Debt Report
**File:** `src/app/[locale]/(app)/debt-corporate/page.tsx`
DataTable with 9 columns. Aggregated debt per company in TL/USD/EUR.

### Task 11.3: Country Reports
**File:** `src/app/[locale]/(app)/country-reports/page.tsx`
DataTable with 8 columns. Filter by country.

### Task 11.4: At Consulate Report
**File:** `src/app/[locale]/(app)/at-consulate/page.tsx`
DataTable with 7 columns. Applications currently at consulate.

### Task 11.5: Consulate Metrics
**File:** `src/app/[locale]/(app)/consulate-metrics/page.tsx`
Charts/metrics view using Recharts. No table.

### Task 11.6: Country Metrics
**File:** `src/app/[locale]/(app)/country-metrics/page.tsx`
Charts with date filter using Recharts.

### Task 11.7: Referral Report
**File:** `src/app/[locale]/(app)/referral-report/page.tsx`
Referral tracking with commission. CRUD for referral sources.

---

## Phase 12: Form Management

### Task 12.1: Create Form Management Page
**File:** `src/app/[locale]/(app)/forms/page.tsx`
DataTable with 10 columns. Create customer-facing forms with JSON field builder. Share via link. Track submissions.

---

## Phase 13: Finance Center

### Task 13.1: Create Finance Center Page
**File:** `src/app/[locale]/(app)/finance/page.tsx`
Financial overview with summary metrics across all currencies.

---

## Phase 14: AI Features (4 pages)

### Task 14.1: AI Data Analysis Chat
**File:** `src/app/[locale]/(app)/ai-analysis/page.tsx`
Chat interface. User sends natural language query, backend converts to SQL via OpenAI, returns results. Pre-built example queries.

### Task 14.2: AI Letter Generator
**File:** `src/app/[locale]/(app)/ai-assistant/page.tsx`
Form with 12 fields (name, country, city, dates, etc). Generates visa support letters via OpenAI in selected language.

### Task 14.3: AI Prompt Management
**File:** `src/app/[locale]/(app)/ai-prompts/page.tsx`
CRUD for prompt templates. Template variables. DataTable listing.

### Task 14.4: AI Settings
**File:** `src/app/[locale]/(app)/ai-settings/page.tsx`
Form: API key, model selection, max tokens, temperature, usage limit, auto-generate toggle.

---

## Phase 15: Settings (7 tabs)

### Task 15.1: Create Settings Page with Tabs
**File:** `src/app/[locale]/(app)/settings/page.tsx`

7 tabs:
1. **Firma Bilgileri** — Company info display
2. **SMS Ayarları** — NetGSM provider config
3. **Telegram & E-Posta** — Notification channel toggles
4. **Telegram Bot** — Bot setup, commands, auto-notifications
5. **Kullanıcılar** — User CRUD with 38 permission checkboxes, invite codes
6. **Web Sitesi** — Display mode + template selection
7. **Rapor Ayarları** — Report date type toggle

---

## Phase 16: Email System (3 pages)

### Task 16.1: Email Hosting
**File:** `src/app/[locale]/(app)/email-hosting/page.tsx`
Create email addresses, quick actions, recent emails.

### Task 16.2: Email Inbox
**File:** `src/app/[locale]/(app)/email-hosting/inbox/page.tsx`
Email inbox view.

### Task 16.3: Email Management (Notifications)
**File:** `src/app/[locale]/(app)/email-management/page.tsx`
Notification settings: appointment reminders, status change notifications, Telegram/SMS/email toggles. Email template management.

---

## Phase 17: Chat System

### Task 17.1: Create Chat Widget
**File:** `src/components/chat/chat-widget.tsx`
Floating chat widget. Real-time messaging via Supabase Realtime. Unread count, online status, notification sound, user search, block user.

---

## Phase 18: Security (2 pages)

### Task 18.1: 2FA Settings
**File:** `src/app/[locale]/(app)/security/page.tsx`
4 forms: Email 2FA, SMS 2FA, TOTP (Google Authenticator), status overview.

### Task 18.2: Password Manager
**File:** `src/app/[locale]/(app)/passwords/page.tsx`
CRUD for stored credentials with categories. Link to applications.

---

## Phase 19: Support & Other Pages

### Task 19.1: Support & Ticket
**File:** `src/app/[locale]/(app)/support/page.tsx`
Ticket creation form, ticket list, reply thread.

### Task 19.2: Support Center
**File:** `src/app/[locale]/(app)/support-center/page.tsx`
Knowledge base / help documentation.

### Task 19.3: Profile
**File:** `src/app/[locale]/(app)/profile/page.tsx`
User info, password change, mobile app QR login, account deletion.

### Task 19.4: Notifications
**File:** `src/app/[locale]/(app)/notifications/page.tsx`
Notification list with read/unread status.

### Task 19.5: Log Control
**File:** `src/app/[locale]/(app)/logs/page.tsx`
Activity log viewer with filters, 2 DataTables.

### Task 19.6: Contracts
**File:** `src/app/[locale]/(app)/contracts/page.tsx`
Digital contract management, version tracking.

### Task 19.7: Invoices
**File:** `src/app/[locale]/(app)/invoices/page.tsx`
Platform invoice management.

### Task 19.8: CDN Files
**File:** `src/app/[locale]/(app)/cdn-files/page.tsx`
File upload/management with Supabase Storage.

---

## Phase 20: Polish & Integration

### Task 20.1: Add Supabase Realtime Subscriptions
- Real-time updates for application status changes
- Real-time chat messages
- Real-time notification count in header

### Task 20.2: Add Toast Notifications
- Success/error toasts for all CRUD operations using sonner

### Task 20.3: Mobile Responsive
- Responsive sidebar (collapsible on mobile)
- Responsive tables (horizontal scroll)
- Responsive forms

### Task 20.4: Add Loading States
- Skeleton loaders for tables and cards
- Loading spinners for form submissions

### Task 20.5: Final i18n Pass
- Ensure all hardcoded strings are in translation files
- Complete both TR and EN translations

### Task 20.6: Final Commit
```bash
git add -A && git commit -m "feat: complete VizeBis clone - all 37 pages implemented"
```

---

## Execution Summary

| Phase | Tasks | Pages | Priority |
|-------|-------|-------|----------|
| 1. Setup | 6 | 0 | Critical |
| 2. Database | 1 | 0 | Critical |
| 3. Auth & Layout | 2 | 2 | Critical |
| 4. Dashboard | 1 | 1 | Critical |
| 5. Applications | 5 | 1 | Critical |
| 6. Companies | 1 | 1 | High |
| 7. Appointments | 1 | 1 | High |
| 8. Calendar | 1 | 1 | High |
| 9. Documents | 1 | 1 | High |
| 10. Tags | 1 | 1 | Medium |
| 11. Reports | 7 | 7 | Medium |
| 12. Forms | 1 | 1 | Medium |
| 13. Finance | 1 | 1 | Medium |
| 14. AI | 4 | 4 | Medium |
| 15. Settings | 1 | 1 | Medium |
| 16. Email | 3 | 3 | Low |
| 17. Chat | 1 | 0 | Low |
| 18. Security | 2 | 2 | Low |
| 19. Other | 8 | 8 | Low |
| 20. Polish | 6 | 0 | Low |
| **Total** | **~54 tasks** | **~37 pages** | |

---

*This plan covers the complete VizeBis platform clone. During implementation, screenshots of the original platform can be requested for visual accuracy on any specific page.*
