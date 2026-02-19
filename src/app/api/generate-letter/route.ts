import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { systemPrompt, examples, applicationData } = await req.json();
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not set" }, { status: 500 });
  }

  const prompt = buildPrompt(systemPrompt, examples, applicationData);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      return NextResponse.json(
        { error: `Gemini API error: ${response.status}`, details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return NextResponse.json({ html: text });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to call Gemini API", details: String(error) },
      { status: 500 }
    );
  }
}

function buildPrompt(
  systemPrompt: string,
  examples: string[],
  appData: Record<string, unknown>
): string {
  let prompt = systemPrompt + "\n\n";

  if (examples.length > 0) {
    prompt += "Here are examples of successful letters of intent:\n\n";
    examples.forEach((ex, i) => {
      prompt += `--- Example ${i + 1} ---\n${ex}\n\n`;
    });
  }

  prompt += "--- Application Data ---\n";
  prompt += JSON.stringify(appData, null, 2) + "\n\n";
  prompt +=
    "Write a letter of intent for this applicant based on the examples above. Output as clean HTML with <p>, <strong>, <em> tags only. Do not include markdown formatting.";
  return prompt;
}
