# Booking PDF HTML Rebuild — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace fragile PDF surgery with HTML-based booking confirmation generation using Jinja2 + WeasyPrint for pixel-perfect Booking.com replicas.

**Architecture:** Per-hotel static config stored in `hotel_config` JSONB column. Python builds a context dict from hotel config + dynamic booking data, renders a Jinja2 HTML template replicating the Booking.com layout, then WeasyPrint converts to PDF. The existing `/html-to-pdf` WeasyPrint endpoint is already proven; we reuse that approach.

**Tech Stack:** Python (Jinja2, WeasyPrint), Next.js (React Hook Form), Supabase (PostgreSQL, Storage), Tailwind CSS.

---

### Task 1: Extract hotel images from existing PDFs

**Files:**
- Create: `pdf-service/extract_images.py` (one-time utility script)

**Step 1: Write extraction script**

Use pikepdf to extract embedded images from each hotel's PDF template. For each hotel, save the hotel photo and map image (if present) as separate files.

```python
"""One-time utility: extract hotel photo + map images from existing booking PDF templates."""
import pikepdf
import sys
import os
from pathlib import Path

def extract_images(pdf_path: str, output_dir: str):
    """Extract all images from a PDF, saving as PNG files."""
    os.makedirs(output_dir, exist_ok=True)
    pdf = pikepdf.open(pdf_path)

    img_count = 0
    for page_num, page in enumerate(pdf.pages):
        if "/Resources" not in page or "/XObject" not in page["/Resources"]:
            continue
        xobjects = page["/Resources"]["/XObject"]
        for name, obj in xobjects.items():
            obj = obj.resolve() if hasattr(obj, 'resolve') else obj
            if obj.get("/Subtype") != "/Image":
                continue
            img_count += 1
            width = int(obj.get("/Width", 0))
            height = int(obj.get("/Height", 0))

            # Extract raw image data
            raw = obj.read_raw_bytes()

            out_path = Path(output_dir) / f"page{page_num}_img{img_count}_{width}x{height}.bin"
            out_path.write_bytes(raw)
            print(f"  Extracted: {out_path.name} ({width}x{height})")

    print(f"Total images extracted: {img_count}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python extract_images.py <pdf_path> <output_dir>")
        sys.exit(1)
    extract_images(sys.argv[1], sys.argv[2])
```

**Step 2: Run extraction on all 4 hotel PDFs**

Download templates from Supabase storage, extract images, identify which is the hotel photo and which is the map for each hotel. Save the usable images.

```bash
# Download PDFs (already done at /tmp/*_new.pdf)
# Extract images from each
cd pdf-service
python extract_images.py /tmp/achotel_new.pdf /tmp/achotel_images/
python extract_images.py /tmp/wakeup_new.pdf /tmp/wakeup_images/
python extract_images.py /tmp/cabinn_new.pdf /tmp/cabinn_images/
python extract_images.py /tmp/radisson_new.pdf /tmp/radisson_images/
```

If pikepdf extraction is difficult (compressed streams), fall back to using `pdftoppm` to render pages and manually crop hotel photo + map regions from the PNG output at `/tmp/*_new-1.png`.

**Step 3: Upload images to Supabase storage**

Create a `hotel-assets` bucket. Upload each hotel's photo (and map if applicable) with paths like:
- `hotel-assets/{hotel_id}/photo.jpg`
- `hotel-assets/{hotel_id}/map.png`

**Step 4: Commit**

```bash
git add pdf-service/extract_images.py
git commit -m "feat: add one-time image extraction utility for hotel PDFs"
```

---

### Task 2: Add `hotel_config` column and migrate existing hotels

**Files:**
- Create: `supabase/migrations/015_booking_hotel_config.sql`

**Step 1: Write migration**

```sql
-- Add hotel_config JSONB column to booking_hotels
ALTER TABLE booking_hotels
ADD COLUMN IF NOT EXISTS hotel_config jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Add photo_path and map_path columns for hotel images
ALTER TABLE booking_hotels
ADD COLUMN IF NOT EXISTS photo_path text,
ADD COLUMN IF NOT EXISTS map_path text;
```

**Step 2: Apply migration**

Use Supabase MCP `apply_migration` or run via `execute_sql`.

**Step 3: Populate hotel_config for existing 4 hotels**

Run SQL UPDATE statements for each hotel with the full config extracted from the original PDFs. Each hotel_config JSONB includes:

