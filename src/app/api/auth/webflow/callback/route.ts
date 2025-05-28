import { NextResponse } from "next/server";
import { getWebflowAccessToken } from "@/lib/webflow-auth";

// Remove edge runtime for OpenNext Cloudflare compatibility
// export const runtime = "edge";

// Helper function to create response with headers
function createRedirectResponse(
  location: string,
  options?: {
    accessToken?: string;
    status?: number;
  }
) {
  const headers: Record<string, string> = {
    Location: location,
  };

  if (options?.accessToken) {
    headers["Set-Cookie"] = `webflow_access_token=${
      options.accessToken
    }; HttpOnly; ${
      process.env.NODE_ENV === "production" ? "Secure; " : ""
    }SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 7}`; // 1 week
  }

  return new NextResponse(null, {
    status: options?.status || 302,
    headers,
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");

  if (error) {
    return createRedirectResponse(
      `/auth-error?error=${encodeURIComponent(error)}`
    );
  }

  if (!code) {
    return createRedirectResponse(
      `/auth-error?error=${encodeURIComponent("No code provided")}`
    );
  }

  if (state !== "webflow-auth-state") {
    return createRedirectResponse(
      `/auth-error?error=${encodeURIComponent("Invalid state")}`
    );
  }

  try {
    const accessToken = await getWebflowAccessToken(code);
    return createRedirectResponse("/dashboard", { accessToken });
  } catch (error) {
    console.error("Error in Webflow callback:", error);
    return createRedirectResponse(
      `/auth-error?error=${encodeURIComponent("Failed to get access token")}`
    );
  }
}
