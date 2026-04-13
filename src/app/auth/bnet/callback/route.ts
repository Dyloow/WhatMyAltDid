import { type NextRequest, NextResponse } from "next/server";

export function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const target = new URL(
    "/api/auth/callback/battlenet",
    request.nextUrl.origin
  );
  searchParams.forEach((value, key) => {
    target.searchParams.set(key, value);
  });
  return NextResponse.redirect(target);
}
