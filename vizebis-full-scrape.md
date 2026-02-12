# VizeBis v2 — Complete Platform Scrape
## Platform: https://unusal.vizebis.com/
## Tenant: Unusual Consulting (User: Sarpkan Şenol)
## Date: 2026-02-12

---

## 1. SITEMAP (37 Pages Scraped)

| # | Page | URL | Forms | Tables | Inputs | Buttons |
|---|------|-----|-------|--------|--------|---------|
| 1 | Dashboard | /dashboard.php | 0 | 2 | 0 | 5 |
| 2 | Firmalar (Companies) | /firmalar.php | 1 | 1 | 0 | 11 |
| 3 | Başvuru Listesi (Applications) | /basvurular.php | 2 | 2 | 19 | 31 |
| 4 | Başvuru Ekle (Add Application) | /basvurular.php?action=add | 2 | 2 | 19 | 31 |
| 5 | Etiket Yönetimi (Tag Management) | /Etiket-Listesi | 2 | 0 | 0 | 6 |
| 6 | Evrak Yönetimi (Document Mgmt) | /Evrak-Yonetimi | 2 | 1 | 0 | 13 |
| 7 | Randevular (Appointments) | /RandevuListesi | 1 | 1 | 15 | 9 |
| 8 | Form Yönetimi (Form Mgmt) | /Form-Yonetimi | 0 | 1 | 0 | 5 |
| 9 | Şifre Yönetimi (Password Mgmt) | /Sifre-Yonetimi | 2 | 1 | 0 | 15 |
| 10 | Finans Merkezi (Finance Center) | /Finans-Merkezi | 1 | 0 | 0 | 5 |
| 11 | Borç Bireysel (Individual Debt) | /Borc-Durumu-Bireysel | 0 | 1 | 0 | 5 |
| 12 | Borç Kurumsal (Corporate Debt) | /Borc-Durumu-Kurumsal | 0 | 1 | 0 | 4 |
| 13 | Ülke Raporları (Country Reports) | /Ulke-Raporlari | 1 | 1 | 0 | 5 |
| 14 | Konsoloslukta (At Consulate) | /Konsoloslukta | 0 | 1 | 0 | 4 |
| 15 | Konsolosluk Metrikleri | /Konsolosluk-Metrikleri | 0 | 0 | 0 | 4 |
| 16 | Ülke Metrikleri | /Ulke-Metrikleri | 1 | 0 | 0 | 5 |
| 17 | Referans Raporu | /Referans-Raporu | 3 | 0 | 0 | 11 |
| 18 | Takvim (Calendar) | /takvim.php | 0 | 1 | 0 | 6 |
| 19 | AI Veri Analizi (AI Data Analysis) | /AI-Veri-Analizi | 0 | 0 | 1 | 12 |
| 20 | AI Asistan (Letter Generator) | /AI-Asistan | 1 | 0 | 1 | 11 |
| 21 | AI Prompt Yönetimi | /AI-Prompt-Yonetimi | 1 | 1 | 0 | 10 |
| 22 | AI Ayarları (AI Settings) | /AI-Ayarlar | 1 | 0 | 0 | 8 |
| 23 | Email Hosting | /Email-Hosting | 0 | 0 | 0 | 7 |
| 24 | Email - My Emails | /Email-Hosting/My-Emails | 0 | 0 | 0 | 7 |
| 25 | Email - Inbox | /Email-Hosting/Inbox | 0 | 0 | 0 | 6 |
| 26 | Firma Ayarları (Company Settings) | /ayarlar.php | 6 | 1 | 1 | 30 |
| 27 | Email Yönetimi (Notifications) | /Email-Yonetimi | 2 | 1 | 0 | 28 |
| 28 | Destek & Ticket | /Destek-Ticket | 2 | 0 | 0 | 10 |
| 29 | 2FA Güvenlik | /2FA-Ayarlar | 4 | 0 | 0 | 9 |
| 30 | Sözleşme İmza | /sozlesme_imza.php | 0 | 1 | 0 | 4 |
| 31 | Log Kontrol | /LogKontrol.php | 1 | 2 | 0 | 6 |
| 32 | Faturalar | /firma_faturalar.php | 0 | 0 | 0 | 6 |
| 33 | CDN Dosyalarım | /cdn_dosyalar.php | 0 | 0 | 0 | 5 |
| 34 | Mobil Ayarlar | /Mobil-Ayarlar | 0 | 0 | 0 | 0 |
| 35 | Destek Merkezi | /Destek-Merkezi | 1 | 1 | 0 | 0 |
| 36 | Profil | /profil.php | - | - | - | - |
| 37 | Bildirimler | /bildirimlerim.php | 0 | 0 | 0 | 5 |

