import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Skip static files, api routes, next internal routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") // static assets like favicon.ico, images, etc.
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("rm_token")?.value;

  let role: string | null = null;
  let isExpired = false;

  if (token) {
    if (token === "mock-admin-token") {
      role = "admin";
    } else if (token === "mock-referee-token") {
      role = "referee";
    } else {
      try {
        const parts = token.split(".");
        if (parts.length === 3) {
          const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
          // atob works in Next.js Edge Runtime
          const decoded = JSON.parse(atob(base64));
          role = decoded.role || null;
          if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
            isExpired = true;
          }
        } else {
          isExpired = true;
        }
      } catch {
        isExpired = true;
      }
    }
  }

  const isAuthValid = !!token && !isExpired && !!role;

  // If user is at /login
  if (pathname === "/login") {
    if (isAuthValid) {
      // Check if "next" query param exists and is allowed for this role
      const nextParam = request.nextUrl.searchParams.get("next");
      if (nextParam && nextParam.startsWith("/")) {
        if (role === "admin" && !nextParam.startsWith("/referee")) {
          return NextResponse.redirect(new URL(nextParam, request.url));
        }
        if (role === "referee" && !nextParam.startsWith("/admin")) {
          return NextResponse.redirect(new URL(nextParam, request.url));
        }
      }
      return NextResponse.redirect(new URL(role === "admin" ? "/admin" : "/referee", request.url));
    }
    return NextResponse.next();
  }

  // If not authenticated or expired, redirect to /login?next=<path>
  if (!isAuthValid) {
    const nextPath = encodeURIComponent(pathname + search);
    return NextResponse.redirect(new URL(`/login?next=${nextPath}`, request.url));
  }

  // Role checks
  if (pathname === "/") {
    return NextResponse.redirect(new URL(role === "admin" ? "/admin" : "/referee", request.url));
  }

  if (pathname.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(new URL("/referee", request.url));
  }

  if (pathname.startsWith("/referee") && role !== "referee") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
