import { NextResponse } from "next/server";

export async function GET() {
  const origin = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const response = NextResponse.redirect(new URL("/dashboard", origin));
  response.cookies.set("guest-mode", "1", {
    httpOnly: false, // readable client-side for store init
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24h
  });
  return response;
}
