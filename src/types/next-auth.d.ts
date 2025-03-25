import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    printfulAccessToken?: string;
    webflowAccessToken?: string;
    isMultiConnected?: boolean;
    user?: {
      // Add any custom user properties here
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT {
    printfulAccessToken?: string;
    webflowAccessToken?: string;
    printfulUser?: string;
    webflowUser?: string;
    name?: string;
    email?: string;
  }
}
