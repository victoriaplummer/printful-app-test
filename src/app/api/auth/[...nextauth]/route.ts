import NextAuth from "next-auth";
import { authOptions } from "../auth.config";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

// Use Node.js runtime instead of Edge because NextAuth needs crypto
export const runtime = "nodejs";

// Keep the dynamic flag
export const dynamic = "force-dynamic";
