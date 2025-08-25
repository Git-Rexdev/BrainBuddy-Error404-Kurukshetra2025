// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_ROUTES = ["/login", "/register"];

export function middleware(req: NextRequest) {
  const { pathname, origin } = req.nextUrl;
  const token = req.cookies.get("bb_token")?.value;

  const isAuthRoute = AUTH_ROUTES.some((p) => pathname.startsWith(p));

  // If not logged in -> force to /login (except on /login, /register)
  if (!token && !isAuthRoute) {
    const url = new URL("/login", origin);
    url.searchParams.set("next", pathname); // optional: keep where they were going
    return NextResponse.redirect(url);
  }

  // If logged in and tries to access /login or /register -> go to /dashboard
  if (token && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", origin));
  }

  // Optionally also route "/" -> dashboard or login
  if (pathname === "/") {
    return NextResponse.redirect(new URL(token ? "/dashboard" : "/login", origin));
  }

  return NextResponse.next();
}

// Match all paths except Next internals, API routes, and files with extensions.
export const config = {
  matcher: [
    "/((?!_next|_vercel|api|favicon.ico|assets|.*\\..*).*)",
  ],
};
