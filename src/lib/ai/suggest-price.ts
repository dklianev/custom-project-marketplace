import { chatWithFallback } from "@/lib/ai/gateway";

export async function suggestPrice(input: {
  category: string;
  area?: string;
  location?: string;
  scope: string;
  similarOffers?: { price: number; timeline: number }[];
}) {
  const response = await chatWithFallback({
    jsonMode: true,
    maxTokens: 512,
    messages: [
      {
        role: "system",
        content:
          'Return JSON with { "minPrice": number, "maxPrice": number, "averagePrice": number, "suggestedTimeline": number, "confidence": number, "reasoning": string }',
      },
      { role: "user", content: JSON.stringify(input) },
    ],
  });

  return JSON.parse(response.text) as {
    minPrice: number;
    maxPrice: number;
    averagePrice: number;
    suggestedTimeline: number;
    confidence: number;
    reasoning: string;
  };
}
