import { NextRequest, NextResponse } from "next/server";
import { isUsingMemoryStore, memStore } from "@/lib/memory-store";

// GET /api/leaderboard?limit=20
export async function GET(req: NextRequest) {
  const limit = Number(req.nextUrl.searchParams.get("limit") || 20);

  if (isUsingMemoryStore()) {
    const top = Array.from(memStore.users.values())
      .sort((a, b) => b.totalRitualBtc - a.totalRitualBtc)
      .slice(0, Math.min(limit, 100))
      .map((u, i) => ({
        rank: i + 1,
        twitterId: u.twitterId,
        totalRitualBtc: u.totalRitualBtc,
        totalTaps: u.totalTaps,
        isYou: false,
      }));
    return NextResponse.json({ leaderboard: top });
  }

  const { db } = await import("@/lib/db");
  const top = await db.user.findMany({
    orderBy: { totalRitualBtc: "desc" },
    take: Math.min(limit, 100),
    select: {
      id: true,
      twitterId: true,
      totalRitualBtc: true,
      totalTaps: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    leaderboard: top.map((u, i) => ({
      rank: i + 1,
      twitterId: u.twitterId,
      totalRitualBtc: u.totalRitualBtc,
      totalTaps: u.totalTaps,
      isYou: false,
    })),
  });
}
