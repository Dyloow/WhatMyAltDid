import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isProtected = req.nextUrl.pathname.startsWith("/dashboard");
  if (isProtected && !req.auth) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
