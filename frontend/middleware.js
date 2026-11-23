import { NextResponse } from "next/server";
import { auth } from "./auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  if (!session) {
    const url = new URL("/login", req.nextUrl);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }
  if (pathname.startsWith("/admin") && session.user?.role !== "admin") {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }
});

export const config = {
matcher: ["/chat/:path*", "/summary/:path*", "/quiz/:path*", "/documents/:path*", "/profile/:path*", "/admin/:path*"],};