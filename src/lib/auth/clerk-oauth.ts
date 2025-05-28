import { useAuth, useUser } from "@clerk/nextjs";
import {
  exchangeCodeForTokens,
  validateToken,
  type OAuthTokens,
} from "./oauth";

// Custom hook for managing OAuth tokens with Clerk
export function useOAuthTokens() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();

  // Store tokens in Clerk's user metadata
  const storeTokens = async (
    provider: "webflow" | "printful",
    tokens: OAuthTokens
  ) => {
    if (!user) throw new Error("User not authenticated");

    await user.update({
      unsafeMetadata: {
        ...user.unsafeMetadata,
        [`${provider}_tokens`]: tokens,
      },
    });
  };

  // Get tokens from Clerk's user metadata
  const getTokens = (provider: "webflow" | "printful"): OAuthTokens | null => {
    if (!user?.unsafeMetadata) return null;
    return (user.unsafeMetadata[`${provider}_tokens`] as OAuthTokens) || null;
  };

  // Check if tokens exist and are valid
  const hasValidTokens = async (
    provider: "webflow" | "printful"
  ): Promise<boolean> => {
    const tokens = getTokens(provider);
    if (!tokens) return false;

    // Check expiration
    if (
      tokens.expires_at &&
      tokens.expires_at < Math.floor(Date.now() / 1000)
    ) {
      return false;
    }

    // Validate with API call
    return await validateToken(provider, tokens.access_token);
  };

  // Get authorization URL from server-side API
  const getAuthUrl = async (
    provider: "webflow" | "printful"
  ): Promise<string> => {
    const response = await fetch(`/cosmic/api/auth/url?provider=${provider}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to get auth URL");
    }

    const { authUrl } = await response.json();
    return authUrl;
  };

  // Exchange code for tokens and store them
  const handleCallback = async (
    provider: "webflow" | "printful",
    code: string
  ) => {
    const tokens = await exchangeCodeForTokens(provider, code);
    await storeTokens(provider, tokens);
    return tokens;
  };

  // Clear tokens
  const clearTokens = async (provider: "webflow" | "printful") => {
    if (!user) return;

    const metadata = { ...user.unsafeMetadata };
    delete metadata[`${provider}_tokens`];

    await user.update({
      unsafeMetadata: metadata,
    });
  };

  // Check if both providers are connected
  const isFullyConnected = () => {
    return getTokens("webflow") !== null && getTokens("printful") !== null;
  };

  return {
    isSignedIn,
    storeTokens,
    getTokens,
    hasValidTokens,
    getAuthUrl,
    handleCallback,
    clearTokens,
    isFullyConnected,
    webflowTokens: getTokens("webflow"),
    printfulTokens: getTokens("printful"),
  };
}
