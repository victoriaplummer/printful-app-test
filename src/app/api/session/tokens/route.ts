import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  storeSessionTokens,
  clearSessionTokens,
} from "@/lib/auth/session-tokens";
import { OAuthTokens } from "@/lib/auth/oauth";

export const config = { runtime: "edge" };

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "No session found" }, { status: 401 });
    }

    const {
      provider,
      tokens,
    }: { provider: "webflow" | "printful"; tokens: OAuthTokens } =
      await request.json();

    if (!provider || !tokens) {
      return NextResponse.json(
        { error: "Provider and tokens are required" },
        { status: 400 }
      );
    }

    await storeSessionTokens(session.sessionId, provider, tokens);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Store tokens error:", error);
    return NextResponse.json(
      { error: "Failed to store tokens" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "No session found" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider") as "webflow" | "printful";

    if (!provider) {
      return NextResponse.json(
        { error: "Provider is required" },
        { status: 400 }
      );
    }

    await clearSessionTokens(session.sessionId, provider);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Clear tokens error:", error);
    return NextResponse.json(
      { error: "Failed to clear tokens" },
      { status: 500 }
    );
  }
}