---

## 2. TECH STACK

- **Backend**: PHP (all .php pages or PHP-routed clean URLs)
- **CSS Framework**: Bootstrap 5.3.0 (CDN: cdn.jsdelivr.net)
- **Icons**: Bootstrap Icons 1.11.0
- **JS**: Bootstrap Bundle 5.3.0
- **DataTables**: Used extensively (Turkish locale from cdn.datatables.net)
- **CDN/Protection**: Cloudflare
- **Chat Widget**: Custom — `/inc/plugins/sohbet/` (sohbet_widget.css + sohbet_widget.js, versioned v=1.0.1)

---

## 3. ALL API ENDPOINTS DISCOVERED

### Chat System
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /inc/plugins/sohbet/api_okunmamis_sayi.php | Unread message count |
| POST | /inc/plugins/sohbet/api_online_durum.php | Online status update |
| GET | /inc/plugins/sohbet/api_ayarlar.php | Chat settings |
| - | /inc/plugins/sohbet/notification.mp3 | Notification sound |

### Application/Data APIs
| Method | Endpoint | Purpose |
|--------|----------|---------|
| AJAX | basvurular.php | Application list data (DataTable source) |
| AJAX | firmalar.php | Company list data (DataTable source) |
| AJAX | inc/basvuru_hizli_guncelleme.php | Quick application update |
| AJAX | inc/evrak_operations.php | Document operations |
| FETCH | inc/randevu_islem.php | Appointment operations |
| FETCH | inc/bildirim_okundu.php | Mark notification as read |
| FETCH | inc/qr_login_token.php | QR code login token |
| FETCH | profil.php | Profile data |
| AJAX | Form-Yonetimi | Form management data |

### Plugin APIs
| Endpoint | Purpose |
|----------|---------|
| /inc/plugins/ai_asistan/api_db_chat.php | AI assistant chat database |
| /inc/plugins/email_hosting/api/delete_message.php | Delete email message |
| /inc/plugins/email_yonetimi/api_sablon_onizle.php | Email template preview |
| /inc/plugins/email_yonetimi/sablon_duzenle.php | Email template edit |
| /inc/plugins/passwordmanager/api.php | Password manager API |
| /inc/mobil/auth.php | Mobile app authentication |

### DataTable i18n Sources
- cdn.datatables.net/plug-ins/1.10.25/i18n/Turkish.json
- cdn.datatables.net/plug-ins/1.11.5/i18n/tr.json
- cdn.datatables.net/plug-ins/1.13.4/i18n/tr.json
- cdn.datatables.net/plug-ins/1.13.7/i18n/tr.json

---

## 4. CORE DATA MODEL: APPLICATION (Başvuru)

### 4a. Application Form Fields (40 fields total)

#### Kişisel Bilgiler (Personal Info)
| Field Name | Type | Notes |
|------------|------|-------|
| ad_soyad | text | Full name |
| tc_kimlik_no | text | Turkish ID number |
| dogum_tarihi | date | Date of birth |
| telefon_no | text | Phone number |
| email | email | Email address |
| alt_firma_id | select | Sub-company (dropdown) |

#### Pasaport ve Vize Bilgileri (Passport & Visa Info)
| Field Name | Type | Options |
|------------|------|---------|
| pasaport_no | text | Passport number |
| pasaport_bitis | date | Passport expiry |
| vize_baslangic | date | Visa start date |
| vize_bitis | date | Visa end date |
| vize_durumu | select | Beklemede, Hazırlanıyor, Konsoloslukta, Vize Çıktı, Ret Oldu, Pasaport Teslim |
| vize_turu | select | Tür Seçin, Kültür, Ticari, Turistik, Ziyaret, Diğer |

