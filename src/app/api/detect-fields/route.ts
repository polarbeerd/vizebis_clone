import { NextRequest, NextResponse } from "next/server";

const PDF_SERVICE_URL = process.env.PDF_SERVICE_URL || "http://localhost:8000";
const PDF_SERVICE_API_KEY = process.env.PDF_SERVICE_API_KEY || "";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { status: "error", error: "No file uploaded" },
        { status: 400 }
      );
    }

    // Forward to PDF service
    const proxyForm = new FormData();
    proxyForm.append("file", file);

    const resp = await fetch(`${PDF_SERVICE_URL}/detect-fields`, {
      method: "POST",
      headers: {
        ...(PDF_SERVICE_API_KEY ? { "x-api-key": PDF_SERVICE_API_KEY } : {}),
      },
      body: proxyForm,
    });

    const result = await resp.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("detect-fields proxy error:", error);
    return NextResponse.json(
      { status: "error", error: String(error) },
      { status: 500 }
    );
  }
}
