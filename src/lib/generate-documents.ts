import { createServiceClient } from "@/lib/supabase/service";
import { fetchFxRates } from "@/lib/fx-rates";

const PDF_SERVICE_URL = process.env.PDF_SERVICE_URL || "http://localhost:8000";
const PDF_SERVICE_API_KEY = process.env.PDF_SERVICE_API_KEY || "";

interface GenerateOptions {
  hotelId?: string;
  type?: "booking" | "letter" | "all";
}

export function wrapInA4Template(innerHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  @page {
    size: A4;
    margin: 2.5cm;
  }
  body {
    font-family: "Georgia", "Times New Roman", serif;
    font-size: 11pt;
    line-height: 1.5;
    color: #1a1a1a;
    margin: 0;
    padding: 0;
  }
  p {
    margin-bottom: 0.6em;
    text-align: justify;
  }
  strong, b {
    font-weight: normal;
  }
  .date {
    text-align: right;
    margin-bottom: 1.5em;
  }
  .signature {
    margin-top: 1.5em;
  }
</style>
</head>
<body>
${innerHtml}
</body>
</html>`;
}

export async function generateDocumentsForApplication(
  applicationId: number,
  options: GenerateOptions = {}
) {
  const { hotelId, type = "all" } = options;
  const supabase = createServiceClient();

  // 1. Fetch application
  const { data: app, error: appError } = await supabase
    .from("applications")
    .select("*")
    .eq("id", applicationId)
    .single();

  if (appError || !app) {
    console.error("Failed to fetch application:", appError);
    return;
  }

  // 2. Run requested generation(s)
  if (type === "all") {
    // Run booking first, then letter with the hotel ID from booking
    const bookingHotelId = await generateBookingPdf(supabase, app, hotelId);
    if (bookingHotelId) {
      await generateLetterOfIntent(supabase, app, bookingHotelId);
    }
  } else if (type === "booking") {
    await generateBookingPdf(supabase, app, hotelId);
  } else if (type === "letter") {
    await generateLetterOfIntent(supabase, app, hotelId);
  }
}

/** Returns the hotel ID used, or undefined on failure */
async function generateBookingPdf(
  supabase: ReturnType<typeof createServiceClient>,
  app: Record<string, unknown>,
  sharedHotelId?: string
): Promise<string | undefined> {
  try {
    let hotel: Record<string, unknown>;

    if (sharedHotelId) {
      // Use pre-selected hotel (group submissions share one hotel)
      const { data: hotelData } = await supabase
        .from("booking_hotels")
        .select("*")
        .eq("id", sharedHotelId)
        .single();
      if (!hotelData) {
        console.warn("Shared hotel not found:", sharedHotelId);
        return undefined;
      }
      hotel = hotelData;
    } else {
      // Pick random active hotel, preferring one matching the application's country
      const country = app.country as string | undefined;

      let query = supabase
        .from("booking_hotels")
        .select("*")
        .eq("is_active", true);

      if (country) {
        query = query.eq("country", country);
      }

      const { data: hotels } = await query;

      // Fallback: if no country-matched hotels, try without country filter
      if (!hotels?.length && country) {
        const { data: fallbackHotels } = await supabase
          .from("booking_hotels")
          .select("*")
          .eq("is_active", true);

        if (!fallbackHotels?.length) {
          console.warn("No active hotels — skipping booking PDF");
          return undefined;
        }

        hotel = fallbackHotels[Math.floor(Math.random() * fallbackHotels.length)];
      } else if (!hotels?.length) {
        console.warn("No active hotels — skipping booking PDF");
        return undefined;
      } else {
        hotel = hotels[Math.floor(Math.random() * hotels.length)];
      }
    }

    // Create generating record
    const { data: doc, error: insertError } = await supabase
      .from("generated_documents")
      .insert({
        application_id: app.id as number,
        type: "booking_pdf",
        hotel_id: hotel.id,
        status: "generating",
        generated_by: "auto",
      })
      .select()
      .single();

    if (insertError || !doc) {
      console.error("Failed to create generated_documents row:", insertError);
      return undefined;
    }

    // Extract guest name and dates from application
    const guestName = (app.full_name as string) || "GUEST";
    const customFields = (app.custom_fields as Record<string, unknown>) || {};

    // Smart fields are stored under _smart key in custom_fields
    const smartFields = (customFields._smart as Record<string, unknown>) || {};

    // Try to get dates: smart field (_smart.travel_dates) → top-level travel_date → fallback
    const travelDates = smartFields.travel_dates as
      | { departure_date?: string; return_date?: string }
      | undefined;
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const checkinDate =
      travelDates?.departure_date ||
      (app.travel_date as string) ||
      (customFields.travel_date as string) ||
      nextWeek.toISOString().split("T")[0];

    // Use return_date from smart field, otherwise checkin + 7 days
    const checkin = new Date(checkinDate);
    const defaultCheckout = new Date(
      checkin.getTime() + 7 * 24 * 60 * 60 * 1000
    );
    const checkoutDate =
      travelDates?.return_date || defaultCheckout.toISOString().split("T")[0];

    // Calculate nights
    const checkout = new Date(checkoutDate);
    const nights = Math.max(
      1,
      Math.round(
        (checkout.getTime() - checkin.getTime()) / (24 * 60 * 60 * 1000)
      )
    );

    // Determine number of guests (group_id → count group members, otherwise 1)
    let numGuests = 1;
    const groupId = app.group_id as string | null;
    if (groupId) {
      const { count } = await supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .eq("group_id", groupId);
      if (count && count > 0) numGuests = count;
    }

    // Dynamic pricing from hotel.price_per_night_eur
    const pricePerNight = Number(hotel.price_per_night_eur) || 0;
    let priceTotalTl = 0;
    let priceTotalDkk = 0;
    let refundAmountTl = 0;

    if (pricePerNight > 0) {
      try {
        const rates = await fetchFxRates();
        const totalEur = pricePerNight * nights * numGuests;
        priceTotalTl = Math.round(totalEur * rates.EUR_TRY * 100) / 100;
        priceTotalDkk = Math.round(totalEur * rates.EUR_DKK * 100) / 100;
        refundAmountTl =
          nights > 1
            ? Math.round(priceTotalTl * ((nights - 1) / nights) * 100) / 100
            : 0;
      } catch (fxError) {
        console.warn("FX rate fetch failed, using zero prices:", fxError);
      }
    }

    // Call Python service (30s timeout)
    const pdfController = new AbortController();
    const pdfTimeout = setTimeout(() => pdfController.abort(), 30_000);

    let response: Response;
    try {
      response = await fetch(`${PDF_SERVICE_URL}/generate-booking`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(PDF_SERVICE_API_KEY ? { "x-api-key": PDF_SERVICE_API_KEY } : {}),
        },
        body: JSON.stringify({
          guest_name: guestName,
          guest_email: ((app.email as string) || "").toLowerCase(),
          checkin_date: checkinDate,
          checkout_date: checkoutDate,
          num_guests: numGuests,
          price_total_tl: priceTotalTl,
          price_total_dkk: priceTotalDkk,
          refund_amount_tl: refundAmountTl,
          hotel_config: hotel.hotel_config || {},
          hotel_record: { name: hotel.name as string },
        }),
        signal: pdfController.signal,
      });
    } finally {
      clearTimeout(pdfTimeout);
    }

    if (!response.ok) {
      throw new Error(`PDF service returned ${response.status}`);
    }

    const result = await response.json();

    if (result.status !== "success") {
      throw new Error(result.error || "PDF generation failed");
    }

    // Decode base64 and upload
    const pdfBuffer = Buffer.from(result.pdf_base64, "base64");
    const storagePath = `${app.id}/booking.pdf`;

    const { error: uploadError } = await supabase.storage
      .from("generated-docs")
      .upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Update record
    await supabase
      .from("generated_documents")
      .update({
        status: "ready",
        file_path: storagePath,
        updated_at: new Date().toISOString(),
      })
      .eq("id", doc.id);

    console.log(`Booking PDF generated for application ${app.id}`);
    return hotel.id as string;
  } catch (error) {
    console.error(
      `Booking PDF generation failed for application ${app.id}:`,
      error
    );

    // Try to update status to error
    await supabase
      .from("generated_documents")
      .update({
        status: "error",
        error_message: String(error),
        updated_at: new Date().toISOString(),
      })
      .eq("application_id", app.id as number)
      .eq("type", "booking_pdf")
      .eq("status", "generating");

    return undefined;
  }
}

async function generateLetterOfIntent(
  supabase: ReturnType<typeof createServiceClient>,
  app: Record<string, unknown>,
  hotelId?: string
) {
  try {
    // Create generating record
    const { data: doc, error: insertError } = await supabase
      .from("generated_documents")
      .insert({
        application_id: app.id as number,
        type: "letter_of_intent",
        status: "generating",
        generated_by: "auto",
      })
      .select()
      .single();

    if (insertError || !doc) {
      console.error("Failed to create generated_documents row:", insertError);
      return;
    }

    // Fetch hotel data if hotelId provided
    let hotelInfo: { name: string; address: string | null; city: string | null; country: string | null } | null = null;
    if (hotelId) {
      const { data: hotelData } = await supabase
        .from("booking_hotels")
        .select("name, address, city, country")
        .eq("id", hotelId)
        .single();
      if (hotelData) {
        hotelInfo = hotelData;
      }
    }

    // Extract travel dates (same logic as booking)
    const customFields = (app.custom_fields as Record<string, unknown>) || {};
    const smartFields = (customFields._smart as Record<string, unknown>) || {};
    const travelDates = smartFields.travel_dates as
      | { departure_date?: string; return_date?: string }
      | undefined;

    const checkinDate =
      travelDates?.departure_date ||
      (app.travel_date as string) ||
      (customFields.travel_date as string) ||
      "";
    const checkoutDate = travelDates?.return_date || "";

    // Fetch example letters (prefer matching country/visa, fallback to all)
    const country = app.country as string;
    const visaType = app.visa_type as string;

    let examples: string[] = [];

    // Try country+visa match first
    if (country && visaType) {
      const { data: matched } = await supabase
        .from("letter_intent_examples")
        .select("extracted_text")
        .eq("country", country)
        .eq("visa_type", visaType)
        .eq("is_active", true)
        .limit(3);

      if (matched?.length) {
        examples = matched
          .map((e) => e.extracted_text)
          .filter(Boolean) as string[];
      }
    }

    // Fallback to all active examples
    if (!examples.length) {
      const { data: allExamples } = await supabase
        .from("letter_intent_examples")
        .select("extracted_text")
        .eq("is_active", true)
        .limit(3);

      examples = (allExamples || [])
        .map((e) => e.extracted_text)
        .filter(Boolean) as string[];
    }

    // Build the system prompt
    const systemPrompt = `You are a visa consultant writing a letter of intent (motivation letter) for a visa application. Write a clear, straightforward letter that:
- Is addressed to the relevant consulate/embassy
- Clearly states the purpose of travel
- Mentions accommodation and travel dates if provided
- Uses simple, easy-to-read English (B1-B2 level, no fancy vocabulary or complex sentences)
- MUST fit on a single A4 page — keep it concise: 2-3 short paragraphs maximum
- Includes date, salutation, body paragraphs, and closing with signature line
- Uses ONLY plain <p> and <br> tags — absolutely NO <strong>, <b>, <em>, <i>, or any bold/italic formatting
- Do NOT use headers (h1, h2, etc.)
- Keep sentences short and direct. Avoid filler phrases and repetition.`;

    // Build application data for the prompt
    const applicationData: Record<string, unknown> = {
      full_name: app.full_name,
      country: app.country,
      visa_type: app.visa_type,
      email: app.email,
      phone: app.phone,
    };

    if (checkinDate) applicationData.travel_start = checkinDate;
    if (checkoutDate) applicationData.travel_end = checkoutDate;

    if (hotelInfo) {
      applicationData.accommodation = {
        hotel_name: hotelInfo.name,
        address: hotelInfo.address,
        city: hotelInfo.city,
        country: hotelInfo.country,
      };
    }

    // Include relevant custom fields (exclude _smart internals)
    const relevantCustom = { ...customFields };
    delete relevantCustom._smart;
    if (Object.keys(relevantCustom).length > 0) {
      applicationData.additional_info = relevantCustom;
    }

    // Build the full prompt for Gemini
    let prompt = `${systemPrompt}\n\n`;
    prompt += `Application Data:\n${JSON.stringify(applicationData, null, 2)}\n\n`;

    if (examples.length > 0) {
      prompt += `Here are example letters for reference (match the style and tone):\n\n`;
      examples.forEach((example, i) => {
        prompt += `--- Example ${i + 1} ---\n${example}\n\n`;
      });
    }

    prompt += `Generate a letter of intent in HTML format. Output ONLY the inner HTML content — do NOT include <html>, <head>, <body>, or <style> tags. Use ONLY <p> and <br> tags — no bold, italic, or any other formatting tags. The letter MUST fit on a single A4 page (2.5cm margins, 11pt font). Keep it short and direct: date on right, consulate address, salutation, 2-3 concise paragraphs, closing with signature. Use simple English throughout.`;

    // Call Gemini API directly
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const geminiController = new AbortController();
    const geminiTimeout = setTimeout(() => geminiController.abort(), 60_000);

    let geminiResponse: Response;
    try {
      geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.5, maxOutputTokens: 4096 },
          }),
          signal: geminiController.signal,
        }
      );
    } finally {
      clearTimeout(geminiTimeout);
    }

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      throw new Error(
        `Gemini API returned ${geminiResponse.status}: ${errorBody}`
      );
    }

    const geminiResult = await geminiResponse.json();
    let htmlContent =
      geminiResult?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!htmlContent) {
      throw new Error("Empty response from Gemini");
    }

    // Strip markdown code fences if Gemini wraps the output
    htmlContent = htmlContent
      .replace(/^```html?\s*\n?/i, "")
      .replace(/\n?```\s*$/i, "")
      .trim();

    // Convert HTML to PDF via Python service (mandatory — no HTML-only fallback)
    const fullHtml = wrapInA4Template(htmlContent);

    const pdfController = new AbortController();
    const pdfTimeout = setTimeout(() => pdfController.abort(), 30_000);

    let pdfResponse: Response;
    try {
      pdfResponse = await fetch(`${PDF_SERVICE_URL}/html-to-pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(PDF_SERVICE_API_KEY ? { "x-api-key": PDF_SERVICE_API_KEY } : {}),
        },
        body: JSON.stringify({ html: fullHtml }),
        signal: pdfController.signal,
      });
    } finally {
      clearTimeout(pdfTimeout);
    }

    if (!pdfResponse.ok) {
      throw new Error(`HTML-to-PDF service returned ${pdfResponse.status}`);
    }

    const pdfResult = await pdfResponse.json();
    if (pdfResult.status !== "success") {
      throw new Error(pdfResult.error || "PDF conversion failed");
    }

    const pdfBuffer = Buffer.from(pdfResult.pdf_base64, "base64");
    const storagePath = `${app.id}/letter-of-intent.pdf`;

    const { error: uploadError } = await supabase.storage
      .from("generated-docs")
      .upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Update record with content and PDF
    await supabase
      .from("generated_documents")
      .update({
        status: "ready",
        content: htmlContent,
        file_path: storagePath,
        updated_at: new Date().toISOString(),
      })
      .eq("id", doc.id);

    console.log(`Letter of intent generated for application ${app.id}`);
  } catch (error) {
    console.error(
      `Letter generation failed for application ${app.id}:`,
      error
    );

    await supabase
      .from("generated_documents")
      .update({
        status: "error",
        error_message: String(error),
        updated_at: new Date().toISOString(),
      })
      .eq("application_id", app.id as number)
      .eq("type", "letter_of_intent")
      .eq("status", "generating");
  }
}
