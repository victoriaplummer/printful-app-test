import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getOAuthTokens } from "@/lib/auth/server-tokens";

export const config = { runtime: "edge" };

export async function GET(request: Request) {
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
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get("siteId");

    if (!siteId) {
      return NextResponse.json(
        { error: "Site ID is required" },
        { status: 400 }
      );
    }

    // Orders logic would go here
    return NextResponse.json({
      message: "Orders fetched",
      orders: [],
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
