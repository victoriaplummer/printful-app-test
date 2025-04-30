import { AuthOptions } from "next-auth";
import { printfulConfig } from "./printful.config";
import { webflowConfig } from "./webflow.config";
import nextConfig from "../../../../next.config.js";

// Make sure basePath is never undefined
const basePath = nextConfig.basePath || "";

// Check environment variables only when executing on the server, not during build
const isBuildPhase =
  process.env.NODE_ENV === "production" &&
  typeof window === "undefined" &&
  !process.env.NEXT_RUNTIME;

// Log for debugging
console.log(`Auth config initialized with basePath: ${basePath}`);
console.log(`NEXTAUTH_URL is set to: ${process.env.NEXTAUTH_URL || "not set"}`);
console.log(`Build phase detected: ${isBuildPhase}`);

// Add safe-guards for missing environment variables during build
const safeProviders = [];
try {
  if (
    !isBuildPhase ||
    (process.env.WEBFLOW_CLIENT_ID && process.env.WEBFLOW_CLIENT_SECRET)
  ) {
    safeProviders.push(webflowConfig);
  }
} catch (e) {
  console.error("Error loading webflow provider:", e);
}

try {
  if (
    !isBuildPhase ||
    (process.env.PRINTFUL_CLIENT_ID && process.env.PRINTFUL_CLIENT_SECRET)
  ) {
    safeProviders.push(printfulConfig);
  }
} catch (e) {
  console.error("Error loading printful provider:", e);
}

export const authOptions: AuthOptions = {
  providers: safeProviders, // Use our safe array that won't break the build
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
        try {
          // Store tokens in JWT only
          if (account.provider === "printful" && account.access_token) {
            token.printfulAccessToken = account.access_token;
          } else if (account.provider === "webflow" && account.access_token) {
            token.webflowAccessToken = account.access_token;
          }
        } catch (error) {
          console.error("Error in JWT callback:", error);
          // Don't throw - just return the token as is
        }
      }
      return token;
    },

    async session({ session, token }) {
      try {
        // Get tokens from JWT only - no Redis
        session.printfulAccessToken = token.printfulAccessToken;
        session.webflowAccessToken = token.webflowAccessToken;
        session.isMultiConnected = !!(
          session.printfulAccessToken && session.webflowAccessToken
        );
      } catch (error) {
        console.error("Error in session callback:", error);
      }
      return session;
    },
  },
  pages: {
    signIn: "/", // Use the homepage as sign-in page
  },
  secret: process.env.NEXTAUTH_SECRET || "a-default-secret-for-build-time-only",
  debug: process.env.NODE_ENV !== "production",
};
