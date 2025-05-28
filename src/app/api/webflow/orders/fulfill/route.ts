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
    // Order fulfillment logic would go here

    return NextResponse.json({
      message: "Order fulfillment initiated",
      body,
    });
  } catch (error) {
    console.error("Error fulfilling order:", error);
    return NextResponse.json(
      { error: "Failed to fulfill order" },
      { status: 500 }
    );
  }
}
