import { NextResponse } from "next/server";
import { getUpstashClient } from "@/lib/upstash-redis";

export async function GET() {
  const startTime = Date.now();

  try {
    console.log("🔍 Testing Upstash REST API connection...");

    const client = getUpstashClient();

    // Test ping
    const pingResult = await client.ping();
    console.log("📡 Ping result:", pingResult);

    // Test basic operations
    await client.set("test:upstash", "success", { EX: 10 });
    const testValue = await client.get("test:upstash");

    // Clean up
    await client.del("test:upstash");

    const duration = Date.now() - startTime;
    console.log("✅ Upstash REST API test successful");

    return NextResponse.json({
      status: "success",
      message: "Upstash REST API connection successful",
      pingResult,
      testValue,
      duration: `${duration}ms`,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("💥 Upstash REST API test failed:", error);

    return NextResponse.json(
      {
        status: "error",
        message: "Upstash REST API connection failed",
        error: error instanceof Error ? error.message : String(error),
        duration: `${duration}ms`,
      },
      { status: 500 }
    );
  }
}
