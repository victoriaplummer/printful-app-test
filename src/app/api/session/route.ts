import { NextRequest, NextResponse } from "next/server";
import { getOrCreateSession } from "@/lib/auth/session";
import { getAllSessionTokens } from "@/lib/auth/session-tokens";

export const config = { runtime: "edge" };

export async function GET(request: NextRequest) {
  try {
    const { session, response: sessionResponse } = await getOrCreateSession(
      request
    );

    // Get existing tokens for this session
    const { webflowTokens, printfulTokens } = await getAllSessionTokens(
      session.sessionId
    );

    const responseData = {
      sessionId: session.sessionId,
      webflowTokens,
      printfulTokens,
    };

    if (sessionResponse) {
      // New session created, need to set cookie
      const response = NextResponse.json(responseData);
      response.cookies.set(sessionResponse.cookies.get("session_id")!);
      return response;
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Session API error:", error);
    return NextResponse.json(
      { error: "Failed to manage session" },
      { status: 500 }
    );
  }
}
