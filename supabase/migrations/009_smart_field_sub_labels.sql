-- Add sub_fields column to smart templates for admin-editable sub-field labels
ALTER TABLE portal_smart_field_templates
  ADD COLUMN IF NOT EXISTS sub_fields JSONB DEFAULT '[]'::jsonb;

-- Seed sub_fields for each template
UPDATE portal_smart_field_templates SET sub_fields = '[
  {"key": "selection", "label": "Nationality", "label_tr": "Uyruk"},
  {"key": "custom_nationality", "label": "Other Nationality", "label_tr": "Diger Uyruk"}
]'::jsonb WHERE template_key = 'nationality';

UPDATE portal_smart_field_templates SET sub_fields = '[
  {"key": "departure_date", "label": "Departure Date", "label_tr": "Gidis Tarihi"},
  {"key": "return_date", "label": "Return Date", "label_tr": "Donus Tarihi"}
]'::jsonb WHERE template_key = 'travel_dates';

UPDATE portal_smart_field_templates SET sub_fields = '[
  {"key": "birth_city", "label": "Birth City", "label_tr": "Dogum Sehri"},
  {"key": "birth_country", "label": "Birth Country", "label_tr": "Dogum Ulkesi"},
  {"key": "custom_country", "label": "Other Country", "label_tr": "Diger Ulke"}
]'::jsonb WHERE template_key = 'birth_place';

UPDATE portal_smart_field_templates SET sub_fields = '[
  {"key": "status", "label": "Marital Status", "label_tr": "Medeni Durum"},
  {"key": "other_text", "label": "Other Details", "label_tr": "Diger Detay"}
]'::jsonb WHERE template_key = 'civil_status';

UPDATE portal_smart_field_templates SET sub_fields = '[
  {"key": "address", "label": "Street Address", "label_tr": "Adres"},
  {"key": "postal_code", "label": "Postal Code", "label_tr": "Posta Kodu"},
  {"key": "city", "label": "City", "label_tr": "Sehir"},
  {"key": "country", "label": "Country", "label_tr": "Ulke"},
  {"key": "custom_country", "label": "Other Country", "label_tr": "Diger Ulke"}
]'::jsonb WHERE template_key = 'address_info';

UPDATE portal_smart_field_templates SET sub_fields = '[
  {"key": "is_employed", "label": "Employed", "label_tr": "Calisiyor"},
  {"key": "occupation", "label": "Occupation", "label_tr": "Meslek"},
  {"key": "occupation_other", "label": "Other Occupation", "label_tr": "Diger Meslek"},
  {"key": "title_description", "label": "Title / Description", "label_tr": "Unvan / Aciklama"},
  {"key": "employer_name", "label": "Employer Name", "label_tr": "Isveren Adi"},
  {"key": "employer_address", "label": "Employer Address", "label_tr": "Isveren Adresi"},
  {"key": "employer_postal_code", "label": "Employer Postal Code", "label_tr": "Isveren Posta Kodu"},
  {"key": "employer_city", "label": "Employer City", "label_tr": "Isveren Sehri"},
  {"key": "employer_country", "label": "Employer Country", "label_tr": "Isveren Ulkesi"},
  {"key": "employer_country_custom", "label": "Employer Other Country", "label_tr": "Isveren Diger Ulke"},
  {"key": "employer_phone", "label": "Employer Phone", "label_tr": "Isveren Telefon"},
  {"key": "is_student", "label": "Student", "label_tr": "Ogrenci"},
  {"key": "school_name", "label": "School Name", "label_tr": "Okul Adi"},
  {"key": "school_address", "label": "School Address", "label_tr": "Okul Adresi"},
  {"key": "school_postal_code", "label": "School Postal Code", "label_tr": "Okul Posta Kodu"},
  {"key": "school_city", "label": "School City", "label_tr": "Okul Sehri"},
  {"key": "school_country", "label": "School Country", "label_tr": "Okul Ulkesi"},
  {"key": "school_country_custom", "label": "School Other Country", "label_tr": "Okul Diger Ulke"},
  {"key": "school_phone", "label": "School Phone", "label_tr": "Okul Telefon"},
  {"key": "is_retired", "label": "Retired", "label_tr": "Emekli"}
]'::jsonb WHERE template_key = 'employment_status';

UPDATE portal_smart_field_templates SET sub_fields = '[
  {"key": "country", "label": "Passport Country", "label_tr": "Pasaport Ulkesi"},
  {"key": "custom_country", "label": "Other Country", "label_tr": "Diger Ulke"}
]'::jsonb WHERE template_key = 'passport_country';

UPDATE portal_smart_field_templates SET sub_fields = '[
  {"key": "status", "label": "Fingerprint Status", "label_tr": "Parmak Izi Durumu"},
  {"key": "visa_number", "label": "Previous Visa Number", "label_tr": "Onceki Vize Numarasi"},
  {"key": "visa_date", "label": "Previous Visa Date", "label_tr": "Onceki Vize Tarihi"}
]'::jsonb WHERE template_key = 'fingerprint_visa';
