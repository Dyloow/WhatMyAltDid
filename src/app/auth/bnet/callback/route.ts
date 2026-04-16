import { type NextRequest, NextResponse } from "next/server";

export function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const baseUrl = process.env.NEXTAUTH_URL ?? (host ? `${proto}://${host}` : request.nextUrl.origin);
  const target = new URL("/api/auth/callback/battlenet", baseUrl);
  searchParams.forEach((value, key) => {
    target.searchParams.set(key, value);
  });
  return NextResponse.redirect(target);
}
