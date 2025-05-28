import { NextResponse } from "next/server";

export async function GET() {
  try {
    const redisUrl = process.env.REDIS_URL;
    const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    console.log("🔍 Debug Upstash configuration:");
    console.log(
      "📍 REDIS_URL:",
      redisUrl ? redisUrl.replace(/:[^:@]*@/, ":***@") : "Not set"
    );
    console.log(
      "🔑 REST_TOKEN:",
      restToken ? `${restToken.substring(0, 10)}...` : "Not set"
    );

    if (redisUrl) {
      const url = new URL(redisUrl);
      console.log("🌐 Parsed URL hostname:", url.hostname);
      console.log(
        "🔐 Parsed URL password:",
        url.password ? `${url.password.substring(0, 10)}...` : "Not set"
      );
    }

    return NextResponse.json({
      status: "debug",
      hasRedisUrl: !!redisUrl,
      hasRestToken: !!restToken,
      redisUrlHost: redisUrl ? new URL(redisUrl).hostname : null,
      restTokenPrefix: restToken ? restToken.substring(0, 10) : null,
    });
  } catch (error) {
    console.error("💥 Debug error:", error);

    return NextResponse.json(
      {
        status: "error",
        message: "Debug failed",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
