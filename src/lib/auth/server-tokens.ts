import { getSession } from "./session";
import { getAllSessionTokens } from "./session-tokens";
import { OAuthTokens } from "./oauth";

// Server-side token access for API routes
export async function getOAuthTokens(): Promise<{
  webflowTokens: OAuthTokens | null;
  printfulTokens: OAuthTokens | null;
}> {
  const session = await getSession();

  if (!session) {
    return {
      webflowTokens: null,
      printfulTokens: null,
    };
  }

  return await getAllSessionTokens(session.sessionId);
}
