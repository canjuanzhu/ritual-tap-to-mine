import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/auth — login with Twitter ID + wallet address
export async function POST(req: NextRequest) {
  try {
    const { twitterId, walletAddress } = await req.json();

    if (!twitterId || !walletAddress) {
      return NextResponse.json(
        { error: "Twitter ID and wallet address are required" },
        { status: 400 }
      );
    }

    // normalize twitter handle (strip @, lowercase)
    const cleanTwitter = twitterId.trim().replace(/^@/, "").toLowerCase();
    const cleanWallet = walletAddress.trim().toLowerCase();

    if (!/^0x[a-f0-9]{40}$/.test(cleanWallet)) {
      return NextResponse.json(
        { error: "Invalid wallet address format" },
        { status: 400 }
      );
    }

    // try by twitterId first; if wallet mismatch, error; if found, log in
    let user = await db.user.findUnique({
      where: { twitterId: cleanTwitter },
    });

    if (user) {
      if (user.walletAddress !== cleanWallet) {
        return NextResponse.json(
          {
            error:
              "This Twitter ID is already linked to a different wallet. Use the original wallet or pick another Twitter handle.",
          },
          { status: 409 }
        );
      }
    } else {
      // check wallet not used by another twitter
      const walletUsed = await db.user.findUnique({
        where: { walletAddress: cleanWallet },
      });
      if (walletUsed) {
        return NextResponse.json(
          {
            error:
              "This wallet is already linked to another Twitter ID. Log in with that Twitter handle instead.",
          },
          { status: 409 }
        );
      }
      user = await db.user.create({
        data: {
          twitterId: cleanTwitter,
          walletAddress: cleanWallet,
          energy: 100,
        },
      });
      // auto-grant free S1 miner to new users
      await db.miner.create({
        data: {
          userId: user.id,
          tier: "S1",
          hashPower: 1,
          isFree: true,
          active: true,
        },
      });
    }

    return NextResponse.json({
      userId: user.id,
      twitterId: user.twitterId,
      walletAddress: user.walletAddress,
      createdAt: user.createdAt,
    });
  } catch (e) {
    console.error("[auth] error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
