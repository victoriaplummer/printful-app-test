import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Define routes that require authentication
const isProtectedRoute = createRouteMatcher([
  "/products(.*)",
  "/account(.*)",
  "/orders(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // Handle Clerk JWT redirects that don't include the cosmic base path
  const url = req.nextUrl.clone();

  // If we're at the root with a Clerk JWT and no cosmic prefix, redirect to cosmic
  if (url.pathname === "/" && url.searchParams.has("__clerk_db_jwt")) {
    url.pathname = "/cosmic";
    return NextResponse.redirect(url);
  }

  // Protect routes that require authentication
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
