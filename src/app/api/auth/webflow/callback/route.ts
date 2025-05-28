import { NextResponse } from "next/server";
import { getWebflowAccessToken } from "@/lib/webflow-auth";

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");

  if (error) {
    return new NextResponse(null, {
      status: 302,
      headers: {
        Location: `/auth-error?error=${encodeURIComponent(error)}`,
      },
    });
  }

  if (!code) {
    return new NextResponse(null, {
      status: 302,
      headers: {
        Location: `/auth-error?error=${encodeURIComponent("No code provided")}`,
      },
    });
  }

  if (state !== "webflow-auth-state") {
    return new NextResponse(null, {
      status: 302,
      headers: {
        Location: `/auth-error?error=${encodeURIComponent("Invalid state")}`,
      },
    });
  }

  try {
    const accessToken = await getWebflowAccessToken(code);

    // Create a new response with redirect
    const response = new NextResponse(null, {
      status: 302,
      headers: {
        Location: "/dashboard",
      },
    });

    // Set cookie on the new response
    response.cookies.set("webflow_access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Error in Webflow callback:", error);
    return new NextResponse(null, {
      status: 302,
      headers: {
        Location: `/auth-error?error=${encodeURIComponent(
          "Failed to get access token"
        )}`,
      },
    });
  }
}
