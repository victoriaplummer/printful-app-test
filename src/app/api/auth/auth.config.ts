import NextAuth from "next-auth";
import { printfulConfig } from "./printful.config";
import { webflowConfig } from "./webflow.config";

if (!process.env.PRINTFUL_CLIENT_ID || !process.env.PRINTFUL_CLIENT_SECRET) {
  throw new Error("Missing Printful OAuth credentials");
}

if (!process.env.WEBFLOW_CLIENT_ID || !process.env.WEBFLOW_CLIENT_SECRET) {
  throw new Error("Missing Webflow OAuth credentials");
}

if (!process.env.NEXTAUTH_URL) {
  throw new Error("Missing NEXTAUTH_URL environment variable");
}

// Extend the built-in session types
declare module "next-auth" {
  interface Session {
    printfulAccessToken?: string;
    webflowAccessToken?: string;
    isMultiConnected?: boolean;
  }
  interface JWT {
    printfulAccessToken?: string;
    webflowAccessToken?: string;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
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
        // Store tokens in JWT
        if (account.provider === "printful" && account.access_token) {
          token.printfulAccessToken = account.access_token;
        } else if (account.provider === "webflow" && account.access_token) {
          token.webflowAccessToken = account.access_token;
        }
      }
      return token;
    },

    async session({ session, token }) {
      // Get tokens from JWT
      session.printfulAccessToken = token.printfulAccessToken as
        | string
        | undefined;
      session.webflowAccessToken = token.webflowAccessToken as
        | string
        | undefined;
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
  debug: process.env.NODE_ENV === "development",
});
