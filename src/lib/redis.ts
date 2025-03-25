import Redis from "ioredis";

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
let useRedisClient = false;
let redisClient: Redis | null = null;

// Singleton pattern to prevent multiple connections
let isConnecting = false;

// Add at the top of the file
const memoryCache: Record<string, { value: string; expires: number }> = {};
const CACHE_TTL = 60 * 1000; // 1 minute cache

// Determine if we're in an auth path
const isAuthPath = () => {
  if (typeof window === "undefined") {
    // Check if we're in an auth-related path
    const isNextAuthPath =
      process.env.NEXT_RUNTIME === "nodejs" &&
      (process.env.PATH_INFO?.includes("/api/auth") ||
        process.env.NEXT_URL?.includes("/api/auth"));

    return isNextAuthPath;
  }
  return false;
};

// Only initialize Redis if we're in a production environment or explicitly enabled
const getRedisClient = () => {
  // For auth paths, we'll skip Redis to avoid timeout issues
  if (isAuthPath()) {
    console.log("Auth path detected, using memory storage only");
    return null;
  }

  // If we already have a client or we're connecting, return the existing client
  if (redisClient !== null || isConnecting) {
    return redisClient;
  }

  try {
    isConnecting = true;

    // Upstash Redis URL format: redis://username:password@host:port
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      console.log("No Redis URL provided. Using in-memory storage only.");
      return null;
    }

    useRedisClient = true;

    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      connectTimeout: 10000, // 10 seconds
      enableReadyCheck: true,
      tls: {
        rejectUnauthorized: false, // Required for Upstash
      },
      retryStrategy: (times) => {
        if (times > 3) {
          console.log("Redis connection failed, using memory storage instead");
          useRedisClient = false;
          isConnecting = false;
          return null;
        }
        return Math.min(times * 200, 1000); // Exponential backoff
      },
    });

    redisClient.on("error", (err) => {
      console.error("Redis connection error:", err);
      useRedisClient = false;
    });

    redisClient.on("connect", () => {
      console.log("Redis connected successfully");
      useRedisClient = true;
      isConnecting = false;
    });

    return redisClient;
  } catch (error) {
    console.error("Error initializing Redis:", error);
    useRedisClient = false;
    isConnecting = false;
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

  // Try Redis if available
  const client = getRedisClient();
  if (useRedisClient && client) {
    try {
      await client.set(fullKey, token, "EX", expiryInSeconds);
    } catch (error) {
      console.error(`Redis error (fallback to memory): ${error}`);
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

  // Try Redis first if available
  const client = getRedisClient();
  if (useRedisClient && client) {
    try {
      const token = await client.get(fullKey);
      if (token) {
        // Update memory cache
        memoryTokenStore[fullKey] = token;
        return token;
      }
    } catch (error) {
      console.error(`Redis error (fallback to memory): ${error}`);
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

  // Try Redis if available
  const client = getRedisClient();
  if (useRedisClient && client) {
    try {
      await client.set(key, token, "EX", expiryInSeconds);
    } catch (error) {
      console.error(`Redis error (fallback to memory): ${error}`);
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

  // Try Redis
  const client = getRedisClient();
  if (useRedisClient && client) {
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
      console.error(`Redis error (fallback to memory): ${error}`);
    }
  }

  return memoryTokenStore[key] || null;
}

export async function getProviderTokens(): Promise<{
  printful: string | null;
  webflow: string | null;
}> {
  const client = getRedisClient();
  if (useRedisClient && client) {
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
      console.error(`Redis error (fallback to memory): ${error}`);
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