```json
{
  "gps": "N 55 40.008, E 12 35.157",
  "layout": "photo_only",
  "checkin_time": "15:00 - 00:00",
  "checkout_time": "until 12:00",
  "room_type": "Standard Queen Room - Single Use",
  "meal_plan": "Breakfast is included in the final price.",
  "amenities": "Private bathroom . Free toiletries . Shower . Air conditioning ...",
  "bed_size": "1 large double bed (151-180cm wide)",
  "prepayment": "No prepayment is needed.",
  "cancel_days_before": 14,
  "cancel_time": "11:59 PM",
  "cancel_policy_note": "Changing the dates of your stay is not possible.",
  "payment_methods": "American Express, Visa, Mastercard, Diners Club",
  "payment_handles_text": "AC Hotel by Marriott Bella Sky Copenhagen handles all payments.",
  "payment_accepts_text": "This property accepts the following forms of payment: American Express, Visa, Mastercard, Diners Club",
  "currency_note": "You'll pay AC Hotel by Marriott Bella Sky Copenhagen in DKK according to the exchange rate on the day of payment.\nThe amount displayed in TRY is just an estimate based on today's exchange rate for DKK.",
  "additional_info": "Please note that additional supplements (e.g. extra bed) are not added in this total.\nIf you cancel, applicable taxes may still be charged by the property.\nIf you don't show up at this booking, and you don't cancel beforehand, the property is liable to charge you the full reservation amount.\nPlease remember to read the Important information below, as this may contain important details not mentioned here.",
  "important_info": "Guests are required to show a photo identification and credit card upon check-in. Please note that all Special Requests are subject to availability and additional charges may apply.\nA damage deposit of DKK 250 is required on arrival. That's about TRY 1,727. This will be collected by credit card. You should be reimbursed within 7 days of check-out. Your deposit will be refunded in full by credit card, subject to an inspection of the property.",
  "parking_policy": "Public parking is possible at a location nearby (reservation is not possible) and costs DKK 240 per day.",
  "wifi_policy": "WiFi is available in all areas and is free of charge.",
  "page2_contact_text": "For any questions related to the property, you can contact AC Hotel by Marriott Bella Sky Copenhagen directly on: +45 32 47 30 00"
}
```

Each hotel gets its own values extracted from the PDF screenshots.

**Step 4: Commit**

```bash
git add supabase/migrations/015_booking_hotel_config.sql
git commit -m "feat: add hotel_config JSONB column for HTML-based booking generation"
```

---

### Task 3: Create Booking.com HTML template

**Files:**
- Create: `pdf-service/templates/booking_confirmation.html`

**Step 1: Build the Jinja2 HTML/CSS template**

This is the core deliverable. A single HTML file with embedded CSS that replicates the Booking.com confirmation layout. Key sections:

