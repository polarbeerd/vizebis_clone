# Booking PDF Generation Rebuild — Design Document

**Date:** 2026-03-05
**Status:** Approved

## Problem

The current booking PDF system edits original Booking.com PDFs by parsing raw PDF content streams with regex patterns, replacing text character-by-character, and recalculating coordinates. Each hotel requires ~20 manual pattern overrides (font names, x/y coordinates, regex patterns). New hotels break because their PDF internals differ. The system is fragile and unmaintainable.

## Solution

Replace PDF surgery with HTML-based generation: one Jinja2 template replicating the Booking.com confirmation layout, rendered to PDF via WeasyPrint (already running in pdf-service). Per-hotel differences stored as structured config. Dynamic booking data calculated at generation time.

## Architecture

```
Hotel config (DB) + Booking data (application)
    -> Python builds context dict
    -> Jinja2 HTML template
    -> WeasyPrint
    -> PDF bytes
    -> Supabase Storage
```

## Per-Hotel Config (`hotel_config` JSONB in `booking_hotels`)

```json
{
  "address": "Bernstorffsgade 35, 1577 Copenhagen, Denmark",
  "phone": "+45 44 80 00 00",
  "gps": "N 55 40'12.2, E 12 34.334",
  "stars": 0,
  "photo_path": "hotel-assets/wakeup/photo.jpg",
  "map_path": "hotel-assets/wakeup/map.png",
  "layout": "photo_and_map",
  "checkin_time": "15:00 - 00:00",
  "checkout_time": "until 11:00",
  "room_type": "Standard Room",
  "meal_plan": "There is no meal option with this room.",
  "amenities": "Private bathroom * Garden view * Shower * ...",
  "bed_size": "1 large double bed (151-180cm wide)",
  "prepayment": "No prepayment is needed.",
  "cancel_days_before": 3,
  "cancel_time": "11:59 PM",
  "cancel_policy_note": "Changing the dates of your stay is not possible.",
  "payment_methods": "American Express, Visa, Mastercard, JCB",
  "payment_info_text": "Wakeup Copenhagen - Bernstorffsgade handles all payments.",
  "currency_note": "You'll pay Wakeup Copenhagen in DKK according to the exchange rate on the day of payment. The amount displayed in TRY is just an estimate based on today's exchange rate for DKK.",
  "additional_info": "Please note that additional supplements (e.g. extra bed) are not added in this total. If you cancel, applicable taxes may still be charged by the property. If you don't show up at this booking, and you don't cancel beforehand, the property is liable to charge you the full reservation amount. Please remember to read the Important information below, as this may contain important details not mentioned here.",
  "important_info": "Please be aware that when booking more than 10 rooms, different policies and additional supplements may apply...",
  "parking_policy": "Private parking is possible on site (reservation is not possible) and costs DKK 295 per day.",
  "wifi_policy": "WiFi is available in all areas and is free of charge.",
  "deposit_amount_dkk": null,
  "extra_important_notes": "",
  "page2_contact_text": "For any questions related to the property, you can contact Wakeup Copenhagen - Bernstorffsgade directly on: +45 44 80 70 00."
}
```

Layout variants: `no_visuals` | `photo_only` | `photo_and_map` | `photo_map_side_by_side`

## Dynamic Booking Data (calculated per generation)

- Guest name, email (from application)
- Confirmation number (random: XXXX.XXX.XXX)
- PIN code (random: 4 digits)
- Check-in/out: day number, month name (uppercase), weekday name, full formatted date
- Number of nights (calculated)
- Number of guests (from application or group count)
- Prices: EUR x nights x guests -> TL base (total/1.25), TL VAT (total - base), TL total, DKK total
- Cancellation deadline: checkin - cancel_days_before, formatted
- Refund amount: (nights-1)/nights * total_tl

## HTML Template

Single `booking_template.html` with Jinja2 conditionals for layout variants:

- Page 1: Header (Booking.com logo, confirmation, PIN) -> Hotel info + date grid -> Price section -> Payment/currency/additional info -> Room details + cancellation -> Important info + policies
- Page 2: Need help section -> Contact info -> Safety info -> Footer with email

CSS replicates Booking.com styling: Segoe UI font family, blue header bar, date grid boxes, price typography, section borders, two-column room/cancellation layout.

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `pdf-service/edit_booking.py` | DELETE | Remove 660-line PDF surgery code |
| `pdf-service/generate_booking_html.py` | CREATE | New HTML generation module |
| `pdf-service/templates/booking_template.html` | CREATE | Jinja2 HTML/CSS template |
| `pdf-service/templates/booking.com-logo.svg` | CREATE | Booking.com logo for header |
| `pdf-service/main.py` | MODIFY | Update /generate-booking endpoint |
| `pdf-service/requirements.txt` | MODIFY | Add jinja2 |
| `src/lib/generate-documents.ts` | MODIFY | Send hotel_config + booking data instead of template_url + edit_config |
| `src/components/booking-templates/hotel-form.tsx` | MODIFY | Structured form replacing JSON editor |
| DB migration | CREATE | Add hotel_config column, migrate existing hotels |
| `supabase/migrations/015_booking_hotel_config.sql` | CREATE | Schema changes |

## Hotel Image Extraction

Extract photos and maps from existing 4 PDFs using pikepdf, upload to `hotel-assets/` bucket in Supabase storage. Future hotels: admin uploads images through hotel form.

## Existing Hotels to Migrate

1. AC Hotel by Marriott Bella Sky Copenhagen — layout: `photo_only`
2. Wakeup Copenhagen - Bernstorffsgade — layout: `photo_and_map`
3. Cabinn Apartments — layout: `photo_map_side_by_side`
4. Radisson Blu Scandinavia Hotel — layout: `photo_only`

## What Stays The Same

- Generation trigger flow (admin clicks Generate -> API -> pdf-service -> storage)
- `generated_documents` table tracking
- FX rate fetching for TL/DKK
- Price calculation logic (EUR x nights x guests, 25% VAT)
- WeasyPrint (already in pdf-service)
