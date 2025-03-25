import Redis from "ioredis";

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
  // Force memory-only storage if environment variable is set
  if (process.env.FORCE_MEMORY_STORAGE === "true") {
    console.log("Forced memory storage mode is enabled");
    return null;
  }

  // For auth paths, we'll skip Redis to avoid timeout issues
  if (isAuthPath()) {
    console.log("Auth path detected, using memory storage only");
    return null;
  }

  // If we already have a client or we're connecting, return the existing client
  if (redisClient !== null || isConnecting) {
    return redisClient;
  }

  // If Redis is not enabled, don't try to connect
  if (process.env.REDIS_ENABLED !== "true") {
    console.log("Redis disabled. Using in-memory storage only.");
    return null;
  }

  try {
    isConnecting = true;
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    useRedisClient = true;

    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 1, // Reduce retries to avoid hanging
      connectTimeout: 5000, // Timeout after 5 seconds
      enableReadyCheck: false, // Skip ready check to speed up connection
      retryStrategy: (times) => {
        // Only retry once with a short delay
        if (times > 1) {
          console.log(
            "Giving up on Redis connection, using memory storage instead"
          );
          useRedisClient = false;
          isConnecting = false;
          return null; // Stop retrying
        }
        return 500; // Retry after 500ms
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

  // Try Redis first if available
  const client = getRedisClient();
  if (useRedisClient && client) {
    try {
      const token = await client.get(key);
      if (token) {
        // Update memory cache
        memoryTokenStore[key] = token;
        return token;
      }
    } catch (error) {
      console.error(`Redis error (fallback to memory): ${error}`);
    }
  }

  // Fall back to memory
  return memoryTokenStore[key] || null;
}

const redisUtils = {
  storeToken,
  getToken,
  storeProviderToken,
  getProviderToken,
};

export default redisUtils;
