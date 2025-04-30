import { AuthOptions } from "next-auth";
import { printfulConfig } from "./printful.config";
import { webflowConfig } from "./webflow.config";
import redisUtils from "../../../lib/redis";
import nextConfig from "../../../../next.config.js";

// Make sure basePath is never undefined
const basePath = nextConfig.basePath || "";

if (!process.env.PRINTFUL_CLIENT_ID || !process.env.PRINTFUL_CLIENT_SECRET) {
  // throw new Error("Missing Printful OAuth credentials");
}

if (!process.env.WEBFLOW_CLIENT_ID || !process.env.WEBFLOW_CLIENT_SECRET) {
  // throw new Error("Missing Webflow OAuth credentials");
}

if (!process.env.NEXTAUTH_URL) {
  // throw new Error("Missing NEXTAUTH_URL environment variable");
}

// Log for debugging
console.log(`Auth config initialized with basePath: ${basePath}`);
console.log(`NEXTAUTH_URL is set to: ${process.env.NEXTAUTH_URL}`);

export const authOptions: AuthOptions = {
  providers: [webflowConfig, printfulConfig], // Order matters - Webflow first
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async signIn() {
      // Always allow sign in
      return true;
    },

    async jwt({ token, account }) {
      if (account) {
        // Store tokens in both Redis and JWT, preserving existing tokens
        if (account.provider === "printful" && account.access_token) {
          await redisUtils.storeProviderToken("printful", account.access_token);
          token.printfulAccessToken = account.access_token; // Store in JWT
          // Preserve webflow token if it exists
          if (!token.webflowAccessToken) {
            token.webflowAccessToken =
              (await redisUtils.getProviderToken("webflow")) || undefined;
          }
        } else if (account.provider === "webflow" && account.access_token) {
          await redisUtils.storeProviderToken("webflow", account.access_token);
          token.webflowAccessToken = account.access_token; // Store in JWT
          // Preserve printful token if it exists
          if (!token.printfulAccessToken) {
            token.printfulAccessToken =
              (await redisUtils.getProviderToken("printful")) || undefined;
          }
        }
      }
      return token;
    },

    async session({ session, token }) {
      // Always try both JWT and Redis for each provider
      session.printfulAccessToken =
        token.printfulAccessToken ||
        (await redisUtils.getProviderToken("printful")) ||
        undefined;

      session.webflowAccessToken =
        token.webflowAccessToken ||
        (await redisUtils.getProviderToken("webflow")) ||
        undefined;

      session.isMultiConnected = !!(
        session.printfulAccessToken && session.webflowAccessToken
      );
      return session;
    },
  },
  pages: {
    signIn: "/", // Use the homepage as sign-in page
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: true,
};
