import { NextResponse } from "next/server";

export const config = { runtime: "edge" };

export async function POST(request: Request) {
  try {
    // For webhooks, we might not always have a user session
    // This depends on how the webhook is configured
    const body = await request.json();

    // Webhook processing logic would go here
    console.log("Received webhook:", body);

    return NextResponse.json({
      message: "Webhook received",
      received: true,
    });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}
