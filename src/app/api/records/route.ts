import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/records?userId=...&limit=50
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  const limit = Number(req.nextUrl.searchParams.get("limit") || 50);
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const records = await db.miningRecord.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 200),
  });

  return NextResponse.json({
    records: records.map((r) => ({
      id: r.id,
      minerTier: r.minerTier,
      ritualBtcWon: r.ritualBtcWon,
      action: r.action,
      blockHeight: r.blockHeight,
      createdAt: r.createdAt,
    })),
  });
}
