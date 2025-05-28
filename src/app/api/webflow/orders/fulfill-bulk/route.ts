import { NextResponse } from "next/server";
import { getOAuthTokens } from "@/lib/auth/server-tokens";

export const config = { runtime: "edge" };

export async function POST(request: Request) {
  const { webflowTokens, printfulTokens } = await getOAuthTokens();

  if (!webflowTokens?.access_token || !printfulTokens?.access_token) {
    return NextResponse.json(
      { error: "Both Webflow and Printful authentication required" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    // Bulk order fulfillment logic would go here

    return NextResponse.json({
      message: "Bulk order fulfillment initiated",
      body,
    });
  } catch (error) {
    console.error("Error fulfilling bulk orders:", error);
    return NextResponse.json(
      { error: "Failed to fulfill bulk orders" },
      { status: 500 }
    );
  }
}
