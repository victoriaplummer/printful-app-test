import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getOAuthTokens } from "@/lib/auth/server-tokens";
import { WebflowClient } from "webflow-api";

export const config = { runtime: "edge" };

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const { webflowTokens } = await getOAuthTokens(userId);

  if (!webflowTokens?.access_token) {
    return NextResponse.json(
      { error: "Webflow authentication required" },
      { status: 401 }
    );
  }

  try {
    const webflowClient = new WebflowClient({
      accessToken: webflowTokens.access_token,
    });

    const sites = await webflowClient.sites.list();
    return NextResponse.json({ result: sites.sites || [] });
  } catch (error) {
    console.error("Error fetching Webflow sites:", error);
    return NextResponse.json(
      { error: "Failed to fetch Webflow sites" },
      { status: 500 }
    );
  }
}
