import os
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
import httpx
import base64
import random
from edit_booking import edit_booking_pdf, booking_from_dates

app = FastAPI(title="Booking PDF Service")
PORT = int(os.environ.get("PORT", 8000))

# Shared secret for authenticating requests from the Next.js app
PDF_SERVICE_API_KEY = os.environ.get("PDF_SERVICE_API_KEY", "")


def verify_api_key(x_api_key: str = Header(default="")):
    """Verify the request has a valid API key. Skip if no key is configured (local dev)."""
    if PDF_SERVICE_API_KEY and x_api_key != PDF_SERVICE_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")


class BookingRequest(BaseModel):
    template_url: str
    guest_name: str
    checkin_date: str
    checkout_date: str
    confirmation_number: str | None = None
    pin_code: str | None = None
    num_guests: int | None = None
    refund_amount_tl: float | None = None
    price_total_tl: float | None = None
    price_total_dkk: float | None = None
    edit_config: dict = {}

class HtmlToPdfRequest(BaseModel):
    html: str

@app.post("/generate-booking")
async def generate_booking(req: BookingRequest, x_api_key: str = Header(default="")):
    verify_api_key(x_api_key)
    try:
        # Validate template_url — only allow HTTPS URLs from trusted Supabase storage
        supabase_url = os.environ.get("SUPABASE_URL", "")
        if supabase_url and not req.template_url.startswith(supabase_url):
            raise ValueError(f"Untrusted template URL origin: {req.template_url}")

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(req.template_url)
            resp.raise_for_status()
            template_bytes = resp.content

        conf = req.confirmation_number or f"{random.randint(1000,9999)}.{random.randint(100,999)}.{random.randint(100,999)}"
        pin = req.pin_code or f"{random.randint(1000,9999)}"

        booking = booking_from_dates(
            checkin_date=req.checkin_date,
            checkout_date=req.checkout_date,
            confirmation_number=conf,
            pin_code=pin,
            guest_name=req.guest_name,
            num_guests=req.num_guests or 1,
            refund_amount_tl=req.refund_amount_tl,
            price_total_tl=req.price_total_tl,
            price_total_dkk=req.price_total_dkk,
        )

        pdf_bytes = edit_booking_pdf(template_bytes, booking, req.edit_config)
        return {"status": "success", "pdf_base64": base64.b64encode(pdf_bytes).decode()}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"status": "error", "error": str(e)}

@app.post("/html-to-pdf")
async def html_to_pdf(req: HtmlToPdfRequest, x_api_key: str = Header(default="")):
    verify_api_key(x_api_key)
    try:
        from weasyprint import HTML
        from weasyprint.urls import default_url_fetcher

        def safe_url_fetcher(url, timeout=10, ssl_context=None):
            """Only allow data: URIs and HTTPS URLs. Block file://, http:// to internal services."""
            if url.startswith("data:"):
                return default_url_fetcher(url, timeout=timeout, ssl_context=ssl_context)
            if url.startswith("https://"):
                return default_url_fetcher(url, timeout=timeout, ssl_context=ssl_context)
            # Block everything else (file://, http://169.254.x.x, etc.)
            raise ValueError(f"Blocked URL fetch: {url}")

        pdf_bytes = HTML(string=req.html, url_fetcher=safe_url_fetcher).write_pdf()
        return {"status": "success", "pdf_base64": base64.b64encode(pdf_bytes).decode()}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"status": "error", "error": str(e)}

@app.get("/health")
async def health():
    return {"status": "ok"}
