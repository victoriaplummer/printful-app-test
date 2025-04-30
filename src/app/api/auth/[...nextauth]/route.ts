import NextAuth from "next-auth";
import { authOptions } from "../auth.config";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

// Configure this endpoint to use Edge Runtime
export const runtime = "edge";
export const dynamic = "force-dynamic";
