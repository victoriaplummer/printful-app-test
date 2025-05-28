import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/auth/oauth";
import { getOrCreateSession } from "@/lib/auth/session";
import { storeSessionTokens } from "@/lib/auth/session-tokens";

export async function GET(request: NextRequest) {
  try {
    const { session, response: sessionResponse } = await getOrCreateSession(
      request
    );

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      console.error("Printful OAuth error:", error);
      return NextResponse.redirect(
        new URL(
          `/?error=printful_auth_failed&details=${encodeURIComponent(error)}`,
          request.url
        )
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/?error=missing_code", request.url)
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens("printful", code);

    // Store tokens in session
    await storeSessionTokens(session.sessionId, "printful", tokens);

    // Redirect back to app
    const redirectUrl = new URL("/", request.url);
    redirectUrl.searchParams.set("printful_success", "true");

    const response = NextResponse.redirect(redirectUrl);

    // Set session cookie if this is a new session
    if (sessionResponse) {
      const sessionCookie = sessionResponse.cookies.get("session_id");
      if (sessionCookie) {
        response.cookies.set(sessionCookie);
      }
    }

    return response;
  } catch (error) {
    console.error("Printful callback error:", error);
    return NextResponse.redirect(
      new URL(
        `/?error=printful_callback_failed&details=${encodeURIComponent(
          String(error)
        )}`,
        request.url
      )
    );
  }
}
