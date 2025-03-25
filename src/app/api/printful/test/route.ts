import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/auth.config";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json(
      { error: "Not authenticated", session: null },
      { status: 401 }
    );
  }

  return NextResponse.json({
    authenticated: true,
    hasAccessToken: Boolean(session.printfulAccessToken),
    accessTokenPreview: session.printfulAccessToken
      ? `${session.printfulAccessToken.substring(0, 10)}...`
      : null,
  });
}
