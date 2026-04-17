import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isProtected = req.nextUrl.pathname.startsWith("/dashboard");
  const isGuest = req.cookies.get("guest-mode")?.value === "1";

  if (isProtected && !req.auth && !isGuest) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