#### Randevu ve Seyahat Bilgileri (Appointment & Travel)
| Field Name | Type | Notes |
|------------|------|-------|
| ulke | text | Country |
| randevu_tarihi | date | Appointment date |
| randevu_saat | time | Appointment time |
| cikis_tarihi | date | Passport pickup date |
| seyahat_tarihi | date | Target travel date |

#### Ücret Bilgileri (Fee Info)
| Field Name | Type | Options |
|------------|------|---------|
| konsolosluk_ucreti | number | Consulate fee |
| servis_ucreti | number | Service fee |
| doviz | select | DOLAR, EURO, TL |
| fatura_durumu | select | Fatura Yok, Fatura Var, Fatura Kesildi |
| fatura_tarihi | date | Invoice date |
| fatura_numarasi | text | Invoice number |
| odeme_durumu | select | Ödeme Yapılmadı, Ödeme Yapıldı |
| odeme_tarihi | date | Payment date |
| odeme_yontemi | select | Yöntem Seçin, Nakit, Kredi Kartı, Havale/EFT, Sanal Pos |
| odeme_not | text | Payment note |

#### Konsolosluk Bilgileri (Consulate Info)
| Field Name | Type | Notes |
|------------|------|-------|
| konsolosluk_basvuruno | text | Consulate application number |
| konsolosluk_ofisi | text | Consulate office |

#### Dosyalar (Files)
| Field Name | Type | Notes |
|------------|------|-------|
| pasaport_foto | file | Passport photo upload |
| vize_foto | file | Visa photo upload |

#### Diğer (Other)
| Field Name | Type | Notes |
|------------|------|-------|
| referans_id | select | Reference person (dropdown) |
| vize_retmi | checkbox | Visa rejected? |
| aciklama | textarea | Description/notes |
| atanan_kullanici_id | select | Assigned staff (e.g. "Sarpkan") |
| atanan_not | textarea | Assignment note |

### 4b. Application Status Workflow
```
Beklemede → Hazırlanıyor → Konsoloslukta → Vize Çıktı → Pasaport Teslim
                                          → Ret Oldu
```

### 4c. Application List Columns
ID, Ad Soyad, Pasaport, Firma, Ülke, Randevu, Çıkış Tarihi, İletişim, Ücret, FT (Fatura), Ödeme, Durum, Açıklama, Aksiyonlar

### 4d. Application List Filters
- Search text
- Status dropdown (Tüm Durumlar + all statuses)
- Country dropdown (100+ country options — see Section 8)
- Items per page (10, 25, 50, 100, All)
- Column visibility selector
- Date quick-filters: Bugün, Bu Ay, Geçen Ay, Önümüzdeki Ay
- Date range: start date – end date
- Per-column text filters
- FT filter: Tümü, Fatura Yok, Fatura İstiyor, Fatura Kesildi
- Ödeme filter: Tümü, Yapıldı, Yapılmadı
- Durum filter (again in column): all statuses

### 4e. Application Row Color Coding
Based on Vize Durumu (visa status) — row colors indicate different statuses.
Also appointment date warnings for upcoming/past dates.

---

## 5. FIRMALAR (Companies)

### Form Fields (14 fields)
| Field | Type | Notes |
|-------|------|-------|
| musteri_tipi | radio | Customer type (2 options) |
| firma_adi | text | Company name |
| firma_kodu | text | Company code |
| firma_telefon | tel | Phone |
| firma_mail | email | Email |
| firma_vergi_no | text | Tax number |
| firma_vergi_dairesi | text | Tax office |
| password | text | Password |
| firma_il | text | Province |
| firma_ilce | text | District |
| firma_adres | textarea | Address |

### Table Columns
ID, Firma Kodu, Firma Adı, Telefon, Borç (TL), Borç (USD), Borç (EUR), Başvuru Sayısı, İşlemler

### Features
- Active/Passive company toggle ("Pasif Firmalar" button)
- Add new company modal
- Multi-currency debt tracking (TL, USD, EUR)

---

## 6. RANDEVULAR (Appointments)

