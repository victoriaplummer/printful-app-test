import { handlers } from "../auth.config";

// Remove edge runtime for OpenNext Cloudflare compatibility
// export const runtime = "edge";

// Ensure we're using the handlers
export const GET = handlers.GET;
export const POST = handlers.POST;
