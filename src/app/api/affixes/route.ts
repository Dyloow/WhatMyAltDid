import { getCurrentAffixes } from "@/lib/raiderio-api";
import { NextRequest, NextResponse } from "next/server";

const VALID_LOCALES = ["en", "fr", "de", "es", "pt", "it", "ru", "ko", "zh"];

export async function GET(req: NextRequest) {
  try {
    const locale = req.nextUrl.searchParams.get("locale") ?? "en";
    const safeLocale = VALID_LOCALES.includes(locale) ? locale : "en";
    const affixes = await getCurrentAffixes("eu", safeLocale);
    return NextResponse.json(affixes);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
