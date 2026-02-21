import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PDF_SERVICE_URL = process.env.PDF_SERVICE_URL || "http://localhost:8000";

// Simple in-process FX rate cache (1 hour TTL)
let fxCache: { EUR_TRY: number; EUR_DKK: number; fetchedAt: number } | null =
  null;
const FX_TTL_MS = 60 * 60 * 1000;

async function fetchFxRates(): Promise<{ EUR_TRY: number; EUR_DKK: number }> {
  if (fxCache && Date.now() - fxCache.fetchedAt < FX_TTL_MS) {
    return { EUR_TRY: fxCache.EUR_TRY, EUR_DKK: fxCache.EUR_DKK };
  }
  const resp = await fetch("https://open.er-api.com/v6/latest/EUR");
  if (!resp.ok) throw new Error("FX API unavailable");
  const data = await resp.json();
  const rates = {
    EUR_TRY: data.rates?.TRY as number,
    EUR_DKK: data.rates?.DKK as number,
  };
  if (!rates.EUR_TRY || !rates.EUR_DKK)
    throw new Error("Incomplete FX response");
  fxCache = { ...rates, fetchedAt: Date.now() };
  return rates;
}

export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get("action");
  if (action !== "rates") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
  try {
    const rates = await fetchFxRates();
    return NextResponse.json(rates);
  } catch {
    // Return fallback rates so the form is still usable
    return NextResponse.json({ EUR_TRY: 38, EUR_DKK: 7.5 });
  }
}

export async function POST(req: NextRequest) {
  const action = req.nextUrl.searchParams.get("action");
  if (action !== "generate") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      hotel_id,
      guest_name,
      confirmation_number,
      pin_code,
      checkin_date,
      checkout_date,
      num_guests,
      refund_amount_tl,
      price_total_tl,
      price_total_dkk,
    } = body;

    // Date validation
    if (new Date(checkout_date) <= new Date(checkin_date)) {
      return NextResponse.json(
        { error: "checkout_date must be after checkin_date" },
        { status: 400 }
      );
    }

    // Resolve template URL from Supabase Storage
    const { data: hotel, error } = await supabase
      .from("booking_hotels")
      .select("template_path, edit_config")
      .eq("id", hotel_id)
      .single();

    if (error || !hotel?.template_path) {
      return NextResponse.json(
        { error: "Hotel template not found" },
        { status: 404 }
      );
    }

    const { data: urlData } = supabase.storage
      .from("booking-templates")
      .getPublicUrl(hotel.template_path as string);

    // Call Python sidecar
    const sidecarResp = await fetch(`${PDF_SERVICE_URL}/generate-booking`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        template_url: urlData.publicUrl,
        guest_name,
        checkin_date,
        checkout_date,
        confirmation_number,
        pin_code,
        num_guests,
        refund_amount_tl,
        price_total_tl,
        price_total_dkk,
        edit_config: hotel.edit_config || {},
      }),
    });

    if (!sidecarResp.ok) {
      return NextResponse.json(
        { error: "PDF service error" },
        { status: 502 }
      );
    }

    const result = await sidecarResp.json();
    if (result.status !== "success") {
      return NextResponse.json(
        { error: result.error || "PDF generation failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ pdf_base64: result.pdf_base64 });
  } catch (err) {
    console.error("create-booking route error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
