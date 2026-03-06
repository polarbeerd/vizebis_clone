"""
Auto-detect dynamic fields in a Booking.com confirmation PDF using Gemini.
"""
import os
import json
import httpx
from io import BytesIO
from pdfminer.high_level import extract_text

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

DETECTION_PROMPT = """You are analyzing text extracted from a Booking.com hotel confirmation PDF.

Identify all DYNAMIC fields (values that change per booking) and return their EXACT text as found in the document.

Fields to find:
- guest_name: The guest's full name (near "Guest name:", usually UPPERCASE)
- guest_email: Email address (near bottom of document)
- confirmation_number: Booking confirmation number (format like XXXX.XXX.XXX)
- pin_code: The 4-digit PIN code (after "PIN CODE:")
- checkin_day: Check-in day number only (the large number in the date grid, e.g. "14")
- checkin_month: Check-in month name (UPPERCASE in date grid, e.g. "MAY")
- checkin_weekday: Check-in weekday (e.g. "Thursday")
- checkout_day: Check-out day number only
- checkout_month: Check-out month name (UPPERCASE)
- checkout_weekday: Check-out weekday
- num_nights: Number of nights (just the digit)
- num_guests: Number of rooms/guests (just the digit in the date grid)
- num_guests_display: Guest count text like "1 adult" or "2 adults"
- price_rooms: Room base price in TL (JUST the number with commas, e.g. "10,988")
- price_vat: VAT amount in TL (JUST the number, e.g. "2,747")
- price_total_tl: Total price in TL (JUST the number, e.g. "13,735")
- price_total_dkk: Total price in DKK (JUST the number, e.g. "2,005.20")
- cancel_until_date: Full cancellation deadline date text (e.g. "May 11, 2026")
- cancel_from_date: Check-in date as it appears in cancellation section (e.g. "May 14, 2026")
- refund_until_date: Refund deadline date if present (e.g. "14 May 2026")
- refund_from_date: Refund from-date if present
- refund_amount: Refund TL amount if present (just the number)

Rules:
- Return the EXACT text as it appears, character for character
- For price fields, return ONLY the number part (e.g. "10,988" not "TL 10,988")
- If a field is not found, omit it
- Return ONLY valid JSON, no other text

Extracted text:
---
{text}
---"""


async def detect_booking_fields(pdf_bytes: bytes) -> dict:
    """
    Extract text from a Booking.com PDF and use Gemini to identify
    which text strings correspond to dynamic booking fields.

    Returns a dict of field_name -> exact_text_value.
    """
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY not configured")

    text = extract_text(BytesIO(pdf_bytes))
    if not text or not text.strip():
        raise ValueError("Could not extract text from PDF")

    prompt = DETECTION_PROMPT.format(text=text.strip())

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}",
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.1, "maxOutputTokens": 2048},
            },
        )
        resp.raise_for_status()
        result = resp.json()

    content = (
        result.get("candidates", [{}])[0]
        .get("content", {})
        .get("parts", [{}])[0]
        .get("text", "")
    )
    if not content:
        raise ValueError("Empty response from Gemini")

    # Strip markdown code fences
    content = content.strip()
    if content.startswith("```"):
        content = content.split("\n", 1)[-1]
    if content.endswith("```"):
        content = content.rsplit("```", 1)[0]
    content = content.strip()

    mapping = json.loads(content)
    if not isinstance(mapping, dict):
        raise ValueError(f"Expected JSON object, got {type(mapping).__name__}")

    return mapping
