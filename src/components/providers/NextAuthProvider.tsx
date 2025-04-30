"use client";

import { SessionProvider } from "next-auth/react";
import nextConfig from "../../../next.config.js";

// Make sure basePath is never undefined
const basePath = nextConfig.basePath || "";

// Log the basePath for debugging
console.log(`NextAuthProvider initialized with basePath: ${basePath}`);

export default function NextAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider basePath={`${basePath}/api/auth`} refetchInterval={5 * 60}>
      {children}
    </SessionProvider>
  );
}
