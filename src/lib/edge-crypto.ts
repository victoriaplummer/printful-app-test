/**
 * Edge-compatible crypto implementation to replace Node.js crypto module
 * This uses the Web Crypto API which is available in Edge environments
 */

export const EdgeCrypto = {
  // Convert string to Uint8Array
  stringToBuffer(str: string): Uint8Array {
    return new TextEncoder().encode(str);
  },

  // Convert Uint8Array to string
  bufferToString(buffer: Uint8Array): string {
    return new TextDecoder().decode(buffer);
  },

  // Convert Uint8Array to hex string
  bufferToHex(buffer: Uint8Array): string {
    return Array.from(buffer)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  },

  // Convert hex string to Uint8Array
  hexToBuffer(hex: string): Uint8Array {
    const match = hex.match(/.{1,2}/g);
    if (!match) return new Uint8Array(0);
    return new Uint8Array(match.map((byte) => parseInt(byte, 16)));
  },

  // Generate random bytes
  async randomBytes(size: number): Promise<Uint8Array> {
    const bytes = new Uint8Array(size);
    crypto.getRandomValues(bytes);
    return bytes;
  },

  // Hash data using SHA-256
  async sha256(data: string | Uint8Array): Promise<string> {
    const buffer = typeof data === "string" ? this.stringToBuffer(data) : data;
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  },

  // HMAC-SHA256 for signing
  async hmacSha256(
    key: string | Uint8Array,
    data: string | Uint8Array
  ): Promise<string> {
    const keyBuffer = typeof key === "string" ? this.stringToBuffer(key) : key;
    const dataBuffer =
      typeof data === "string" ? this.stringToBuffer(data) : data;

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyBuffer,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign("HMAC", cryptoKey, dataBuffer);
    return this.bufferToHex(new Uint8Array(signature));
  },

  // Simple encrypt/decrypt for NextAuth cookies
  // Note: This is a simplified version of what NextAuth does
  async encrypt(text: string, secret: string): Promise<string> {
    const iv = await this.randomBytes(16);
    const secretBuffer = await this.sha256(secret);
    const secretKey = await crypto.subtle.importKey(
      "raw",
      this.hexToBuffer(secretBuffer),
      { name: "AES-GCM" },
      false,
      ["encrypt"]
    );

    const dataBuffer = this.stringToBuffer(text);
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      secretKey,
      dataBuffer
    );

    const encryptedArray = new Uint8Array(encryptedBuffer);
    const result = new Uint8Array(iv.length + encryptedArray.length);
    result.set(iv);
    result.set(encryptedArray, iv.length);

    return btoa(String.fromCharCode(...result));
  },

  async decrypt(encryptedText: string, secret: string): Promise<string> {
    const encryptedBuffer = Uint8Array.from(atob(encryptedText), (c) =>
      c.charCodeAt(0)
    );
    const iv = encryptedBuffer.slice(0, 16);
    const data = encryptedBuffer.slice(16);

    const secretBuffer = await this.sha256(secret);
    const secretKey = await crypto.subtle.importKey(
      "raw",
      this.hexToBuffer(secretBuffer),
      { name: "AES-GCM" },
      false,
      ["decrypt"]
    );

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      secretKey,
      data
    );

    return this.bufferToString(new Uint8Array(decryptedBuffer));
  },

  // For token generation
  async randomUUID(): Promise<string> {
    // Using the native crypto.randomUUID() if available (modern browsers and Edge)
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return crypto.randomUUID();
    }

    // Fallback implementation if randomUUID is not available
    const bytes = await this.randomBytes(16);
    // Set version (4) and variant (10xx)
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    return [
      this.bufferToHex(bytes.subarray(0, 4)),
      this.bufferToHex(bytes.subarray(4, 6)),
      this.bufferToHex(bytes.subarray(6, 8)),
      this.bufferToHex(bytes.subarray(8, 10)),
      this.bufferToHex(bytes.subarray(10, 16)),
    ].join("-");
  },
};
