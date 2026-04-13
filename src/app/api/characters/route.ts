import { auth } from "@/lib/auth";
import { getAccountCharacters } from "@/lib/blizzard-api";
import { NextResponse } from "next/server";
import { CURRENT_SEASON } from "@/lib/season-config";

export async function GET() {
  const session = await auth();
  if (!session?.accessToken || !session.region) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const characters = await getAccountCharacters(
      session.region,
      session.accessToken
    );

    const filtered = characters.filter(
      (c) => c.level >= CURRENT_SEASON.maxLevel
    );

    return NextResponse.json(filtered);
  } catch (error) {
    console.error("Failed to fetch characters:", error);
    return NextResponse.json(
      { error: "Failed to fetch characters" },
      { status: 500 }
    );
  }
}
