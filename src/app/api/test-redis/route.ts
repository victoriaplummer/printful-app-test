import { NextResponse } from "next/server";
import { createClient } from "redis";

export async function GET() {
  const startTime = Date.now();

  try {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      return NextResponse.json({
        error: "No REDIS_URL environment variable found",
        status: "missing_config",
      });
    }

    console.log("🔍 Testing Redis connection...");
    console.log("📍 Redis URL:", redisUrl.replace(/:[^:@]*@/, ":***@"));

    const client = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 3000, // 3 seconds
        reconnectStrategy: false, // Don't retry for this test
      },
    });

    let connectionError: Error | null = null;

    // Set up error handler
    client.on("error", (err) => {
      console.error("❌ Redis client error:", err);
      connectionError = err;
    });

    // Add timeout wrapper
    const connectWithTimeout = () => {
      return Promise.race([
        client.connect(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Connection timeout after 3 seconds")),
            3000
          )
        ),
      ]);
    };

    // Connect
    await connectWithTimeout();

    if (connectionError) {
      throw connectionError;
    }

    console.log("✅ Redis connected successfully");

    // Test basic operations
    await client.set("test:connection", "success", { EX: 10 });
    const testValue = await client.get("test:connection");

    // Clean up
    await client.del("test:connection");
    await client.disconnect();

    const duration = Date.now() - startTime;

    return NextResponse.json({
      status: "success",
      message: "Redis connection successful",
      testValue,
      duration: `${duration}ms`,
      redisUrl: redisUrl.replace(/:[^:@]*@/, ":***@"),
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("💥 Redis connection failed:", error);

    return NextResponse.json(
      {
        status: "error",
        message: "Redis connection failed",
        error: error instanceof Error ? error.message : String(error),
        duration: `${duration}ms`,
        suggestions: [
          "Check if Redis URL is correct",
          "Verify network connectivity to Upstash",
          "Consider using Upstash REST API instead",
          "Check if SSL/TLS is required",
        ],
      },
      { status: 500 }
    );
  }
}
