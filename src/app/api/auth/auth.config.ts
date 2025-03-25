import { AuthOptions } from "next-auth";
import { printfulConfig } from "./printful.config";
import { webflowConfig } from "./webflow.config";
import { authStorage } from "../../../lib/storage";

if (!process.env.PRINTFUL_CLIENT_ID || !process.env.PRINTFUL_CLIENT_SECRET) {
  throw new Error("Missing Printful OAuth credentials");
}

if (!process.env.WEBFLOW_CLIENT_ID || !process.env.WEBFLOW_CLIENT_SECRET) {
  throw new Error("Missing Webflow OAuth credentials");
}

if (!process.env.NEXTAUTH_URL) {
  throw new Error("Missing NEXTAUTH_URL environment variable");
}

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
        // Store tokens in storage instead of JWT
        if (account.provider === "printful" && account.access_token) {
          authStorage.setPrintfulAuth(
            account.access_token,
            typeof account.expires_in === "number"
              ? account.expires_in
              : undefined
          );
        } else if (account.provider === "webflow" && account.access_token) {
          authStorage.setWebflowAuth(
            account.access_token,
            typeof account.expires_in === "number"
              ? account.expires_in
              : undefined
          );
        }
      }
      return token;
    },

    async session({ session }) {
      // Get tokens from storage
      session.printfulAccessToken = authStorage.getPrintfulAuth();
      session.webflowAccessToken = authStorage.getWebflowAuth();
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
