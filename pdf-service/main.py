from fastapi import FastAPI
from pydantic import BaseModel
import httpx
import base64
import random
from edit_booking import edit_booking_pdf, booking_from_dates

app = FastAPI(title="Booking PDF Service")

class BookingRequest(BaseModel):
    template_url: str
    guest_name: str
    checkin_date: str
    checkout_date: str
    confirmation_number: str | None = None
    pin_code: str | None = None
    edit_config: dict = {}

class HtmlToPdfRequest(BaseModel):
    html: str

@app.post("/generate-booking")
async def generate_booking(req: BookingRequest):
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
    )

    pdf_bytes = edit_booking_pdf(template_bytes, booking, req.edit_config)
    return {"status": "success", "pdf_base64": base64.b64encode(pdf_bytes).decode()}

@app.post("/html-to-pdf")
async def html_to_pdf(req: HtmlToPdfRequest):
    from weasyprint import HTML
    pdf_bytes = HTML(string=req.html).write_pdf()
    return {"status": "success", "pdf_base64": base64.b64encode(pdf_bytes).decode()}

@app.get("/health")
async def health():
    return {"status": "ok"}
