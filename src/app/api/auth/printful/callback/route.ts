import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/auth/oauth";
import { auth } from "@clerk/nextjs/server";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.redirect(new URL("/cosmic/sign-in", request.url));
    }

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      console.error("Printful OAuth error:", error);
      return NextResponse.redirect(
        new URL(
          `/cosmic?error=printful_auth_failed&details=${encodeURIComponent(
            error
          )}`,
          request.url
        )
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/cosmic?error=missing_code", request.url)
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens("printful", code);

    // Store tokens in user metadata via client-side redirect
    // We'll pass the tokens as URL params for the client to handle
    const redirectUrl = new URL("/cosmic", request.url);
    redirectUrl.searchParams.set("printful_success", "true");
    redirectUrl.searchParams.set("printful_token", tokens.access_token);
    if (tokens.refresh_token) {
      redirectUrl.searchParams.set("printful_refresh", tokens.refresh_token);
    }
    if (tokens.expires_at) {
      redirectUrl.searchParams.set(
        "printful_expires",
        tokens.expires_at.toString()
      );
    }

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("Printful callback error:", error);
    return NextResponse.redirect(
      new URL(
        `/cosmic?error=printful_callback_failed&details=${encodeURIComponent(
          String(error)
        )}`,
        request.url
      )
    );
  }
}
