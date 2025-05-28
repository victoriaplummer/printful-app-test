// Simple OAuth utilities for Webflow and Printful
export interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  token_type?: string;
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope?: string;
  authUrl: string;
  tokenUrl: string;
}

// Validate environment variables
function validateEnvVar(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Lazy-loaded OAuth configurations (only created when needed)
function getWebflowConfig(): OAuthConfig {
  return {
    clientId: validateEnvVar(
      "WEBFLOW_CLIENT_ID",
      process.env.WEBFLOW_CLIENT_ID
    ),
    clientSecret: validateEnvVar(
      "WEBFLOW_CLIENT_SECRET",
      process.env.WEBFLOW_CLIENT_SECRET
    ),
    redirectUri: validateEnvVar(
      "WEBFLOW_REDIRECT_URI",
      process.env.WEBFLOW_REDIRECT_URI
    ),
    scope:
      "sites:read ecommerce:read ecommerce:write authorized_user:read cms:read cms:write",
    authUrl: "https://webflow.com/oauth/authorize",
    tokenUrl: "https://api.webflow.com/oauth/access_token",
  };
}

function getPrintfulConfig(): OAuthConfig {
  return {
    clientId: validateEnvVar(
      "PRINTFUL_CLIENT_ID",
      process.env.PRINTFUL_CLIENT_ID
    ),
    clientSecret: validateEnvVar(
      "PRINTFUL_CLIENT_SECRET",
      process.env.PRINTFUL_CLIENT_SECRET
    ),
    redirectUri:
      process.env.NODE_ENV === "production"
        ? "https://webflow-printful-sync-utility.vercel.app/cosmic/api/auth/printful/callback"
        : "http://localhost:3000/cosmic/api/auth/printful/callback",
    authUrl: "https://www.printful.com/oauth/authorize",
    tokenUrl: "https://www.printful.com/oauth/token",
  };
}

// Generate OAuth authorization URL
export function generateAuthUrl(
  provider: "webflow" | "printful",
  state?: string
): string {
  const config =
    provider === "webflow" ? getWebflowConfig() : getPrintfulConfig();

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    ...(config.scope && { scope: config.scope }),
    ...(state && { state }),
  });

  return `${config.authUrl}?${params.toString()}`;
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(
  provider: "webflow" | "printful",
  code: string
): Promise<OAuthTokens> {
  const config =
    provider === "webflow" ? getWebflowConfig() : getPrintfulConfig();

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: config.redirectUri,
  });

  // Printful uses different parameter name
  if (provider === "printful") {
    body.set("redirect_url", config.redirectUri);
    body.delete("redirect_uri");
  }

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();

  // Handle different response formats
  if (provider === "printful") {
    const access_token = data.access_token || data.result?.access_token;
    const refresh_token = data.refresh_token || data.result?.refresh_token;

    if (!access_token) {
      throw new Error("No access token received from Printful");
    }

    return {
      access_token,
      refresh_token,
      expires_at: data.expires_in
        ? Math.floor(Date.now() / 1000) + data.expires_in
        : undefined,
      token_type: data.token_type || "Bearer",
    };
  } else {
    // Webflow
    if (!data.access_token) {
      throw new Error("No access token received from Webflow");
    }

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_in
        ? Math.floor(Date.now() / 1000) + data.expires_in
        : undefined,
      token_type: data.token_type || "Bearer",
    };
  }
}

// Validate token by making a test API call
export async function validateToken(
  provider: "webflow" | "printful",
  token: string
): Promise<boolean> {
  try {
    if (provider === "webflow") {
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
      return response.ok;
    } else {
      const response = await fetch("https://api.printful.com/store/products", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.ok;
    }
  } catch {
    return false;
  }
}
