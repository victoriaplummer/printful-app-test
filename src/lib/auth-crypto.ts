/**
 * Provides crypto functions for NextAuth with the same API as the Node.js crypto module
 * but using our Edge-compatible implementation
 */

import { EdgeCrypto } from "./edge-crypto";

// Mock the randomBytes function from Node.js crypto
export function randomBytes(
  size: number
): Promise<{ toString: (encoding: string) => string }> {
  return EdgeCrypto.randomBytes(size).then((bytes) => ({
    toString: (encoding: string) => {
      if (encoding === "hex") {
        return EdgeCrypto.bufferToHex(bytes);
      }
      if (encoding === "base64") {
        return btoa(String.fromCharCode(...bytes));
      }
      return EdgeCrypto.bufferToString(bytes);
    },
  }));
}

// Mock the createHash function from Node.js crypto
export function createHash(algorithm: string) {
  if (algorithm !== "sha256") {
    throw new Error(
      `Unsupported hash algorithm: ${algorithm}. Only sha256 is supported.`
    );
  }

  let data = new Uint8Array(0);

  const hashObject = {
    update: (input: string | Uint8Array) => {
      if (typeof input === "string") {
        const newData = EdgeCrypto.stringToBuffer(input);
        const combined = new Uint8Array(data.length + newData.length);
        combined.set(data);
        combined.set(newData, data.length);
        data = combined;
      } else {
        const combined = new Uint8Array(data.length + input.length);
        combined.set(data);
        combined.set(input, data.length);
        data = combined;
      }
      return hashObject;
    },
    digest: async (encoding?: string) => {
      const hash = await EdgeCrypto.sha256(data);
      if (encoding === "hex") {
        return hash;
      }
      if (encoding === "base64") {
        return btoa(String.fromCharCode(...EdgeCrypto.hexToBuffer(hash)));
      }
      return EdgeCrypto.hexToBuffer(hash);
    },
  };

  return hashObject;
}

// Mock the createHmac function from Node.js crypto
export function createHmac(algorithm: string, key: string | Uint8Array) {
  if (algorithm !== "sha256") {
    throw new Error(
      `Unsupported HMAC algorithm: ${algorithm}. Only sha256 is supported.`
    );
  }

  let data = new Uint8Array(0);

  const hmacObject = {
    update: (input: string | Uint8Array) => {
      if (typeof input === "string") {
        const newData = EdgeCrypto.stringToBuffer(input);
        const combined = new Uint8Array(data.length + newData.length);
        combined.set(data);
        combined.set(newData, data.length);
        data = combined;
      } else {
        const combined = new Uint8Array(data.length + input.length);
        combined.set(data);
        combined.set(input, data.length);
        data = combined;
      }
      return hmacObject;
    },
    digest: async (encoding?: string) => {
      const hmac = await EdgeCrypto.hmacSha256(key, data);
      if (encoding === "hex") {
        return hmac;
      }
      if (encoding === "base64") {
        return btoa(String.fromCharCode(...EdgeCrypto.hexToBuffer(hmac)));
      }
      return EdgeCrypto.hexToBuffer(hmac);
    },
  };

  return hmacObject;
}

// Additional utilities that NextAuth might need
export function randomUUID(): Promise<string> {
  return EdgeCrypto.randomUUID();
}

export function encrypt(text: string, secret: string): Promise<string> {
  return EdgeCrypto.encrypt(text, secret);
}

export function decrypt(
  encryptedText: string,
  secret: string
): Promise<string> {
  return EdgeCrypto.decrypt(encryptedText, secret);
}
