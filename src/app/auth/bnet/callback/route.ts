import { type NextRequest, NextResponse } from "next/server";

export function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const baseUrl = process.env.NEXTAUTH_URL ?? request.nextUrl.origin;
  const target = new URL("/api/auth/callback/battlenet", baseUrl);
  searchParams.forEach((value, key) => {
    target.searchParams.set(key, value);
  });
  return NextResponse.redirect(target);
}
