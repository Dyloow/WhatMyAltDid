import { getCurrentAffixes } from "@/lib/raiderio-api";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const affixes = await getCurrentAffixes("eu");
    return NextResponse.json(affixes);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
