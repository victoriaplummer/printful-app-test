import { NextResponse } from "next/server";
import { getWebflowAccessToken } from "@/lib/webflow-auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const { searchParams } = url;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");

  // Force the basePath to be /printful
  const basePath = "/printful";
  const origin = url.origin;

  // Log detailed redirect information
  console.log("Webflow callback processing:", {
    currentUrl: request.url,
    origin,
    basePath,
  });

  if (error) {
    const redirectUrl = `${origin}${basePath}/auth-error?error=${encodeURIComponent(
      error
    )}`;
    console.log("Redirecting to:", redirectUrl);
    return NextResponse.redirect(redirectUrl);
  }

  if (!code) {
    const redirectUrl = `${origin}${basePath}/auth-error?error=${encodeURIComponent(
      "No code provided"
    )}`;
    console.log("Redirecting to:", redirectUrl);
    return NextResponse.redirect(redirectUrl);
  }

  if (state !== "webflow-auth-state") {
    const redirectUrl = `${origin}${basePath}/auth-error?error=${encodeURIComponent(
      "Invalid state"
    )}`;
    console.log("Redirecting to:", redirectUrl);
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const accessToken = await getWebflowAccessToken(code);

    // Store the access token and redirect to dashboard with /printful prefix
    const redirectUrl = `${origin}${basePath}/dashboard`;
    console.log("Authentication successful, redirecting to:", redirectUrl);

    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set("webflow_access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    return response;
  } catch (error) {
    console.error("Error in Webflow callback:", error);
    const redirectUrl = `${origin}${basePath}/auth-error?error=${encodeURIComponent(
      "Failed to get access token"
    )}`;
    console.log("Redirecting to:", redirectUrl);
    return NextResponse.redirect(redirectUrl);
  }
}
