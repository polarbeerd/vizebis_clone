"""
Generate Booking.com-style confirmation HTML from structured data.

This module builds a Jinja2 template context and renders the
booking_confirmation.html template. The resulting HTML is intended to
be passed to WeasyPrint for A4 PDF generation.
"""

import os
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Optional

from jinja2 import Environment, FileSystemLoader

# ---------------------------------------------------------------------------
# Template directory
# ---------------------------------------------------------------------------
_TEMPLATE_DIR = os.path.join(os.path.dirname(__file__), "templates")

_jinja_env = Environment(
    loader=FileSystemLoader(_TEMPLATE_DIR),
    autoescape=False,  # HTML is pre-sanitised; we need raw markup in replace() output
)

# ---------------------------------------------------------------------------
# Supabase storage base URL (images are in the hotel-assets bucket)
# ---------------------------------------------------------------------------
SUPABASE_URL = os.environ.get("SUPABASE_URL", os.environ.get("NEXT_PUBLIC_SUPABASE_URL", ""))


# ---------------------------------------------------------------------------
# Formatting helpers
# ---------------------------------------------------------------------------

def _fmt_tl(val: float) -> str:
    """Format as TL-style with comma thousands: 27158.0 -> '27,158'"""
    return f"{int(round(val)):,}"


def _fmt_dkk(val: float) -> str:
    """Format DKK with comma thousands and 2 decimals: 3915.2 -> '3,915.20'"""
    return f"{val:,.2f}"


# ---------------------------------------------------------------------------
# Data class
# ---------------------------------------------------------------------------

@dataclass
class BookingData:
    """Minimal booking input — everything else is derived."""
    guest_name: str
    guest_email: str
    confirmation_number: str
    pin_code: str
    checkin_date: str          # YYYY-MM-DD
    checkout_date: str         # YYYY-MM-DD
    num_guests: int = 1
    price_total_tl: float = 0.0
    price_total_dkk: float = 0.0
    refund_amount_tl: float = 0.0


# ---------------------------------------------------------------------------
# Context builder
# ---------------------------------------------------------------------------

def _image_url(path: Optional[str]) -> str:
    """Build a public Supabase Storage URL for a hotel-assets object."""
    if not path:
        return ""
    # If it's already a full URL, return as-is
    if path.startswith("http://") or path.startswith("https://"):
        return path
    base = SUPABASE_URL.rstrip("/")
    return f"{base}/storage/v1/object/public/hotel-assets/{path.lstrip('/')}"


