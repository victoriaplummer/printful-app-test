"use server";

import redisUtils from "../../lib/redis";

export async function disconnectProvider(provider: "printful" | "webflow") {
  await redisUtils.storeProviderToken(provider, "");
  return true;
}
