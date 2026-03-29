import { AppError } from "@/lib/http";
import { getRedis } from "@/lib/redis";

const memoryStore = new Map<string, { count: number; resetAt: number }>();

export const AI_LIMITS = {
  "parse-request": { maxPerUser: 10, windowMinutes: 60 },
  "match-professionals": { maxPerUser: 5, windowMinutes: 60 },
  "suggest-price": { maxPerUser: 20, windowMinutes: 60 },
  moderate: { maxPerUser: 100, windowMinutes: 60 },
  "analyze-image": { maxPerUser: 10, windowMinutes: 60 },
  translate: { maxPerUser: 50, windowMinutes: 60 },
  "summarize-project": { maxPerUser: 30, windowMinutes: 60 },
  embed: { maxPerUser: 40, windowMinutes: 60 },
} as const;

export type AIRateLimitKey = keyof typeof AI_LIMITS;

export async function enforceAiRateLimit(
  scope: string,
  action: AIRateLimitKey,
): Promise<void> {
  const rule = AI_LIMITS[action];
  const ttl = rule.windowMinutes * 60;
  const key = `ai:${action}:${scope}`;
  const redis = await getRedis();

  if (redis) {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, ttl);
    }

    if (count > rule.maxPerUser) {
      throw new AppError(429, "Твърде много AI заявки. Опитайте отново след малко.");
    }

    return;
  }

  const now = Date.now();
  const existing = memoryStore.get(key);
  if (!existing || existing.resetAt <= now) {
    memoryStore.set(key, { count: 1, resetAt: now + ttl * 1000 });
    return;
  }

  existing.count += 1;
  if (existing.count > rule.maxPerUser) {
    throw new AppError(429, "Твърде много AI заявки. Опитайте отново след малко.");
  }
}
