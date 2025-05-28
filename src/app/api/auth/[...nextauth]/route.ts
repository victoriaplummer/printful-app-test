import { handlers } from "../auth.config";

export const runtime = "edge";

// Ensure we're using the Edge-compatible handlers
export const GET = handlers.GET;
export const POST = handlers.POST;
