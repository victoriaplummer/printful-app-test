import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getOAuthTokens } from "@/lib/auth/server-tokens";

export const config = { runtime: "edge" };

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const { printfulTokens } = await getOAuthTokens(userId);

  if (!printfulTokens?.access_token) {
    return NextResponse.json(
      { error: "Printful authentication required" },
      { status: 401 }
    );
  }

  try {
    const response = await fetch("https://api.printful.com/store", {
      headers: {
        Authorization: `Bearer ${printfulTokens.access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Printful API error: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error testing Printful API:", error);
    return NextResponse.json(
      { error: "Failed to test Printful API" },
      { status: 500 }
    );
  }
}
