import { getUpstashClient } from "./upstash-redis";

// Add this check at the top of the file
if (typeof window !== "undefined") {
  throw new Error("Redis client should only be used in server-side code");
}

// In-memory fallback for tokens when Redis is unavailable
const memoryTokenStore: Record<string, string> = {};

// Key prefixes for better organization
const PRINTFUL_TOKEN_KEY = "auth:printful:token";
const WEBFLOW_TOKEN_KEY = "auth:webflow:token";

// Flag to track if we should try to use Redis or just fallback to memory
let useUpstashClient = false;
let upstashClient: ReturnType<typeof getUpstashClient> | null = null;

// Add at the top of the file
const memoryCache: Record<string, { value: string; expires: number }> = {};
const CACHE_TTL = 60 * 1000; // 1 minute cache

// Determine if we're in an auth path
const isAuthPath = () => {
  if (typeof window === "undefined") {
    // Check if we're in an auth-related path
    const isNextAuthPath =
      process.env.NEXT_RUNTIME === "nodejs" &&
      (process.env.PATH_INFO?.includes("/cosmic/api/auth") ||
        process.env.NEXT_URL?.includes("cosmic/api/auth"));

    return isNextAuthPath;
  }
  return false;
};

// Only initialize Upstash if we're in a production environment or explicitly enabled
const getUpstashRedisClient = () => {
  // For auth paths, we'll skip Redis to avoid timeout issues
  if (isAuthPath()) {
    console.log("Auth path detected, using memory storage only");
    return null;
  }

  // If we already have a client, return it
  if (upstashClient !== null) {
    return upstashClient;
  }

  try {
    // Check if we have the required environment variables
    const redisUrl = process.env.REDIS_URL;
    const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!redisUrl && !restToken) {
      console.log(
        "No Upstash Redis configuration found. Using in-memory storage only."
      );
      return null;
    }

    useUpstashClient = true;
    upstashClient = getUpstashClient();

    console.log("Upstash Redis client initialized successfully");
    return upstashClient;
  } catch (error) {
    console.error("Error initializing Upstash Redis:", error);
    useUpstashClient = false;
    return null;
  }
};

/**
 * Store a token for a specific provider and user
 */
export async function storeToken(
  provider: "printful" | "webflow",
  userId: string,
  token: string,
  expiryInSeconds: number = 60 * 60 * 24 * 7 // Default 1 week
): Promise<void> {
  const key = provider === "printful" ? PRINTFUL_TOKEN_KEY : WEBFLOW_TOKEN_KEY;
  const fullKey = `${key}:${userId}`;

  // Always store in memory
  memoryTokenStore[fullKey] = token;

  // Try Upstash if available
  const client = getUpstashRedisClient();
  if (useUpstashClient && client) {
    try {
      await client.set(fullKey, token, { EX: expiryInSeconds });
    } catch (error) {
      console.error(`Upstash error (fallback to memory): ${error}`);
    }
  }
}

/**
 * Get a token for a specific provider and user
 */
export async function getToken(
  provider: "printful" | "webflow",
  userId: string
): Promise<string | null> {
  const key = provider === "printful" ? PRINTFUL_TOKEN_KEY : WEBFLOW_TOKEN_KEY;
  const fullKey = `${key}:${userId}`;

  // Try Upstash first if available
  const client = getUpstashRedisClient();
  if (useUpstashClient && client) {
    try {
      const token = await client.get(fullKey);
      if (token) {
        // Update memory cache
        memoryTokenStore[fullKey] = token;
        return token;
      }
    } catch (error) {
      console.error(`Upstash error (fallback to memory): ${error}`);
    }
  }

  // Fall back to memory
  return memoryTokenStore[fullKey] || null;
}

/**
 * Store a provider token without a specific user ID
 * Useful for the initial setup when you don't have a user ID yet
 */
export async function storeProviderToken(
  provider: "printful" | "webflow",
  token: string,
  expiryInSeconds: number = 60 * 60 * 24 * 7 // Default 1 week
): Promise<void> {
  const key = provider === "printful" ? PRINTFUL_TOKEN_KEY : WEBFLOW_TOKEN_KEY;

  // Always store in memory
  memoryTokenStore[key] = token;

  // Try Upstash if available
  const client = getUpstashRedisClient();
  if (useUpstashClient && client) {
    try {
      await client.set(key, token, { EX: expiryInSeconds });
    } catch (error) {
      console.error(`Upstash error (fallback to memory): ${error}`);
    }
  }
}

/**
 * Get a provider token without a specific user ID
 */
export async function getProviderToken(
  provider: "printful" | "webflow"
): Promise<string | null> {
  const key = provider === "printful" ? PRINTFUL_TOKEN_KEY : WEBFLOW_TOKEN_KEY;

  // Check memory cache first
  const cached = memoryCache[key];
  if (cached && cached.expires > Date.now()) {
    return cached.value;
  }

  // Try Upstash
  const client = getUpstashRedisClient();
  if (useUpstashClient && client) {
    try {
      const token = await client.get(key);
      if (token) {
        // Update memory cache
        memoryCache[key] = {
          value: token,
          expires: Date.now() + CACHE_TTL,
        };
        return token;
      }
    } catch (error) {
      console.error(`Upstash error (fallback to memory): ${error}`);
    }
  }

  return memoryTokenStore[key] || null;
}

export async function getProviderTokens(): Promise<{
  printful: string | null;
  webflow: string | null;
}> {
  const client = getUpstashRedisClient();
  if (useUpstashClient && client) {
    try {
      const [printfulToken, webflowToken] = await client.mget([
        PRINTFUL_TOKEN_KEY,
        WEBFLOW_TOKEN_KEY,
      ]);
      return {
        printful: printfulToken,
        webflow: webflowToken,
      };
    } catch (error) {
      console.error(`Upstash error (fallback to memory): ${error}`);
    }
  }

  return {
    printful: memoryTokenStore[PRINTFUL_TOKEN_KEY] || null,
    webflow: memoryTokenStore[WEBFLOW_TOKEN_KEY] || null,
  };
}

const redisUtils = {
  storeToken,
  getToken,
  storeProviderToken,
  getProviderToken,
  getProviderTokens,
};

export default redisUtils;
