import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE_NAME = "fmcg_session";

function getJwtSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET || "demo-insecure-secret-key-change-in-production-min-32-chars-long";
  return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Bypass public assets and auth endpoints
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/products") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/manifest.json") ||
    pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

  // 1b. If on /login with an already valid session, redirect into app
  if (pathname === "/login") {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (sessionCookie) {
      try {
        const { payload } = await jwtVerify(sessionCookie, getJwtSecret());
        const role = payload.role as string;
        return NextResponse.redirect(new URL(role === "desk" ? "/desk" : "/catalogue", request.url));
      } catch {
        // Token invalid or expired, continue to login page
      }
    }
    return NextResponse.next();
  }

  // 2. Read session cookie
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("returnTo", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // 3. Verify JWT
  try {
    const { payload } = await jwtVerify(sessionCookie, getJwtSecret());
    const role = payload.role as string;

    // Handle root / redirect
    if (pathname === "/") {
      if (role === "desk") {
        return NextResponse.redirect(new URL("/desk", request.url));
      } else {
        return NextResponse.redirect(new URL("/catalogue", request.url));
      }
    }

    // Role-based route protection
    // Desk routes are restricted to desk role
    if (pathname.startsWith("/desk")) {
      if (role !== "desk") {
        return NextResponse.redirect(new URL("/catalogue", request.url));
      }
    }

    // Retailer routes are restricted to retailer role
    if (
      pathname.startsWith("/catalogue") ||
      pathname.startsWith("/cart") ||
      pathname.startsWith("/orders") ||
      pathname.startsWith("/capture")
    ) {
      if (role === "desk") {
        return NextResponse.redirect(new URL("/desk", request.url));
      }
    }

    return NextResponse.next();
  } catch {
    // Tampered or expired token
    const loginUrl = new URL("/login", request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|products/).*)",
  ],
};

