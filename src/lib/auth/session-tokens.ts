import redisUtils from "../redis";
import { OAuthTokens } from "./oauth";

/**
 * Store OAuth tokens for a session
 */
export async function storeSessionTokens(
  sessionId: string,
  provider: "webflow" | "printful",
  tokens: OAuthTokens
): Promise<void> {
  await redisUtils.storeToken(
    provider,
    sessionId,
    JSON.stringify(tokens),
    tokens.expires_at
      ? Math.floor((tokens.expires_at * 1000 - Date.now()) / 1000)
      : 60 * 60 * 24 * 7 // 1 week default
  );
}

/**
 * Get OAuth tokens for a session
 */
export async function getSessionTokens(
  sessionId: string,
  provider: "webflow" | "printful"
): Promise<OAuthTokens | null> {
  const tokenString = await redisUtils.getToken(provider, sessionId);

  if (!tokenString) {
    return null;
  }

  try {
    const tokens: OAuthTokens = JSON.parse(tokenString);

    // Check if tokens are expired
    if (tokens.expires_at && tokens.expires_at * 1000 < Date.now()) {
      // Tokens are expired, remove them
      await clearSessionTokens(sessionId, provider);
      return null;
    }

    return tokens;
  } catch (error) {
    console.error(
      `Error parsing ${provider} tokens for session ${sessionId}:`,
      error
    );
    return null;
  }
}

/**
 * Get all OAuth tokens for a session
 */
export async function getAllSessionTokens(sessionId: string): Promise<{
  webflowTokens: OAuthTokens | null;
  printfulTokens: OAuthTokens | null;
}> {
  const [webflowTokens, printfulTokens] = await Promise.all([
    getSessionTokens(sessionId, "webflow"),
    getSessionTokens(sessionId, "printful"),
  ]);

  return {
    webflowTokens,
    printfulTokens,
  };
}

/**
 * Clear OAuth tokens for a session
 */
export async function clearSessionTokens(
  sessionId: string,
  provider: "webflow" | "printful"
): Promise<void> {
  await redisUtils.storeToken(provider, sessionId, "", 1); // Expire immediately
}

/**
 * Check if session has both required tokens
 */
export async function isSessionFullyConnected(
  sessionId: string
): Promise<boolean> {
  const { webflowTokens, printfulTokens } = await getAllSessionTokens(
    sessionId
  );
  return !!(webflowTokens?.access_token && printfulTokens?.access_token);
}
