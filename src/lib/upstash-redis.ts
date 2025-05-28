/**
 * Upstash Redis REST API implementation
 * This is more reliable than the standard Redis protocol for Upstash
 */

interface UpstashResponse<T = unknown> {
  result: T;
  error?: string;
}

class UpstashRedis {
  private baseUrl: string;
  private token: string;

  constructor() {
    // Extract credentials from environment variables
    const redisUrl = process.env.REDIS_URL;
    const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    const restUrl = process.env.UPSTASH_REDIS_REST_URL;

    if (restToken && restUrl) {
      // Use REST URL and token if both available (preferred method)
      this.token = restToken;
      this.baseUrl = restUrl;
    } else if (restToken && redisUrl) {
      // Use REST token with hostname from REDIS_URL
      this.token = restToken;
      const url = new URL(redisUrl);
      this.baseUrl = `https://${url.hostname}`;
    } else if (redisUrl) {
      // Extract password from REDIS_URL as token
      const url = new URL(redisUrl);
      this.token = url.password;
      this.baseUrl = `https://${url.hostname}`;
    } else {
      throw new Error("Either UPSTASH_REDIS_REST_TOKEN or REDIS_URL required");
    }

    console.log(`🔧 Upstash client configured with baseUrl: ${this.baseUrl}`);
    console.log(`🔑 Using token: ${this.token.substring(0, 10)}...`);
  }

  private async execute<T = unknown>(command: string[]): Promise<T> {
    console.log(
      `📡 Executing command: ${command[0]} with ${command.length - 1} args`
    );

    // Use the POST method with command in body as per Upstash documentation
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
    });

    console.log(`📊 Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Upstash error response: ${errorText}`);
      throw new Error(
        `Upstash request failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data: UpstashResponse<T> = await response.json();

    if (data.error) {
      throw new Error(`Upstash error: ${data.error}`);
    }

    console.log(`✅ Command executed successfully`);
    return data.result;
  }

  async set(
    key: string,
    value: string,
    options?: { EX?: number }
  ): Promise<string> {
    const command = ["SET", key, value];
    if (options?.EX) {
      command.push("EX", options.EX.toString());
    }
    return this.execute<string>(command);
  }

  async get(key: string): Promise<string | null> {
    return this.execute<string | null>(["GET", key]);
  }

  async del(key: string): Promise<number> {
    return this.execute<number>(["DEL", key]);
  }

  async mget(keys: string[]): Promise<(string | null)[]> {
    return this.execute<(string | null)[]>(["MGET", ...keys]);
  }

  async ping(): Promise<string> {
    return this.execute<string>(["PING"]);
  }
}

// Singleton instance
let upstashClient: UpstashRedis | null = null;

export function getUpstashClient(): UpstashRedis {
  if (!upstashClient) {
    upstashClient = new UpstashRedis();
  }
  return upstashClient;
}

export default UpstashRedis;
