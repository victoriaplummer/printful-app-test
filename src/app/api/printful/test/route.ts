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
    hasAccessToken: Boolean(session.accessToken),
    accessTokenPreview: session.accessToken
      ? `${session.accessToken.substring(0, 10)}...`
      : null,
  });
}
