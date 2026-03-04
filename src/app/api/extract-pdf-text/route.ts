import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";

const PDF_SERVICE_URL = process.env.PDF_SERVICE_URL || "http://localhost:8000";
const PDF_SERVICE_API_KEY = process.env.PDF_SERVICE_API_KEY || "";

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Forward the file to the Python sidecar
    const proxyForm = new FormData();
    proxyForm.append("file", file);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    let response: Response;
    try {
      response = await fetch(`${PDF_SERVICE_URL}/extract-text`, {
        method: "POST",
        headers: {
          ...(PDF_SERVICE_API_KEY ? { "x-api-key": PDF_SERVICE_API_KEY } : {}),
        },
        body: proxyForm,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new Error(`PDF service returned ${response.status}`);
    }

    const result = await response.json();

    if (result.status !== "success") {
      throw new Error(result.error || "Text extraction failed");
    }

    return NextResponse.json({ text: result.text });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to extract text from PDF", details: String(error) },
      { status: 500 }
    );
  }
}
