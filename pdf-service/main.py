import os
import io
from datetime import datetime, timedelta
from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from pydantic import BaseModel
import httpx
import base64
import random
from replace_text import replace_text_in_pdf

app = FastAPI(title="Booking PDF Service")
PORT = int(os.environ.get("PORT", 8000))

PDF_SERVICE_API_KEY = os.environ.get("PDF_SERVICE_API_KEY", "")


def verify_api_key(x_api_key: str = Header(default="")):
    if PDF_SERVICE_API_KEY and x_api_key != PDF_SERVICE_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")


# ---------------------------------------------------------------------------
# /generate-booking — download template PDF, replace text, return new PDF
# ---------------------------------------------------------------------------

class BookingRequest(BaseModel):
    template_url: str
    guest_name: str
    guest_email: str = ""
    checkin_date: str          # YYYY-MM-DD
    checkout_date: str         # YYYY-MM-DD
    confirmation_number: str | None = None
    pin_code: str | None = None
    num_guests: int = 1
    price_total_tl: float = 0.0
    price_total_dkk: float = 0.0
    refund_amount_tl: float = 0.0
    field_mapping: dict = {}
    cancel_days_before: int = 3


@app.post("/generate-booking")
async def generate_booking(req: BookingRequest, x_api_key: str = Header(default="")):
    verify_api_key(x_api_key)
    try:
        # Download template PDF
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(req.template_url)
            resp.raise_for_status()
            template_bytes = resp.content

        conf = req.confirmation_number or f"{random.randint(1000,9999)}.{random.randint(100,999)}.{random.randint(100,999)}"
        pin = req.pin_code or f"{random.randint(1000,9999)}"

        replacements = _build_replacements(req, conf, pin)
        pdf_bytes = replace_text_in_pdf(template_bytes, replacements)

        return {"status": "success", "pdf_base64": base64.b64encode(pdf_bytes).decode()}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"status": "error", "error": str(e)}


def _fmt_tl(val: float) -> str:
    return f"{int(round(val)):,}"

def _fmt_dkk(val: float) -> str:
    return f"{val:,.2f}"

def _format_date_like(dt: datetime, original: str) -> str:
    """Format *dt* to match the style of *original* date string."""
    if not original:
        return f"{dt.strftime('%B')} {dt.day}, {dt.year}"
    s = original.strip()
    if s and s[0].isdigit():
        # "14 May 2026" style
        return f"{dt.day} {dt.strftime('%B')} {dt.year}"
    # "May 14, 2026" style
    return f"{dt.strftime('%B')} {dt.day}, {dt.year}"


def _build_replacements(req: BookingRequest, conf: str, pin: str) -> dict[str, str]:
    fm = req.field_mapping
    if not fm:
        return {}

    ci = datetime.strptime(req.checkin_date, "%Y-%m-%d")
    co = datetime.strptime(req.checkout_date, "%Y-%m-%d")
    nights = (co - ci).days

    total_tl = req.price_total_tl
    base_tl = total_tl / 1.25 if total_tl else 0
    vat_tl = total_tl - base_tl

    cancel_deadline = ci - timedelta(days=req.cancel_days_before)

    # Map each detected field to its new value
    new_values: dict[str, str | None] = {
        "guest_name": req.guest_name.upper(),
        "guest_email": req.guest_email.lower() if req.guest_email else None,
        "confirmation_number": conf,
        "pin_code": pin,
        "checkin_day": str(ci.day),
        "checkin_month": ci.strftime("%B").upper(),
        "checkin_weekday": ci.strftime("%A"),
        "checkout_day": str(co.day),
        "checkout_month": co.strftime("%B").upper(),
        "checkout_weekday": co.strftime("%A"),
        "num_nights": str(nights),
        "num_guests": str(req.num_guests),
        "num_guests_display": f"{req.num_guests} adult" if req.num_guests == 1 else f"{req.num_guests} adults",
        "price_rooms": _fmt_tl(base_tl),
        "price_vat": _fmt_tl(vat_tl),
        "price_total_tl": _fmt_tl(total_tl),
        "price_total_dkk": _fmt_dkk(req.price_total_dkk),
    }

    # Cancel dates — format to match original style
    if "cancel_until_date" in fm:
        new_values["cancel_until_date"] = _format_date_like(cancel_deadline, fm["cancel_until_date"])
    if "cancel_from_date" in fm:
        new_values["cancel_from_date"] = _format_date_like(ci, fm["cancel_from_date"])

    # Refund dates & amount
    if "refund_until_date" in fm:
        new_values["refund_until_date"] = _format_date_like(ci, fm["refund_until_date"])
    if "refund_from_date" in fm:
        new_values["refund_from_date"] = _format_date_like(ci, fm["refund_from_date"])
    if "refund_amount" in fm and req.refund_amount_tl:
        new_values["refund_amount"] = _fmt_dkk(req.refund_amount_tl)

    # Build old→new dict (skip unchanged or missing)
    replacements: dict[str, str] = {}
    for field_name, original_text in fm.items():
        new_text = new_values.get(field_name)
        if new_text is not None and original_text and str(original_text) != str(new_text):
            replacements[str(original_text)] = str(new_text)

    return replacements


# ---------------------------------------------------------------------------
# /detect-fields — AI-powered field detection from uploaded PDF
# ---------------------------------------------------------------------------

@app.post("/detect-fields")
async def detect_fields(file: UploadFile = File(...), x_api_key: str = Header(default="")):
    verify_api_key(x_api_key)
    try:
        from detect_fields import detect_booking_fields
        pdf_bytes = await file.read()
        mapping = await detect_booking_fields(pdf_bytes)
        return {"status": "success", "field_mapping": mapping}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"status": "error", "error": str(e)}


# ---------------------------------------------------------------------------
# /html-to-pdf — generic HTML→PDF (used for letter of intent)
# ---------------------------------------------------------------------------

class HtmlToPdfRequest(BaseModel):
    html: str

@app.post("/html-to-pdf")
async def html_to_pdf(req: HtmlToPdfRequest, x_api_key: str = Header(default="")):
    verify_api_key(x_api_key)
    try:
        from weasyprint import HTML
        from weasyprint.urls import default_url_fetcher

        def safe_url_fetcher(url, timeout=10, ssl_context=None):
            if url.startswith("data:") or url.startswith("https://"):
                return default_url_fetcher(url, timeout=timeout, ssl_context=ssl_context)
            raise ValueError(f"Blocked URL fetch: {url}")

        pdf_bytes = HTML(string=req.html, url_fetcher=safe_url_fetcher).write_pdf()
        return {"status": "success", "pdf_base64": base64.b64encode(pdf_bytes).decode()}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"status": "error", "error": str(e)}


# ---------------------------------------------------------------------------
# /extract-text — plain text extraction from PDF
# ---------------------------------------------------------------------------

@app.post("/extract-text")
async def extract_text(file: UploadFile = File(...), x_api_key: str = Header(default="")):
    verify_api_key(x_api_key)
    try:
        from pdfminer.high_level import extract_text as pdfminer_extract
        content = await file.read()
        text = pdfminer_extract(io.BytesIO(content))
        return {"status": "success", "text": text.strip()}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"status": "error", "error": str(e)}


@app.get("/health")
async def health():
    return {"status": "ok"}
