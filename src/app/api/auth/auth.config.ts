import { AuthOptions } from "next-auth";
import { printfulConfig } from "./printful.config";
import { webflowConfig } from "./webflow.config";
import { DefaultSession } from "next-auth";

if (!process.env.PRINTFUL_CLIENT_ID || !process.env.PRINTFUL_CLIENT_SECRET) {
  throw new Error("Missing Printful OAuth credentials");
}

if (!process.env.WEBFLOW_CLIENT_ID || !process.env.WEBFLOW_CLIENT_SECRET) {
  throw new Error("Missing Webflow OAuth credentials");
}

if (!process.env.NEXTAUTH_URL) {
  throw new Error("Missing NEXTAUTH_URL environment variable");
}

// For type safety
type UserSession = {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } & DefaultSession["user"];
};

export const authOptions: AuthOptions = {
  providers: [webflowConfig, printfulConfig], // Order matters - Webflow first
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async signIn() {
      return true;
    },

    async jwt({ token, account, user, trigger }) {
      // For sign-ins, we need to preserve existing tokens
      if (trigger === "signIn" && account) {
        // If signing in with Printful
        if (account.provider === "printful") {
          // Save the new Printful token while preserving Webflow token
          token.printfulAccessToken = account.access_token;
        }
        // If signing in with Webflow
        else if (account.provider === "webflow") {
          // Save the new Webflow token while preserving Printful token
          token.webflowAccessToken = account.access_token;
          if (user?.email) token.email = user.email;
        }
      }

      // console.log("JWT Callback:", {
      //   hasPrintful: !!token.printfulAccessToken,
      //   hasWebflow: !!token.webflowAccessToken,
      //   email: token.email,
      // });

      return token;
    },

    async session({ session, token }) {
      // Copy user details from token to session
      const typedSession = session as UserSession;

      if (!typedSession.user) {
        typedSession.user = {};
      }

      if (token.email) typedSession.user.email = token.email;
      if (token.name) typedSession.user.name = token.name;

      // Add tokens to session
      session.printfulAccessToken = token.printfulAccessToken as
        | string
        | undefined;
      session.webflowAccessToken = token.webflowAccessToken as
        | string
        | undefined;
      session.isMultiConnected = !!(
        token.printfulAccessToken && token.webflowAccessToken
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
