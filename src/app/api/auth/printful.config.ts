import type { OAuthConfig } from "next-auth/providers/oauth";
import { authStorage } from "../../../lib/storage";

declare module "next-auth" {
  interface Session {
    printfulAccessToken?: string;
  }
  interface JWT {
    printfulAccessToken?: string;
  }
}

// Remove the hard error and only throw during runtime, not build
const isBuildPhase =
  process.env.NODE_ENV === "production" &&
  typeof window === "undefined" &&
  !process.env.NEXT_RUNTIME;
if (
  !isBuildPhase &&
  (!process.env.PRINTFUL_CLIENT_ID || !process.env.PRINTFUL_CLIENT_SECRET)
) {
  console.warn("Missing Printful OAuth credentials");
}

interface PrintfulTokens {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  result?: {
    access_token?: string;
    refresh_token?: string;
  };
}

interface PrintfulProfile {
  sub: string;
  name: string;
}

// Fix the callback URL to include /api/auth
const getCallbackUrl = () => {
  return process.env.NODE_ENV === "production"
    ? "https://webflow-printful-sync-utility.vercel.app/api/auth/callback/printful"
    : `${
        process.env.NEXTAUTH_URL || "http://localhost:3000"
      }/api/auth/callback/printful`;
};

export const printfulConfig: OAuthConfig<PrintfulProfile> = {
  id: "printful",
  name: "Printful",
  type: "oauth",
  authorization: {
    url: "https://www.printful.com/oauth/authorize",
    params: {
      client_id: process.env.PRINTFUL_CLIENT_ID,
      redirect_url: getCallbackUrl(),
      response_type: "code",
    },
  },
  token: {
    url: "https://www.printful.com/oauth/token",
    async request(context) {
      const { provider, params } = context;
      const redirect_url = getCallbackUrl();

      const response = await fetch("https://www.printful.com/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: provider.clientId as string,
          client_secret: provider.clientSecret as string,
          code: params.code as string,
          redirect_url,
        }),
      });

      const tokens: PrintfulTokens = await response.json();

      // Handle Printful's nested token response
      const access_token = tokens.access_token || tokens.result?.access_token;
      const refresh_token =
        tokens.refresh_token || tokens.result?.refresh_token;

      if (!access_token) {
        throw new Error("Failed to get access token from Printful");
      }

      return {
        tokens: {
          access_token,
          refresh_token,
          expires_at: tokens.expires_in
            ? Math.floor(Date.now() / 1000) + tokens.expires_in
            : undefined,
          token_type: tokens.token_type || "Bearer",
        },
      };
    },
  },
  userinfo: {
    url: "https://api.printful.com/store/products",
    async request(context) {
      const { tokens } = context;
      const response = await fetch("https://api.printful.com/store/products", {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to validate Printful token");
      }

      return {
        sub: "printful-user",
        name: "Printful Store",
      };
    },
  },
  clientId: process.env.PRINTFUL_CLIENT_ID,
  clientSecret: process.env.PRINTFUL_CLIENT_SECRET,
  profile(profile: PrintfulProfile) {
    return {
      id: "printful-" + Date.now(),
      name: profile.name || "Printful Store",
      email: undefined,
      image: undefined,
    };
  },
};

export async function getProviderToken(
  provider: string
): Promise<string | null> {
  if (provider === "printful") {
    return authStorage.getPrintfulAuth();
  }
  return null;
}