def build_template_context(
    booking: BookingData,
    hotel_config: dict,
    hotel_record: dict,
) -> dict:
    """
    Build the full Jinja2 template context dictionary.

    Parameters
    ----------
    booking : BookingData
        Per-application booking details.
    hotel_config : dict
        The ``hotel_config`` JSONB column from ``booking_hotels``.
        Expected keys: layout, photo_path, map_path, hotel_name, hotel_address,
        hotel_phone, hotel_gps, checkin_time, checkout_time, room_type,
        meal_plan, amenities, bed_size, prepayment, cancel_days_before,
        cancel_policy_note, payment_handles_text, payment_accepts_text,
        currency_note, additional_info, important_info, parking_policy,
        wifi_policy, page2_contact_text.
    hotel_record : dict
        The full row from ``booking_hotels`` (used for fallback name/country).

    Returns
    -------
    dict
        Ready-to-render Jinja2 context.
    """
    ci = datetime.strptime(booking.checkin_date, "%Y-%m-%d")
    co = datetime.strptime(booking.checkout_date, "%Y-%m-%d")
    nights = (co - ci).days

    # Cancellation deadline
    cancel_days = int(hotel_config.get("cancel_days_before", 1))
    cancel_deadline = ci - timedelta(days=cancel_days)

    # Price breakdown (base + 25 % VAT = total)
    total_tl = float(booking.price_total_tl) if booking.price_total_tl else 0.0
    base_tl = total_tl / 1.25 if total_tl else 0.0
    vat_tl = total_tl - base_tl

    total_dkk = float(booking.price_total_dkk) if booking.price_total_dkk else 0.0

    # Refund amount
    refund_tl = float(booking.refund_amount_tl) if booking.refund_amount_tl else 0.0

    # Image URLs
    layout = hotel_config.get("layout", "no_visuals")
    photo_url = _image_url(hotel_config.get("photo_path"))
    map_url = _image_url(hotel_config.get("map_path"))

    # Refund dates
    refund_until_date = f"{ci.day} {ci.strftime('%B')} {ci.year}"
    refund_from_date = refund_until_date  # same day for "from 12:00 on ..."

    # Cancel display dates (US format for the cancellation box)
    cancel_until_date = f"{cancel_deadline.strftime('%B')} {cancel_deadline.day}, {cancel_deadline.year}"
    cancel_from_date = f"{ci.strftime('%B')} {ci.day}, {ci.year}"

    # your_group helper
    your_group = f"{booking.num_guests} adult" if booking.num_guests == 1 else f"{booking.num_guests} adults"

    return {
        # Hotel
        "hotel_name": hotel_config.get("hotel_name", hotel_record.get("name", "")),
        "hotel_address": hotel_config.get("hotel_address", ""),
        "hotel_phone": hotel_config.get("hotel_phone", ""),
        "hotel_gps": hotel_config.get("hotel_gps", ""),

        # Images & layout
        "photo_url": photo_url,
        "map_url": map_url,
        "layout": layout,

        # Confirmation
        "confirmation_number": booking.confirmation_number,
        "pin_code": booking.pin_code,

        # Dates
        "checkin_day": str(ci.day),
        "checkin_month": ci.strftime("%B").upper(),
        "checkin_weekday": ci.strftime("%A"),
        "checkin_time": hotel_config.get("checkin_time", "15:00 - 00:00"),
        "checkout_day": str(co.day),
        "checkout_month": co.strftime("%B").upper(),
        "checkout_weekday": co.strftime("%A"),
        "checkout_time": hotel_config.get("checkout_time", "until 12:00"),
        "nights": str(nights),
        "num_guests": booking.num_guests,
        "your_group": your_group,

        # Guest
        "guest_name": booking.guest_name.upper(),
        "guest_email": booking.guest_email,

        # Room
        "room_type": hotel_config.get("room_type", "Standard Room"),
        "meal_plan": hotel_config.get("meal_plan", "There is no meal option with this room."),
        "amenities": hotel_config.get("amenities", ""),
        "bed_size": hotel_config.get("bed_size", "1 large double bed (151-180cm wide)"),

        # Price
        "price_rooms": _fmt_tl(base_tl),
        "price_vat": _fmt_tl(vat_tl),
        "price_total_tl": _fmt_tl(total_tl),
        "price_total_dkk": _fmt_dkk(total_dkk),

        # Cancellation
        "prepayment": hotel_config.get("prepayment", "No prepayment is needed."),
        "cancel_until_date": cancel_until_date,
        "cancel_until_time": hotel_config.get("cancel_until_time", hotel_config.get("cancel_time", "11:59 PM")),
        "cancel_from_date": cancel_from_date,
        "cancel_policy_note": hotel_config.get("cancel_policy_note", "DKK 0\nChanging the dates of your stay is not possible."),

        # Refund
        "refund_amount_tl": _fmt_dkk(refund_tl) if refund_tl else "",
        "refund_until_date": refund_until_date,
        "refund_from_date": refund_from_date,

        # Payment
        "payment_handles_text": hotel_config.get("payment_handles_text", ""),
        "payment_accepts_text": hotel_config.get("payment_accepts_text", ""),
        "currency_note": hotel_config.get("currency_note", ""),

        # Additional / Important
        "additional_info": hotel_config.get("additional_info", ""),
        "important_info": hotel_config.get("important_info", ""),

        # Policies
        "parking_policy": hotel_config.get("parking_policy", ""),
        "wifi_policy": hotel_config.get("wifi_policy", ""),

        # Page 2
        "page2_contact_text": hotel_config.get("page2_contact_text", ""),
    }


# ---------------------------------------------------------------------------
# Renderer
# ---------------------------------------------------------------------------

def render_booking_html(
    booking: BookingData,
    hotel_config: dict,
    hotel_record: dict,
) -> str:
    """
    Render the booking confirmation HTML string.

    The returned HTML is ready to be passed to WeasyPrint's
    ``HTML(string=...).write_pdf()`` for A4 PDF output.
    """
    ctx = build_template_context(booking, hotel_config, hotel_record)
    template = _jinja_env.get_template("booking_confirmation.html")
    return template.render(**ctx)
