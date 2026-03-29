import { visionAnalysis } from "@/lib/ai/gateway";

export async function analyzePortfolioImage(imageUrl: string) {
  const response = await visionAnalysis({
    imageUrl,
    jsonMode: true,
    prompt:
      "Analyze this portfolio image for a creative marketplace. Return JSON with quality, relevance, category, tags, and approved.",
  });

  return JSON.parse(response.text) as {
    quality?: number;
    relevance?: number;
    category?: string;
    tags?: string[];
    approved?: boolean;
  };
}

export async function verifyDocument(
  imageUrl: string,
  docType: "id_card" | "passport",
) {
  const response = await visionAnalysis({
    imageUrl,
    jsonMode: true,
    maxTokens: 300,
    prompt: `Check whether this ${docType} image is readable and formatted correctly. Return JSON with readable, validFormat, and issues.`,
  });

  return JSON.parse(response.text) as {
    readable?: boolean;
    validFormat?: boolean;
    issues?: string[];
  };
}
