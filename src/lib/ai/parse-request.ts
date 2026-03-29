import { chatWithFallback } from "@/lib/ai/gateway";

const PARSE_SYSTEM_PROMPT = `You are Atelier's intake parser. Extract a structured JSON object with:
- category
- subCategory
- interpretation
- suggestedBudget
- suggestedTimeline
- urgency (URGENT, STANDARD, or PLANNED)
Return JSON only.`;

export async function parseRequest(description: string) {
  const response = await chatWithFallback({
    jsonMode: true,
    maxTokens: 1024,
    messages: [
      { role: "system", content: PARSE_SYSTEM_PROMPT },
      { role: "user", content: description },
    ],
  });

  return JSON.parse(response.text) as {
    category?: string;
    subCategory?: string;
    interpretation?: string;
    suggestedBudget?: string;
    suggestedTimeline?: string;
    urgency?: "URGENT" | "STANDARD" | "PLANNED";
  };
}
