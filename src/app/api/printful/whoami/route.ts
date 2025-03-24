import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/auth.config";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  try {
    const response = await fetch("https://api.printful.com/whoami", {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching Printful data:", error);
    return NextResponse.json(
      { error: "Failed to fetch Printful data" },
      { status: 500 }
    );
  }
}
