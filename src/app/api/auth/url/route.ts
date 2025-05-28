import { NextRequest, NextResponse } from "next/server";
import { generateAuthUrl } from "@/lib/auth/oauth";
import { auth } from "@clerk/nextjs/server";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const provider = searchParams.get("provider") as "webflow" | "printful";

    if (!provider || !["webflow", "printful"].includes(provider)) {
      return NextResponse.json(
        { error: "Invalid provider. Must be 'webflow' or 'printful'" },
        { status: 400 }
      );
    }

    const authUrl = generateAuthUrl(provider, userId);

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error("Error generating auth URL:", error);
    return NextResponse.json(
      { error: "Failed to generate auth URL" },
      { status: 500 }
    );
  }
}
