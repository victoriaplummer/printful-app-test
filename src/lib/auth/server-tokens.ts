import { clerkClient } from "@clerk/nextjs/server";
import type { OAuthTokens } from "./oauth";

// Server-side token access for API routes
export async function getOAuthTokens(userId: string): Promise<{
  webflowTokens: OAuthTokens | null;
  printfulTokens: OAuthTokens | null;
}> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const metadata = user.unsafeMetadata;

    return {
      webflowTokens: (metadata.webflow_tokens as OAuthTokens) || null,
      printfulTokens: (metadata.printful_tokens as OAuthTokens) || null,
    };
  } catch (error) {
    console.error("Error fetching user tokens:", error);
    return {
      webflowTokens: null,
      printfulTokens: null,
    };
  }
}
