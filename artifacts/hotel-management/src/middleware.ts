import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // If visiting /guest-portal root, redirect immediately to the Landing Page
  // Allow active guest portal pages: /guest-portal/services, /guest-portal/register, and /guest-portal/login
  if (
    pathname === "/guest-portal" ||
    pathname === "/guest-portal/" ||
    (pathname.startsWith("/guest-portal") &&
      !pathname.startsWith("/guest-portal/register") &&
      !pathname.startsWith("/guest-portal/login") &&
      !pathname.startsWith("/guest-portal/services"))
  ) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/guest-portal/:path*"],
};
