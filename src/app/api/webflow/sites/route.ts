import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { getAllSessionTokens } from "@/lib/auth/session-tokens";
import { WebflowClient } from "webflow-api";

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Webflow sites API called");

    // Get session from request
    const session = getSessionFromRequest(request);
    console.log(
      "📋 Session:",
      session ? `Found session ${session.sessionId}` : "No session found"
    );

    if (!session) {
      console.log("❌ No session found, returning 401");
      return NextResponse.json({ error: "Session required" }, { status: 401 });
    }

    // Get tokens for this session
    console.log("🔑 Getting tokens for session:", session.sessionId);
    const { webflowTokens } = await getAllSessionTokens(session.sessionId);
    console.log(
      "🎫 Webflow tokens:",
      webflowTokens
        ? `Found tokens: ${webflowTokens.access_token?.substring(0, 10)}...`
        : "No tokens found"
    );

    if (!webflowTokens?.access_token) {
      console.log("❌ No Webflow tokens found, returning 401");
      return NextResponse.json(
        { error: "Webflow authentication required" },
        { status: 401 }
      );
    }

    console.log("🌐 Creating Webflow client");
    const webflowClient = new WebflowClient({
      accessToken: webflowTokens.access_token,
    });

    console.log("📡 Fetching sites from Webflow API");
    const sites = await webflowClient.sites.list();
    console.log(
      "✅ Sites fetched successfully:",
      sites.sites?.length || 0,
      "sites"
    );

    return NextResponse.json({ result: sites.sites || [] });
  } catch (error) {
    console.error("💥 Error fetching Webflow sites:", error);
    return NextResponse.json(
      { error: "Failed to fetch Webflow sites" },
      { status: 500 }
    );
  }
}
