import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@core/cache/redis";
import {
  computeHistoricalTop,
  HISTORICAL_TOP_CACHE_KEY,
  HISTORICAL_TOP_TTL_MS,
} from "@dj/lib/top";

const CRON_SECRET = process.env.CRON_TOP_SECRET ?? process.env.CRON_SECRET;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  if (!CRON_SECRET) {
    console.warn("CRON secret is not set; refusing historical rebuild request.");
    return NextResponse.json(
      { error: "cron-secret-not-configured" },
      { status: 500 }
    );
  }

  const auth = req.headers.get("authorization") || "";
  if (auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const data = await computeHistoricalTop();
    const payload = { data, updatedAt: Date.now() };
    const redis = getRedis();
    if (redis) {
      await redis.set(HISTORICAL_TOP_CACHE_KEY, payload, {
        px: HISTORICAL_TOP_TTL_MS,
      });
    }
    return NextResponse.json({
      ok: true,
      updatedAt: payload.updatedAt,
      count: data.length,
      cached: Boolean(redis),
    });
  } catch (err) {
    console.error("Error rebuilding historical top:", err);
    return NextResponse.json(
      { error: "rebuild_failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}

