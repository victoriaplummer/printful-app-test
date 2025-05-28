import { NextRequest, NextResponse } from "next/server";
import { ensureSession } from "@/lib/auth/session";

export async function middleware(request: NextRequest) {
  // Only handle API routes that need sessions
  if (request.nextUrl.pathname.startsWith("/cosmic/api/")) {
    // Skip auth routes and session routes
    if (
      request.nextUrl.pathname.startsWith("/cosmic/api/auth/") ||
      request.nextUrl.pathname.startsWith("/cosmic/api/session")
    ) {
      return NextResponse.next();
    }

    // Ensure session exists for other API routes
    const { response } = await ensureSession(request);

    if (response) {
      // New session was created, return response with cookie
      return response;
    }

    // Session exists, continue
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
