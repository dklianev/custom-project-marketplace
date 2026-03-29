import { createClient } from "redis";

type AppRedisClient = ReturnType<typeof createClient>;

let redisPromise: Promise<AppRedisClient> | null = null;

export async function getRedis(): Promise<AppRedisClient | null> {
  const url = process.env.REDIS_URL;
  if (!url) {
    return null;
  }

  if (!redisPromise) {
    const client = createClient({ url });
    client.on("error", (error) => {
      console.error("[redis]", error);
    });

    redisPromise = client.connect().then(() => client);
  }

  return redisPromise;
}
