import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { wrapInA4Template } from "@/lib/generate-documents";

const PDF_SERVICE_URL = process.env.PDF_SERVICE_URL || "http://localhost:8000";
const PDF_SERVICE_API_KEY = process.env.PDF_SERVICE_API_KEY || "";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { documentId, html } = await req.json();

    if (!documentId || !html) {
      return NextResponse.json(
        { error: "documentId and html are required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Fetch the existing document record
    const { data: doc, error: docError } = await supabase
      .from("generated_documents")
      .select("id, application_id, file_path")
      .eq("id", documentId)
      .eq("type", "letter_of_intent")
      .single();

    if (docError || !doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Wrap HTML in A4 template and convert to PDF
    const fullHtml = wrapInA4Template(html);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    let pdfResponse: Response;
    try {
      pdfResponse = await fetch(`${PDF_SERVICE_URL}/html-to-pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(PDF_SERVICE_API_KEY ? { "x-api-key": PDF_SERVICE_API_KEY } : {}),
        },
        body: JSON.stringify({ html: fullHtml }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!pdfResponse.ok) {
      throw new Error(`PDF service returned ${pdfResponse.status}`);
    }

    const pdfResult = await pdfResponse.json();
    if (pdfResult.status !== "success") {
      throw new Error(pdfResult.error || "PDF conversion failed");
    }

    // Upload PDF to storage (upsert)
    const pdfBuffer = Buffer.from(pdfResult.pdf_base64, "base64");
    const storagePath = `${doc.application_id}/letter-of-intent.pdf`;

    const { error: uploadError } = await supabase.storage
      .from("generated-docs")
      .upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Update DB record with new content + file_path
    await supabase
      .from("generated_documents")
      .update({
        content: html,
        file_path: storagePath,
        updated_at: new Date().toISOString(),
      })
      .eq("id", documentId);

    return NextResponse.json({ status: "done" });
  } catch (err) {
    console.error("Letter PDF regeneration failed:", err);
    return NextResponse.json(
      { error: "PDF regeneration failed", details: String(err) },
      { status: 500 }
    );
  }
}