### Form Fields (15 fields)
| Field | Type | Options |
|-------|------|---------|
| adsoyad | text | Name |
| pasaport_no | text | Passport |
| tc_kimlik_no | text | Turkish ID |
| dogum_tarihi | date | DOB |
| email | email | Email |
| pasaport_bitis | date | Passport expiry |
| firma | text | Company |
| ulke | text | Country |
| vize_turu | select | Kültür, Ticari, Turistik, Ziyaret, Diğer |
| seyahat_tarihi | date | Travel date |
| randevu_tarihi | date | Appointment date |
| odeme_durumu | select | Beklemede, Ödendi, İptal |
| aciklama | textarea | Notes |
| pasaport_foto | file | Passport upload |

### Table Columns
ID, Ad ve Soyad, Pasaport No, Kimlik, Doğum T., E-posta, Pasaport Bitiş Tarihi, Firma Adı, Ülke, Vize Türü, Seyahat Tarihi, Randevu Tarihi, Ödeme, Açıklama, Pasaport, İşlemler

---

## 7. EVRAK YÖNETİMİ (Document Management)

### Filter Form
- kategori (select: Tümü)
- durum (select: Tümü, Aktif, Pasif, Taslak)
- tip (select: Tümü, Vize, Pasaport, Genel)
- arama (text search)

### Document Form (Add/Edit)
| Field | Type | Options |
|-------|------|---------|
| evrak_adi | text | Document name |
| evrak_aciklama | textarea | Description |
| html_icerik | textarea | HTML content (template!) |
| evrak_tipi | select | Genel, Vize, Pasaport, Diğer |
| kategori | text | Category |
| durum | select | Aktif, Pasif, Taslak |
| oncelik | select | Normal, Düşük, Yüksek, Acil |
| access_level | select | Firma Üyeleri, Herkes, Sadece Admin |
| etiketler | text | Tags |

### Table Columns
#, Evrak Adı, Kategori, Tip, Durum, Öncelik, Görüntülenme, Son Güncelleme, İşlemler

### Actions: Export, Print, Refresh, Column Settings, Add Document

---

## 8. COUNTRY LIST (100+ Options from Application Filter)

ABD, ABD ANKARA, ABD PTT, ABD YENILEME, ALMANYA, ALMANYA AILE, ALMANYA ALTUNIZADE, ALMANYA ANKARA, ALMANYA ANKARA KATILIMCI, ALMANYA FUAR KATILIMCI, ALMANYA GURUP, ALMANYA IZMIR, ALMANYA KATILIMCI, ALMANYA VIP, AMERIKA, AMERIKA ALIM, AMERIKA PTT, AMERIKA RANDEVU, Amerika-Almanya, AVUSTURYA, BANGLADESH, BELCIKA, Belirtilmemiş, BULGARISTAN, BULGARISTAN ANKARA, BULGARISTAN B, BULGARISTAN BURSA, CEK CUMHURRIYETI, CEZAYIR, CIN, CIN 5, CIN 5 YILLIK, CIN 6 AY 2, CIN 6 AY COK GIRIS, CIN 6 AY COK GIRIS TBD, CIN 6 CIFT GIRIS, CIN 6-2, CIN 6AY TBD, CIN CALISMA VIZESI, CIN CAN, CIN CAN EXP, CIN CAN EXP LIG, CIN CANTON, CIN CANTON DAVETLI, CIN CANTON TBD, CIN DBL, CIN DBL EXP, CIN EVRAK ONAY, CIN EXP, CIN GRUP, CIN GRUP VIZE, CIN GURUP, CIN GURUP EXP, CIN TBD, CIN X1 VIZESI, CIN YILLIK, CIN YILLIK EXP, CIN YILLIK TBD, DANIMARKA, Deneme, DUBAI, DUBAI HIZLI, DUBAI UZATMA, Fes, FINLADIYA, FRANSA, FRANSA B, HINDISTAN, HOLLANDA, HOLLANDA ANKARA, HOLLANDA GEMICI, HOLLANDA IZMIR, INGILLTERE, INGILTERE, INGILTERE 10, INGILTERE 10 YILLIK, INGILTERE 2, INGILTERE 2 EXP, INGILTERE 5, INGILTERE 5 YILLIK, INGILTERE E, INGILTERE EXP, INGILTERE EXP RND, INGILTERE OGR EXP RND, INGILTERE RANDEVUSUZ, INGILTERE VIP, ISPANYA, ISVEC, ISVICRE, ISVICRE ANKARA, ITALYA, ITALYA ALTUNIZADE, ITALYA ANKARA, ITALYA ANTALYA, ITALYA EGITIM, ITALYA IZMIR, ITALYA TRABZON, KATAR EVRAK ONAY, KUVEYT, MACARISTAN, MACARISTAN VIP, PAKISTAN, PORTEKIZ, ROMANYA, RUSYA, RUSYA E, RUSYA E VIZE, RUSYA YILLIK, SEYAHAT SAGLIK, SEYAHAT SIGORTASI, SIGORTA, SLOVENYA, SUDI, SUDI E VIZE, SUUDI ARABISTAN, TUM DUNYA SIGORTA, TÜRKIYE, YUNAISTAN, YUNAN, YUNANISTAN

