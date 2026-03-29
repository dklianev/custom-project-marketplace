import type { Prisma } from "@prisma/client";
import { chatWithFallback, generateEmbedding } from "@/lib/ai/gateway";
import { prisma } from "@/lib/prisma";

async function findSimilarProfessionals(
  embedding: number[],
  limit = 10,
): Promise<Prisma.JsonValue[]> {
  const vector = `[${embedding.join(",")}]`;
  return prisma.$queryRaw<Prisma.JsonValue[]>`
    SELECT id, name, skills, rating, location,
           1 - (embedding <=> ${vector}::vector) as similarity
    FROM users
    WHERE role = 'PROFESSIONAL' AND verified = true AND embedding IS NOT NULL
    ORDER BY embedding <=> ${vector}::vector
    LIMIT ${limit}
  `;
}

export async function matchProfessionals(input: {
  description: string;
  category: string;
  budget?: string;
  location?: string;
}) {
  const { embedding } = await generateEmbedding(
    `${input.category} ${input.description} ${input.location ?? ""}`.trim(),
  );

  let candidates: Prisma.JsonValue[] = [];
  try {
    candidates = await findSimilarProfessionals(embedding, 10);
  } catch (error) {
    console.warn(
      "[ai.match-professionals] vector search unavailable, falling back to rating sort",
      error,
    );
    const fallback = await prisma.user.findMany({
      where: {
        role: "PROFESSIONAL",
        verified: true,
      },
      orderBy: [{ rating: "desc" }, { reviewCount: "desc" }],
      take: 10,
      select: {
        id: true,
        name: true,
        skills: true,
        rating: true,
        location: true,
      },
    });
    candidates = fallback as Prisma.JsonValue[];
  }

  const response = await chatWithFallback({
    jsonMode: true,
    maxTokens: 2048,
    messages: [
      {
        role: "system",
        content:
          'Rank the best professionals for the request. Return JSON: { "matches": [{ "professionalId": string, "score": number, "reason": string, "estimatedPrice": string }] }',
      },
      { role: "user", content: JSON.stringify({ request: input, candidates }) },
    ],
  });

  return JSON.parse(response.text) as {
    matches: Array<{
      professionalId: string;
      score: number;
      reason: string;
      estimatedPrice?: string;
    }>;
  };
}
