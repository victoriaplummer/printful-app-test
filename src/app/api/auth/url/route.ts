import { NextRequest, NextResponse } from "next/server";
import { generateAuthUrl } from "@/lib/auth/oauth";
import { getOrCreateSession } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  try {
    const { session, response: sessionResponse } = await getOrCreateSession(
      request
    );

    const searchParams = request.nextUrl.searchParams;
    const provider = searchParams.get("provider") as "webflow" | "printful";

    if (!provider || !["webflow", "printful"].includes(provider)) {
      return NextResponse.json(
        { error: "Invalid provider. Must be 'webflow' or 'printful'" },
        { status: 400 }
      );
    }

    const authUrl = generateAuthUrl(provider, session.sessionId);

    const responseData = { authUrl };

    if (sessionResponse) {
      // New session created, need to set cookie
      const response = NextResponse.json(responseData);
      const sessionCookie = sessionResponse.cookies.get("session_id");
      if (sessionCookie) {
        response.cookies.set(sessionCookie);
      }
      return response;
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error generating auth URL:", error);
    return NextResponse.json(
      { error: "Failed to generate auth URL" },
      { status: 500 }
    );
  }
}