**Note**: These aren't just countries — they're **country + visa type + location combinations**. E.g. "ALMANYA ALTUNIZADE" = Germany visa processed at Altunizade VFS, "CIN CANTON" = China Canton Fair visa, "INGILTERE 10 YILLIK" = UK 10-year visa.

---

## 9. AI FEATURES

### 9a. AI Veri Analizi (Data Analysis Chat)
- Chat interface for querying application data in natural language
- Pre-built example queries:
  - "Toplam kaç başvurum var?" (How many total applications?)
  - "Geçen ay ne kadar harcama yaptım?" (How much did I spend last month?)
  - "Bekleyen Polonya başvurularını listele" (List pending Poland applications)
  - "Kasadaki güncel bakiye nedir?" (What's the current cash balance?)
  - "Borcu en yüksek 5 firma hangisi?" (Top 5 companies with most debt?)
- Uses: /inc/plugins/ai_asistan/api_db_chat.php

### 9b. AI Asistan - Mektup Oluştur (Letter Generator)
Form fields:
| Field | Type | Options |
|-------|------|---------|
| adSoyad | text | Applicant name |
| ulkeSelect | select | Almanya, Fransa, Hollanda, İspanya, İtalya |
| sehir | text | City |
| ilce | text | District |
| gidisTarihi | date | Departure date |
| donusTarihi | date | Return date |
| isYeri | text | Workplace |
| pozisyon | text | Position |
| pasaportNo | text | Passport number |
| ziyaretSebebi | select | Turistik, Kültürel, Ticari, Aile, Arkadaş |
| ozelNotlar | textarea | Special notes |
| mektupDili | select | Türkçe, İngilizce, Almanca, İtalyanca |

### 9c. AI Prompt Yönetimi
- Custom prompt templates per company
- Template variables available
- Add/edit/delete prompts
- Sections: Firma Özel Promptları, Prompt Template Değişkenleri

### 9d. AI Ayarlar (API Settings)
| Field | Type | Options |
|-------|------|---------|
| api_key | password | OpenAI API key |
| model | select | GPT-3.5 Turbo ($0.002/1K), GPT-4 ($0.03/1K), GPT-4 Turbo ($0.01/1K) |
| max_tokens | number | Token limit |
| temperature | number | Creativity setting |
| kullanim_limiti | number | Usage limit |
| otomatik_olustur | checkbox | Auto-generate |

---

## 10. NOTIFICATION & EMAIL SYSTEM

### Email Yönetimi (Notification Settings)
| Field | Type | Purpose |
|-------|------|---------|
| randevu_aktif | checkbox | Appointment reminders enabled |
| randevu_gun | number | Days before to remind |
| randevu_saat | time | Time to send reminder |
| randevu_telegram | checkbox | Send via Telegram |
| randevu_sms | checkbox | Send via SMS |
| randevu_otomatik | checkbox | Auto-send |
| durum_aktif | checkbox | Status change notifications |
| durum_telegram | checkbox | Status via Telegram |
| durum_sms | checkbox | Status via SMS |

### SMS System (from Settings)
| Field | Type | Purpose |
|-------|------|---------|
| sms_sistemi | select | SMS provider |
| netgsm_usercode | text | NetGSM user code |
| netgsm_password | password | NetGSM password |
| netgsm_msgheader | select | NetGSM message header |

### Notification Settings (from Settings)
| Field | Purpose |
|-------|---------|
| telegram_acik | Telegram enabled |
| yenibasvuru_sms | SMS on new application |
| email_acik | Email enabled |

### Email Hosting
- Create custom email addresses
- Inbox view
- Sections: Hızlı İşlemler, Son Oluşturulan Emailler

---

## 11. COMPANY SETTINGS (ayarlar.php)

### 6 Forms Total:

**Form 0 - SMS Settings**: Provider config (NetGSM integration)

**Form 1 - Bildirim (Notification) Settings**: Telegram, SMS, Email toggles

**Form 2 - General**: (minimal)

**Form 3 - User Management**: Full user CRUD
- Fields: username, role, adsoyad, telefonno, email, password
- Roles: `firma_admin`, `firma_calisan`
- 38 permission checkboxes (granular role-based access)

**Form 4 - Website Settings**:
- website_mode: radio (2 options — likely login-only vs full site)
- website_template: radio (5 template options)
- Templates: Sadece Login, Kurumsal Lacivert, Lüks Gold, Modern Mavi, Minimal Petrol, Tech Indigo

**Form 5 - Report Settings**:
- rapor_tarih_tipi: radio (2 options — by appointment date vs creation date)

### Settings Sections
1. Firma Bilgileri (Company Info)
2. Firma Logo
3. Sözleşmeler (Contracts)
4. Telegram Bot Ayarları — Bot Bilgileri, Kullanım Adımları, Kullanılabilir Komutlar, Otomatik Bildirimler, Bot Durumu
5. Davet Kodu ve Kullanıcı Limiti
6. Kullanıcı Listesi / Kullanıcı Ekle-Düzenle
7. Web Sitesi Ayarları (5 templates)
8. Rapor Ayarları

---

## 12. SECURITY FEATURES

### 2FA Güvenlik Ayarları
- 2FA Durumu overview
- Email 2FA
- SMS 2FA
- TOTP 2FA (Google Authenticator)
- 4 separate forms for each method

### Password Manager (/Sifre-Yonetimi)
- Stores credentials with categories
- Fields: category_id, title, basvuru_id (link to application)
- Category management (add/edit categories)
- API: /inc/plugins/passwordmanager/api.php

### QR Code Login
- Mobile login via QR code
- API: /inc/qr_login_token.php

### Log Control (/LogKontrol.php)
- Activity log viewer with filters
- 2 tables for log data

---

## 13. REPORTS

### Available Report Pages
| Report | Table Columns |
|--------|--------------|
| Borç Bireysel | #, Ad Soyad, Telefon, Pasaport, Firma, Ülke, Randevu Tarihi, Çıkış Tarihi, Konsolosluk Ücreti, Servis Ücreti, Fatura, Ödeme, Vize Durumu, Açıklama, Pasaport, Vize |
| Borç Kurumsal | #, Firma Adı, Firma Kodu, Email, Telefon, Borç (TL), Borç (USD), Borç (EUR), İşlemler |
| Ülke Raporları | #, Ad Soyad, Telefon, Pasaport No, Firma, Ülke, Randevu Tarihi, Ödeme |
| Konsoloslukta | #, Ad Soyad, Telefon, Pasaport No, Konsols. No, Firma, Ülke |
| Konsolosluk Metrikleri | Charts/metrics (no table) |
| Ülke Metrikleri | Charts/metrics with date filter |
| Referans Raporu | Referral tracking with commission |

### Referans (Referral) System
- Add referral sources with: name, phone, email, commission rate (%), description
- Track referral performance
- Toggle active/inactive

---

## 14. FORM MANAGEMENT (/Form-Yonetimi)

### Table Columns
Form Adı, Durum, Erişim Seviyesi, Gönderim Sayısı, Bekleyen, Tamamlanan, Oluşturan, Oluşturulma Tarihi, Form Linki, İşlemler

- Create customer-facing forms
- Track submissions (pending vs completed)
- Access level control
- Share via link

---

## 15. ETIKET YÖNETİMİ (Tag/Label Management)

### Filter Form
| Field | Type | Options |
|-------|------|---------|
| vize_durumu | select | TÜM KAYITLAR (Varsayılan), Vize Çıktı, Pasaport Teslim, İşlemde |
| search | text | Search |
| start_date | date | Start date |
| end_date | date | End date |

---

## 16. OTHER FEATURES

### Takvim (Calendar)
- Full calendar view (Mon-Sun)
- Appointment visualization

### Destek & Ticket
- Support ticket system (2 forms)

### Destek Merkezi (Support Center)
- Knowledge base / help documentation

### CDN Dosyalarım
- File hosting/management

### Faturalar (Invoices)
- Company invoice management

### Sözleşme İmza (Contract Signing)
- Digital contract management
- Version tracking (current: v1.0.0)
- Sections: Taraflar, Kullanım Şartları, Yetki ve Sorumluluk, Yasal Uyarı

### Profil
- User profile management
- Sections: User Info, Güvenlik Ayarları (password change), Mobil Uygulama Girişi, Tehlikeli Bölge (account deletion)

### Mobil Uygulama
- Mobile app settings (page exists but empty)

---

## 17. CHAT SYSTEM (Built-in Messaging)

### Features
- Real-time messaging between platform users
- Unread count polling (every ~5 seconds)
- Online status tracking
- Notification sound
- Telegram notification integration
- Auto-open setting
- User search
- Block user functionality

### API Endpoints
- Unread count: GET /inc/plugins/sohbet/api_okunmamis_sayi.php
- Online status: POST /inc/plugins/sohbet/api_online_durum.php
- Settings: GET /inc/plugins/sohbet/api_ayarlar.php

---

## 18. DASHBOARD METRICS

### Summary Cards
- Toplam Başvuru (Total Applications)
- Bekleyen Başvuru (Pending)
- Tamamlanan (Completed)
- Toplam Borç (Total Debt) — displayed in TL, USD, EUR

### Tables
- Son Başvurular: Ad Soyad, Ülke, Durum, Tarih
- Son Randevular: Ad Soyad, Ülke, Randevu, Tarih

### Calendars
- Bu Haftanın Randevularım (This Week's Appointments)
- Geçen Haftanın Randevuları (Last Week's Appointments)

---

## 19. KEY JS FUNCTIONS DISCOVERED

```javascript
setDateRange('bugun' | 'buAy' | 'gecenAy' | 'onumuzdekiAy')  // Date quick-filter
exportData()           // Export table data
printReport()          // Print report
refreshTable()         // Refresh DataTable
showColumnSettings()   // Column visibility
showAddEvrakModal()    // Add document modal
saveEvrak()           // Save document
yeniRandevu()         // New appointment modal
kaydetRandevu()       // Save appointment
$('#firmaForm').submit()  // Save company
```

---

## 20. DYNAMIC MODALS (loaded via AJAX, missed by fetch scrape)

### All Modals on Application Page
| Modal ID | Purpose |
|----------|---------|
| addEditBasvuruModal | Add/Edit application form (captured in Section 4) |
| basvuruDetailsModal | Application detail view — **dynamically loaded** (empty container `#basvuruDetailsContent` filled via AJAX with record ID) |
| smsModal | Send SMS to applicant |
| deletedBasvurularModal | View deleted applications |
| photoPreviewModal | Preview passport/visa photos |
| tableSettingsModal | Column visibility settings |
| renklendirmeBilgiModal | Color coding explanation |
| sidebarBildirimModal | Sidebar notifications |

### SMS Modal Fields
- action (hidden)
- id / smsBasvuruId (hidden — application ID)
- Alıcı Bilgileri (recipient info — display only)
- sms_message (textarea — message body)
- Hazır Mesajlar (ready-made message templates)

### Row Color Coding System
| Color | Meaning |
|-------|---------|
| Green | Pasaport Teslim (Passport Delivered) |
| Blue | Vize Çıktı / Onaylandı (Visa Approved) |
| Yellow | Konsoloslukta (At Consulate) |
| Grey | Beklemede / Hazırlanıyor (Pending/Preparing) |
| Red | Reddedildi / Ret Oldu (Rejected) |
| Red Background | Appointment within 10 days (with ⚠ icon, auto-sorted priority) |
| Grey Background | Past appointments |

### JS Functions on Application Page
```
getStatusClass()          — returns CSS class for status
getDeletedBasvurular()    — loads deleted records
initializeTooltips()      — Bootstrap tooltip init
initTable()               — DataTable initialization
applyFiltersAndPagination() — filter + paginate
initColumnToggle()        — column visibility
applyColumnVisibility()   — apply column prefs
updatePaginationInfo()    — update page info text
renderPagination()        — render page buttons
sortTable()               — column sorting
filterByDateRange()       — date range filter
setDateRange()            — quick date presets
exportToCSV()             — CSV export
```

---

## 21. SETTINGS TABS (from visual verification)

The Firma Ayarları page uses **7 tabs** (not captured by fetch scrape since tabs are JS-rendered):

| Tab | Content |
|-----|---------|
| Firma Bilgileri | Company name, subdomain, tracking address, membership expiry, license number, contracts |
| SMS Ayarları | SMS provider config (NetGSM integration) |
| Telegram & E-Posta | Notification channel settings |
| Telegram Bot | Bot setup (@VizeBisV2Bot), commands, auto-notifications |
| Kullanıcılar | Invite codes, user limits, user CRUD with 38 permission checkboxes |
| Web Sitesi | Subdomain display mode (Login-only vs Website+Login), template selection |
| Rapor Ayarları | Report date type (by appointment vs by creation) |

### Telegram Bot Commands
| Command | Purpose |
|---------|---------|
| /start | Bot menu |
| /istatistikler | Statistics |
| /raporlar | Payment reports |
| /takvim | Upcoming appointments |
| /randevular | Recent appointments |
| /basvurular | Recent applications |
| /firmalar | Company info |
| /chatid | Show Chat ID |

### Telegram Auto-Notifications (triggers)
- Yeni firma eklendiğinde (New company added)
- Yeni başvuru eklendiğinde (New application added)
- Yeni randevu eklendiğinde (New appointment added)
- Form doldurulduğunda (Form submitted)

### Website Display Modes
1. **Sadece Login** — Direct login screen at subdomain
2. **Web Sitesi + Login** — Corporate website with login modal

Website content (slider, blog, contact) managed from Mobil Yönetim panel.

### User Management
- Invite code system (auto-regenerates per use)
- Roles: `firma_admin`, `firma_calisan`
- 38 granular permission checkboxes per user
- User table: ID, Kullanıcı Adı, Ad Soyad, Telefon, E-posta, Rol, Roller, Telegram, Oluşturulma, İşlem

---

## 22. SCRAPE ACCURACY NOTES

### What was captured (✅):
- All 37 page routes and their server-rendered HTML
- Every form field, select dropdown, table column
- All API endpoints discovered in inline scripts
- Navigation structure and sidebar menu
- Button labels and onclick handlers

### What was partially captured (⚠️):
- Settings tabs content (verified 4/7 tabs visually)
- Modal structures (identified all 8 modals, captured forms for 2)

### What was NOT captured (❌):
- `basvuruDetailsModal` content (requires real record ID, loaded via AJAX)
- Any per-record edit forms that differ from add forms
- CSS class names and visual styling details
- Exact color hex codes and design tokens
- Any pages that require specific permissions beyond firma_admin
- Mobile app screens (referenced but separate app)

---

## 23. ARCHITECTURE SUMMARY (for replication)

### Multi-Tenant SaaS Model
- Each company gets subdomain: `{company}.vizebis.com`
- Company-level settings, users, data isolation
- License system with expiry dates
- Invite code for adding team members

### Core Entities & Relationships
```
Company (Firma) 1:N Applications (Başvuru)
Company (Firma) 1:N Users (Kullanıcı)
Company (Firma) 1:N Appointments (Randevu)
Application 1:1 Appointment
Application N:1 Reference (Referans)
Application N:1 Assigned User
Application 1:N Documents (Evrak)
Application 1:N Tags (Etiket)
```

### Key Integrations
- **SMS**: NetGSM
- **Notifications**: Telegram Bot, Email, SMS
- **AI**: OpenAI (GPT-3.5/4/4-Turbo) for letter generation + data analysis
- **Calendar**: Built-in appointment calendar
- **Payments**: Multi-currency (TL/USD/EUR), Nakit/Kredi Kartı/Havale-EFT/Sanal Pos
- **File Storage**: CDN file hosting, passport/visa photo uploads
- **Mobile**: QR code login, mobile app (separate)
- **Email Hosting**: Built-in email service

---

*Raw JSON data (237KB) downloaded separately as vizebis-full-scrape.json*
