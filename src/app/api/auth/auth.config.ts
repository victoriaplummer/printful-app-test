import { AuthOptions } from "next-auth";
import { printfulConfig } from "./printful.config";
import { webflowConfig } from "./webflow.config";
import { DefaultSession } from "next-auth";
import { storeProviderToken, getProviderToken } from "@/lib/redis";

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
    // Handle sign-in flow
    async signIn() {
      // Always allow sign-in
      return true;
    },

    async jwt({ token, account, user, trigger }) {
      // console.log("JWT Callback ENTRY:", {
      //   trigger,
      //   accountProvider: account?.provider,
      //   tokenBefore: JSON.stringify(token),
      // });

      // CRITICAL: For sign-ins, we need to preserve existing tokens
      if (trigger === "signIn" && account) {
        // If signing in with Printful
        if (account.provider === "printful") {
          // Save the new Printful token
          await storeProviderToken("printful", account.access_token || "");
          token.printfulAccessToken = account.access_token;

          // Preserve the Webflow token from Redis
          const webflowToken = await getProviderToken("webflow");
          if (webflowToken) {
            token.webflowAccessToken = webflowToken;
          }
        }
        // If signing in with Webflow
        else if (account.provider === "webflow") {
          // Save the new Webflow token
          await storeProviderToken("webflow", account.access_token || "");
          token.webflowAccessToken = account.access_token;
          if (user?.email) token.email = user.email;

          // Preserve the Printful token from Redis
          const printfulToken = await getProviderToken("printful");
          if (printfulToken) {
            token.printfulAccessToken = printfulToken;
          }
        }
      }
      // For session updates, ensure we have the latest tokens
      else {
        // Try to get tokens from Redis if they're not in the token
        if (!token.printfulAccessToken) {
          const printfulToken = await getProviderToken("printful");
          if (printfulToken) {
            token.printfulAccessToken = printfulToken;
          }
        }

        if (!token.webflowAccessToken) {
          const webflowToken = await getProviderToken("webflow");
          if (webflowToken) {
            token.webflowAccessToken = webflowToken;
          }
        }
      }

      // If there are tokens in the JWT, make sure they're also in Redis
      if (token.printfulAccessToken) {
        await storeProviderToken(
          "printful",
          token.printfulAccessToken as string
        );
      }

      if (token.webflowAccessToken) {
        await storeProviderToken("webflow", token.webflowAccessToken as string);
      }

      // console.log("JWT Callback EXIT:", {
      //   hasPrintful: !!token.printfulAccessToken,
      //   hasWebflow: !!token.webflowAccessToken,
      //   email: token.email,
      // });

      return token;
    },

    async session({ session, token }) {
      // console.log("Session Callback:", {
      //   tokenInfo: {
      //     hasPrintful: !!token.printfulAccessToken,
      //     hasWebflow: !!token.webflowAccessToken,
      //     email: token.email,
      //   },
      // });

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
