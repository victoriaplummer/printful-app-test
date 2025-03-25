import { NextResponse } from "next/server";
import { getWebflowAccessToken } from "@/lib/webflow-auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");

  if (error) {
    return NextResponse.redirect(
      `/auth-error?error=${encodeURIComponent(error)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `/auth-error?error=${encodeURIComponent("No code provided")}`
    );
  }

  if (state !== "webflow-auth-state") {
    return NextResponse.redirect(
      `/auth-error?error=${encodeURIComponent("Invalid state")}`
    );
  }

  try {
    const accessToken = await getWebflowAccessToken(code);

    // Store the access token in a secure way (e.g., in a session or encrypted cookie)
    const response = NextResponse.redirect("/dashboard");
    response.cookies.set("webflow_access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    return response;
  } catch (error) {
    console.error("Error in Webflow callback:", error);
    return NextResponse.redirect(
      `/auth-error?error=${encodeURIComponent("Failed to get access token")}`
    );
  }
}