**CSS requirements:**
- `@page { size: A4; margin: 0; }` — full bleed A4
- Segoe UI font family (already bundled in pdf-service/fonts/)
- Booking.com navy blue (#003580) for header and links
- Light gray (#f5f5f5) backgrounds for sections
- Date grid boxes with borders
- Two-column layout for room details + cancellation
- Two-column layout for important info + hotel policies

**HTML structure with Jinja2:**
```html
<!-- Page 1 -->
<div class="page">
  <!-- Header: Booking.com logo + confirmation number + PIN -->
  <div class="header">...</div>

  <!-- Hotel info section: conditional layout based on {{ layout }} -->
  {% if layout == "photo_map_side_by_side" %}
    <!-- Cabinn style: large photo + map side by side above hotel name -->
  {% elif layout == "photo_and_map" %}
    <!-- Wakeup style: small photo inline, map below additional info -->
  {% elif layout == "photo_only" %}
    <!-- AC Hotel / Radisson style: small photo inline with hotel name -->
  {% else %}
    <!-- No visuals: just hotel name + address -->
  {% endif %}

  <!-- Date grid: CHECK-IN | CHECK-OUT | NIGHTS columns -->
  <!-- PRICE section: 1 room, 25% VAT, total TL, total DKK -->
  <!-- "The final price shown..." -->
  <!-- Payment Information -->
  <!-- Currency and exchange rate information -->
  <!-- Additional information -->
  {% if layout == "photo_and_map" and map_url %}
    <!-- Map image (Wakeup style: between additional info and room details) -->
  {% endif %}
  <!-- Room details (left) + Cancellation (right) -->
  <!-- Important information (left) + Hotel Policies (right) -->
</div>

<!-- Page 2 -->
<div class="page">
  <!-- Need help? section -->
  <!-- Contact info -->
  <!-- Safety info -->
  <!-- Footer with email -->
</div>
```

**Dynamic variables used in template:**
- `hotel_name`, `hotel_address`, `hotel_phone`, `hotel_gps`
- `photo_url`, `map_url`, `layout`
- `confirmation_number`, `pin_code`
- `checkin_day`, `checkin_month`, `checkin_weekday`, `checkin_time`
- `checkout_day`, `checkout_month`, `checkout_weekday`, `checkout_time`
- `nights`, `num_guests`, `your_group`
- `guest_name`, `guest_email`
- `room_type`, `meal_plan`, `amenities`, `bed_size`
- `price_base_tl`, `price_vat_tl`, `price_total_tl`, `price_total_dkk`
- `prepayment`, `cancel_until_date`, `cancel_from_date`, `cancel_policy_note`
- `refund_amount_tl`, `refund_until_date`, `refund_from_date`
- `payment_handles_text`, `payment_accepts_text`, `currency_note`
- `additional_info`, `important_info`
- `parking_policy`, `wifi_policy`
- `page2_contact_text`

**Step 2: Test by rendering with sample data**

Create a small test script that renders the template with sample data and opens in browser:
```bash
cd pdf-service
python -c "
from jinja2 import Environment, FileSystemLoader
env = Environment(loader=FileSystemLoader('templates'))
tmpl = env.get_template('booking_confirmation.html')
html = tmpl.render(hotel_name='Test Hotel', ...)
open('/tmp/test_booking.html', 'w').write(html)
"
open /tmp/test_booking.html
```

**Step 3: Compare visually with original PDFs**

Open the rendered HTML alongside the original PDF screenshots. Adjust CSS spacing, font sizes, colors until pixel-perfect match.

**Step 4: Commit**

```bash
git add pdf-service/templates/booking_confirmation.html
git commit -m "feat: add Booking.com HTML template for booking confirmation generation"
```

---

### Task 4: Create Python generation module

**Files:**
- Create: `pdf-service/generate_booking_html.py`
- Modify: `pdf-service/requirements.txt` (add `jinja2`)

**Step 1: Add jinja2 to requirements**

```
jinja2==3.1.4
```

**Step 2: Write the generation module**

```python
"""Generate Booking.com-style confirmation HTML from hotel config + booking data."""
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from jinja2 import Environment, FileSystemLoader
import base64
import os

TEMPLATE_DIR = Path(__file__).parent / "templates"

@dataclass
class BookingData:
    guest_name: str
    guest_email: str
    confirmation_number: str
    pin_code: str
    checkin_date: str        # YYYY-MM-DD
    checkout_date: str       # YYYY-MM-DD
    num_guests: int
    price_total_tl: float
    price_total_dkk: float
    refund_amount_tl: float

def _fmt_tl(amount: float) -> str:
    """Format TL amount with comma thousands separator, no decimals."""
    return f"{int(round(amount)):,}"

def _fmt_tl_decimal(amount: float) -> str:
    """Format TL with 2 decimal places and comma thousands."""
    integer_part = int(amount)
    decimal_part = round((amount - integer_part) * 100)
    return f"{integer_part:,}.{decimal_part:02d}"

def _fmt_dkk(amount: float) -> str:
    """Format DKK amount."""
    return f"{amount:,.2f}"

def _image_to_data_uri(storage_url: str) -> str:
    """Convert a Supabase storage URL to a data: URI for embedding in HTML.
    WeasyPrint's safe_url_fetcher allows https:// URLs, so we can use the URL directly.
    """
    return storage_url

def build_template_context(booking: BookingData, hotel_config: dict, hotel_record: dict) -> dict:
    """Build the full Jinja2 template context from booking data + hotel config."""

    checkin = datetime.strptime(booking.checkin_date, "%Y-%m-%d")
    checkout = datetime.strptime(booking.checkout_date, "%Y-%m-%d")
    nights = max(1, (checkout - checkin).days)

    cancel_days = hotel_config.get("cancel_days_before", 3)
    cancel_deadline = checkin - timedelta(days=cancel_days)
    cancel_from = cancel_deadline + timedelta(days=1)

    # Refund dates (same logic as current system)
    refund_until_date = checkin - timedelta(days=1)

    # Price breakdown (25% VAT)
    total_tl = booking.price_total_tl
    base_tl = total_tl / 1.25
    vat_tl = total_tl - base_tl

    # Build Supabase storage base URL for images
    supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", os.environ.get("SUPABASE_URL", ""))

    photo_path = hotel_record.get("photo_path") or ""
    map_path = hotel_record.get("map_path") or ""

    photo_url = f"{supabase_url}/storage/v1/object/public/hotel-assets/{photo_path}" if photo_path else ""
    map_url = f"{supabase_url}/storage/v1/object/public/hotel-assets/{map_path}" if map_path else ""

    return {
        # Hotel info
        "hotel_name": hotel_record.get("name", ""),
        "hotel_address": hotel_record.get("address", ""),
        "hotel_phone": f"+{hotel_record.get('phone_country_code', '').lstrip('+')} {hotel_record.get('phone', '')}".strip(),
        "hotel_gps": hotel_config.get("gps", ""),
        "layout": hotel_config.get("layout", "photo_only"),
        "photo_url": photo_url,
        "map_url": map_url,

        # Confirmation
        "confirmation_number": booking.confirmation_number,
        "pin_code": booking.pin_code,

        # Dates
        "checkin_day": str(checkin.day),
        "checkin_month": checkin.strftime("%B").upper(),
        "checkin_weekday": checkin.strftime("%A"),
        "checkin_time": hotel_config.get("checkin_time", "15:00 - 00:00"),
        "checkout_day": str(checkout.day),
        "checkout_month": checkout.strftime("%B").upper(),
        "checkout_weekday": checkout.strftime("%A"),
        "checkout_time": hotel_config.get("checkout_time", "until 11:00"),
        "nights": str(nights),
        "num_guests": booking.num_guests,
        "your_group": f"{booking.num_guests} adult{'s' if booking.num_guests > 1 else ''}",

        # Guest
        "guest_name": booking.guest_name,
        "guest_email": booking.guest_email,

        # Room
        "room_type": hotel_config.get("room_type", "Standard Room"),
        "meal_plan": hotel_config.get("meal_plan", "There is no meal option with this room."),
        "amenities": hotel_config.get("amenities", ""),
        "bed_size": hotel_config.get("bed_size", ""),

        # Prices
        "price_rooms": f"TL {_fmt_tl(base_tl)}",
        "price_vat": f"TL {_fmt_tl(vat_tl)}",
        "price_total_tl": f"TL {_fmt_tl(total_tl)}",
        "price_total_dkk": f"DKK {_fmt_dkk(booking.price_total_dkk)}",
        "price_total_tl_raw": _fmt_tl(total_tl),
        "price_total_dkk_raw": _fmt_dkk(booking.price_total_dkk),

        # Cancellation
        "prepayment": hotel_config.get("prepayment", "No prepayment is needed."),
        "cancel_until_date": f"{cancel_deadline.strftime('%B')} {cancel_deadline.day}, {cancel_deadline.year}",
        "cancel_until_time": hotel_config.get("cancel_time", "11:59 PM"),
        "cancel_from_date": f"{cancel_from.strftime('%B')} {cancel_from.day}, {cancel_from.year}",
        "cancel_policy_note": hotel_config.get("cancel_policy_note", ""),

        # Refund
        "refund_amount_tl": _fmt_tl_decimal(booking.refund_amount_tl),
        "refund_until_date": f"{refund_until_date.day} {refund_until_date.strftime('%B')} {refund_until_date.year}",
        "refund_from_date": f"{checkin.day} {checkin.strftime('%B')} {checkin.year}",

        # Policy texts
        "payment_handles_text": hotel_config.get("payment_handles_text", ""),
        "payment_accepts_text": hotel_config.get("payment_accepts_text", ""),
        "currency_note": hotel_config.get("currency_note", ""),
        "additional_info": hotel_config.get("additional_info", ""),
        "important_info": hotel_config.get("important_info", ""),
        "parking_policy": hotel_config.get("parking_policy", ""),
        "wifi_policy": hotel_config.get("wifi_policy", ""),
        "page2_contact_text": hotel_config.get("page2_contact_text", ""),
    }


def render_booking_html(booking: BookingData, hotel_config: dict, hotel_record: dict) -> str:
    """Render the booking confirmation HTML."""
    env = Environment(loader=FileSystemLoader(str(TEMPLATE_DIR)), autoescape=False)
    template = env.get_template("booking_confirmation.html")
    context = build_template_context(booking, hotel_config, hotel_record)
    return template.render(**context)
```

**Step 3: Commit**

```bash
git add pdf-service/generate_booking_html.py pdf-service/requirements.txt
git commit -m "feat: add HTML booking generation module with Jinja2"
```

---

### Task 5: Update FastAPI endpoint

**Files:**
- Modify: `pdf-service/main.py`

**Step 1: Update the `/generate-booking` endpoint**

Replace the current endpoint that calls `edit_booking_pdf()` with one that:
1. Receives hotel_config + booking data (no more template_url)
2. Calls `render_booking_html()` to build HTML
3. Calls WeasyPrint to convert HTML to PDF
4. Returns base64 PDF

New request model:
```python
class BookingRequest(BaseModel):
    guest_name: str
    guest_email: str = ""
    checkin_date: str          # YYYY-MM-DD
    checkout_date: str         # YYYY-MM-DD
    confirmation_number: str | None = None
    pin_code: str | None = None
    num_guests: int = 1
    price_total_tl: float = 0
    price_total_dkk: float = 0
    refund_amount_tl: float = 0
    hotel_config: dict = {}    # The hotel_config JSONB from DB
    hotel_record: dict = {}    # Basic hotel fields (name, address, phone, etc.)
```

New endpoint logic:
```python
@app.post("/generate-booking")
async def generate_booking(req: BookingRequest, x_api_key: str = Header(default="")):
    verify_api_key(x_api_key)
    try:
        from generate_booking_html import BookingData, render_booking_html
        from weasyprint import HTML

        conf = req.confirmation_number or f"{random.randint(1000,9999)}.{random.randint(100,999)}.{random.randint(100,999)}"
        pin = req.pin_code or f"{random.randint(1000,9999)}"

        booking = BookingData(
            guest_name=req.guest_name,
            guest_email=req.guest_email,
            confirmation_number=conf,
            pin_code=pin,
            checkin_date=req.checkin_date,
            checkout_date=req.checkout_date,
            num_guests=req.num_guests,
            price_total_tl=req.price_total_tl,
            price_total_dkk=req.price_total_dkk,
            refund_amount_tl=req.refund_amount_tl,
        )

        html = render_booking_html(booking, req.hotel_config, req.hotel_record)
        pdf_bytes = HTML(string=html).write_pdf()

        return {"status": "success", "pdf_base64": base64.b64encode(pdf_bytes).decode()}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"status": "error", "error": str(e)}
```

**Step 2: Remove old import**

Remove `from edit_booking import edit_booking_pdf, booking_from_dates` from main.py.

**Step 3: Commit**

```bash
git add pdf-service/main.py
git commit -m "feat: update /generate-booking endpoint to use HTML generation"
```

---

### Task 6: Update Next.js generate-documents.ts

**Files:**
- Modify: `src/lib/generate-documents.ts`

**Step 1: Update `generateBookingPdf()` function**

Change the request body sent to the PDF service. Instead of:
```json
{
  "template_url": "...",
  "edit_config": { ... },
  "guest_name": "...",
  ...
}
```

Send:
```json
{
  "guest_name": "...",
  "guest_email": "...",
  "checkin_date": "...",
  "checkout_date": "...",
  "num_guests": 1,
  "price_total_tl": 29213,
  "price_total_dkk": 4265,
  "refund_amount_tl": 23370.40,
  "hotel_config": { ... },
  "hotel_record": {
    "name": "Wakeup Copenhagen",
    "address": "Bernstorffsgade 35, 1577 Copenhagen, Denmark",
    "phone": "44 80 00 00",
    "phone_country_code": "45",
    "photo_path": "wakeup/photo.jpg",
    "map_path": "wakeup/map.png"
  }
}
```

Key changes:
- Remove `template_url` and `urlData.publicUrl` logic (no more downloading template PDFs)
- Remove `edit_config` from request body
- Add `hotel_config` (from `hotel.hotel_config`)
- Add `hotel_record` (subset of hotel DB record: name, address, phone, phone_country_code, photo_path, map_path)

**Step 2: Remove the `wrapInA4Template` function** if it's only used for letter of intent

Check if `wrapInA4Template` is still used — it's used by the letter of intent flow. Keep it but it's no longer relevant to booking generation.

**Step 3: Commit**

```bash
git add src/lib/generate-documents.ts
git commit -m "feat: send hotel_config to PDF service instead of template_url + edit_config"
```

---

### Task 7: Update hotel form UI

**Files:**
- Modify: `src/components/booking-templates/hotel-form.tsx`

**Step 1: Expand the form schema**

Add new fields for hotel_config properties. Replace the JSON editor collapsible with structured form sections:

**New form sections (in collapsible groups):**
1. **Basic Info** (existing): name, country, address, postal_code, city, email, phone, website, price_per_night_eur
2. **Layout & Images**: layout dropdown (4 options), photo upload, map upload
3. **Room Details**: room_type, meal_plan, amenities (textarea), bed_size, checkin_time, checkout_time
4. **Cancellation & Payment**: cancel_days_before (number), cancel_time, cancel_policy_note, prepayment, payment_methods
5. **Policy Texts**: payment_handles_text, currency_note, additional_info, important_info, parking_policy, wifi_policy, page2_contact_text, gps

Each text field is a Textarea for multi-line content. The layout field is a Select with 4 options.

**Step 2: Update form submission**

On submit, build `hotel_config` JSONB from the structured fields and save alongside the existing columns. Upload photo/map images to `hotel-assets` bucket.

**Step 3: Remove PDF template upload**

Remove the PDF file upload section entirely — it's no longer needed. Keep the `template_path` column in DB for backward compatibility but don't use it.

**Step 4: Commit**

```bash
git add src/components/booking-templates/hotel-form.tsx
git commit -m "feat: replace JSON editor with structured hotel config form"
```

---

### Task 8: Create hotel-assets storage bucket

**Step 1: Create bucket in Supabase**

Use Supabase MCP or SQL to create the `hotel-assets` public bucket.

**Step 2: Upload extracted images**

Upload the hotel photos and maps extracted in Task 1 to the bucket with paths:
- `{hotel_id}/photo.jpg`
- `{hotel_id}/map.png`

**Step 3: Update hotel records with photo/map paths**

```sql
UPDATE booking_hotels SET photo_path = '{hotel_id}/photo.jpg', map_path = '{hotel_id}/map.png' WHERE id = '{hotel_id}';
```

**Step 4: Commit** (no code changes, just data)

---

### Task 9: Delete old PDF surgery code

**Files:**
- Delete: `pdf-service/edit_booking.py` (660 lines)
- Delete: `pdf-service/debug_stream.py` (if exists)

**Step 1: Remove old files**

```bash
rm pdf-service/edit_booking.py
rm -f pdf-service/debug_stream.py
```

**Step 2: Remove pikepdf and fonttools from requirements** (if not used elsewhere)

Check if pikepdf is used by extract_text endpoint — it's not, pdfminer is used. Safe to remove:
```
# Remove from requirements.txt:
pikepdf==9.0.0
fonttools==4.53.0
```

**Step 3: Update Dockerfile if needed**

No changes needed — WeasyPrint deps are already installed.

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor: remove old PDF surgery code (edit_booking.py, pikepdf, fonttools)"
```

---

### Task 10: End-to-end testing

**Step 1: Test locally**

1. Start pdf-service: `cd pdf-service && pip install jinja2 && uvicorn main:app --reload`
2. Start Next.js: `npm run dev`
3. Open an application with a Danish hotel booking
4. Click "Generate Booking" — verify it creates a PDF
5. Download and visually compare with original template

**Step 2: Test all 4 hotels**

Generate a booking for each hotel and compare:
- AC Hotel (photo_only layout)
- Wakeup (photo_and_map layout)
- Cabinn (photo_map_side_by_side layout)
- Radisson (photo_only layout)

**Step 3: Test edge cases**

- Group booking (num_guests > 1)
- Different date ranges (1 night, 30 nights)
- Long guest names
- Special characters in guest name (Turkish characters)

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete booking PDF rebuild — HTML-based generation with WeasyPrint"
```

---

## Task Dependencies

```
Task 1 (extract images) ──┐
                           ├── Task 8 (upload to storage)
Task 2 (DB migration) ────┤
                           ├── Task 3 (HTML template) ── Task 5 (FastAPI) ── Task 10 (testing)
                           │                                    │
                           ├── Task 4 (Python module) ──────────┘
                           │
                           ├── Task 6 (generate-documents.ts) ── Task 10
                           │
                           ├── Task 7 (hotel form UI) ── Task 10
                           │
                           └── Task 9 (delete old code) ── Task 10
```

Tasks 1-4 can be done in parallel. Tasks 5-7 depend on 3-4. Task 8 depends on 1-2. Task 9 comes after 5 is verified. Task 10 is the final integration test.
