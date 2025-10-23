import { Redis } from "@upstash/redis";

let client: Redis | null = null;

function createClient(): Redis | null {
  const url = process.env.UPSTASH_KV_REST_API_URL || process.env.UPSTASH_KV_URL;
  const token =
    process.env.UPSTASH_KV_REST_API_TOKEN || process.env.UPSTASH_KV_REST_API_READ_ONLY_TOKEN;

  if (!url || !token) return null;

  return new Redis({
    url,
    token,
  });
}

export function getRedis(): Redis | null {
  if (client) return client;
  client = createClient();
  return client;
}

export type RedisClient = Redis;
