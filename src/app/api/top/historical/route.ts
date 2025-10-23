import { NextResponse } from "next/server";
import { getRedis } from "@core/cache/redis";
import {
  computeHistoricalTop,
  HISTORICAL_TOP_CACHE_KEY,
  HISTORICAL_TOP_TTL_MS,
} from "@dj/lib/top";

interface CachePayload {
  data: Awaited<ReturnType<typeof computeHistoricalTop>>;
  updatedAt: number;
}

export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const redisClient = getRedis();
    if (redisClient) {
      const cached = await redisClient.get<CachePayload>(
        HISTORICAL_TOP_CACHE_KEY
      );
      if (cached?.data) {
        return NextResponse.json(cached);
      }
    }

    const data = await computeHistoricalTop();
    const payload: CachePayload = { data, updatedAt: Date.now() };

    const redisForWrite = getRedis();
    if (redisForWrite) {
      await redisForWrite.set(HISTORICAL_TOP_CACHE_KEY, payload, {
        px: HISTORICAL_TOP_TTL_MS,
      });
    }

    return NextResponse.json(payload);
  } catch (err) {
    console.error("Error fetching historical top:", err);
    return NextResponse.json(
      { error: "Unable to load historical top" },
      { status: 500 }
    );
  }
}

