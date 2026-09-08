// Lapis pertama: cegah halaman terbuka tanpa cookie session.
// Lapis kedua (role fresh dari DB) ada di withAuth/withPermission per API.

import { NextResponse, type NextRequest } from "next/server";

const CSRF_COOKIE = "bos_syams_csrf";

const PUBLIC_PATHS = ["/login", "/portal", "/api/auth", "/api/portal", "/api/health"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const response = NextResponse.next();
  applySecurityHeaders(response, req);
  if (!req.cookies.has(CSRF_COOKIE)) {
    response.cookies.set(CSRF_COOKIE, crypto.randomUUID(), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
  }

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return response;

  const cookieName = process.env.SESSION_COOKIE_NAME || "bos_syams_session";
  const hasSession = req.cookies.has(cookieName);

  if (!hasSession) {
    if (pathname.startsWith("/api/")) {
      const apiResponse = NextResponse.json(
        { error: "Belum login", type: "auth_required" },
        { status: 401 },
      );
      applySecurityHeaders(apiResponse, req);
      return apiResponse;
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("return_to", pathname);
    const redirect = NextResponse.redirect(url);
    applySecurityHeaders(redirect, req);
    return redirect;
  }

  return response;
}

function applySecurityHeaders(response: NextResponse, req: NextRequest) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  if (process.env.NODE_ENV === "production") response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

  const origin = req.headers.get("origin");
  if (origin) {
    const configured = process.env.APP_BASE_URL ? new URL(process.env.APP_BASE_URL).origin : req.nextUrl.origin;
    response.headers.set("Vary", "Origin");
    if (origin === configured) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Access-Control-Allow-Credentials", "true");
      response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
      response.headers.set("Access-Control-Allow-Headers", "Content-Type, X-CSRF-Token");
    }
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|manifest.json).*)"],
};
