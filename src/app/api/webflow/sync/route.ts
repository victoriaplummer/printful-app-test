import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getOAuthTokens } from "@/lib/auth/server-tokens";

export const config = { runtime: "edge" };

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const { webflowTokens, printfulTokens } = await getOAuthTokens(userId);

  if (!webflowTokens?.access_token || !printfulTokens?.access_token) {
    return NextResponse.json(
      { error: "Both Webflow and Printful authentication required" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    // Sync logic would go here

    return NextResponse.json({
      message: "Sync initiated",
      body,
    });
  } catch (error) {
    console.error("Error during sync:", error);
    return NextResponse.json({ error: "Failed to sync" }, { status: 500 });
  }
}
