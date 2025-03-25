import type { OAuthConfig } from "next-auth/providers/oauth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    webflowAccessToken?: string;
  }
  interface JWT {
    accessToken?: string;
    webflowAccessToken?: string;
  }
}

if (!process.env.WEBFLOW_CLIENT_ID || !process.env.WEBFLOW_CLIENT_SECRET) {
  throw new Error("Missing Webflow OAuth credentials");
}

interface WebflowTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

interface WebflowProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export const webflowConfig: OAuthConfig<WebflowProfile> = {
  id: "webflow",
  name: "Webflow",
  type: "oauth",
  authorization: {
    url: "https://webflow.com/oauth/authorize",
    params: {
      scope:
        "sites:read ecommerce:read ecommerce:write authorized_user:read cms:read cms:write",
      client_id: process.env.WEBFLOW_CLIENT_ID,
      redirect_uri: process.env.WEBFLOW_REDIRECT_URI,
      response_type: "code",
    },
  },
  token: {
    url: "https://api.webflow.com/oauth/access_token",
    async request({ provider, params }) {
      console.log("Starting token exchange with params:", {
        hasClientId: !!provider.clientId,
        hasClientSecret: !!provider.clientSecret,
        hasCode: !!params.code,
        redirectUri: process.env.WEBFLOW_REDIRECT_URI,
      });

      const response = await fetch(
        "https://api.webflow.com/oauth/access_token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
          },
          body: new URLSearchParams({
            client_id: provider.clientId || "",
            client_secret: provider.clientSecret || "",
            code: params.code || "",
            grant_type: "authorization_code",
            redirect_uri: process.env.WEBFLOW_REDIRECT_URI || "",
          } as Record<string, string>).toString(),
        }
      );

      const data = await response.text();
      console.log("Token exchange response status:", response.status);

      if (process.env.NODE_ENV === "development") {
        console.log("Token exchange response:", data);
      } else {
        console.log(
          "Token exchange response received (sensitive data not logged)"
        );
      }

      if (!response.ok) {
        throw new Error(
          `Token exchange failed: ${response.status} ${response.statusText}`
        );
      }

      try {
        const parsedData = JSON.parse(data) as WebflowTokenResponse;

        if (!parsedData.access_token) {
          throw new Error("Access token missing from response");
        }

        return {
          tokens: {
            access_token: parsedData.access_token,
            token_type: parsedData.token_type,
            expires_in: parsedData.expires_in,
            refresh_token: parsedData.refresh_token,
          },
        };
      } catch (error) {
        console.error("Failed to parse token response:", error);
        throw new Error(
          `Invalid token response: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    },
  },
  userinfo: {
    url: "https://api.webflow.com/v2/token/authorized_by",
    async request(context) {
      if (process.env.NODE_ENV === "development") {
        console.log("Context in userinfo:", {
          hasTokens: !!context.tokens,
          hasAccessToken: !!context.tokens?.access_token,
        });
      }

      const token = context.tokens?.access_token;

      if (!token) {
        console.error("No access token found in context");
        throw new Error("No access token available for Webflow API request");
      }

      const response = await fetch(
        "https://api.webflow.com/v2/token/authorized_by",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            accept: "application/json",
            "accept-version": "2.0.0",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Webflow user info error (${response.status}):`,
          errorText
        );
        throw new Error(
          `Failed to fetch Webflow user info: ${response.status} ${response.statusText}. Details: ${errorText}`
        );
      }

      try {
        const data = await response.json();

        if (process.env.NODE_ENV === "development") {
          console.log("User profile:", data);
        } else {
          console.log("User profile data received");
        }

        // Validate the response has the required fields
        if (!data.id || !data.email) {
          console.error(
            "Invalid profile data structure:",
            JSON.stringify(data)
          );
          throw new Error("Invalid profile data structure from Webflow API");
        }

        return data as WebflowProfile;
      } catch (error) {
        console.error("Failed to parse user profile:", error);
        throw new Error(
          `Invalid user profile response: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    },
  },
  clientId: process.env.WEBFLOW_CLIENT_ID,
  clientSecret: process.env.WEBFLOW_CLIENT_SECRET,
  profile(profile: WebflowProfile) {
    return {
      id: profile.id,
      name: `${profile.firstName} ${profile.lastName}`,
      email: profile.email,
      image: null,
    };
  },
};
