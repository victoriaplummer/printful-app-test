import type { AuthOptions } from "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
  }
  interface JWT {
    accessToken?: string;
  }
}

if (!process.env.PRINTFUL_CLIENT_ID || !process.env.PRINTFUL_CLIENT_SECRET) {
  throw new Error("Missing Printful OAuth credentials");
}

if (!process.env.NEXTAUTH_URL) {
  throw new Error("Missing NEXTAUTH_URL environment variable");
}

export const authOptions: AuthOptions = {
  providers: [
    {
      id: "printful",
      name: "Printful",
      type: "oauth",
      authorization: {
        url: "https://www.printful.com/oauth/authorize",
        params: {
          scope: "orders sync_products file_library webhooks",
          redirect_url: `${process.env.NEXTAUTH_URL}/api/auth/callback/printful`,
        },
      },
      token: {
        url: "https://www.printful.com/oauth/token",
      },
      userinfo: {
        url: "https://api.printful.com/whoami",
        async request({ tokens }) {
          const response = await fetch("https://api.printful.com/whoami", {
            headers: {
              Authorization: `Bearer ${tokens.access_token}`,
            },
          });
          const profile = await response.json();
          return profile;
        },
      },
      clientId: process.env.PRINTFUL_CLIENT_ID,
      clientSecret: process.env.PRINTFUL_CLIENT_SECRET,
      profile(profile) {
        return {
          id: profile.result.user.id.toString(),
          name: profile.result.user.username,
          email: profile.result.user.email,
        };
      },
    },
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        // This is where we first get the token from Printful
        console.log("\n\n=== PRINTFUL OAUTH TOKEN (SAVE THIS) ===");
        console.log(account.access_token);
        console.log("=== END TOKEN ===\n\n");

        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      return session;
    },
  },
  debug: true,
};
