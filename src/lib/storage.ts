const STORAGE_KEYS = {
  PRINTFUL: "printful_auth",
  WEBFLOW: "webflow_auth",
} as const;

// In-memory storage for server-side
const memoryStorage: Record<
  string,
  {
    token: string;
    expiresAt: number;
  }
> = {};

export const authStorage = {
  setPrintfulAuth: (token: string, expiresIn?: number) => {
    const expiresAt = expiresIn ? Date.now() + expiresIn * 1000 : undefined;
    if (typeof window !== "undefined") {
      localStorage.setItem(
        STORAGE_KEYS.PRINTFUL,
        JSON.stringify({ token, expiresAt })
      );
    } else {
      memoryStorage[STORAGE_KEYS.PRINTFUL] = {
        token,
        expiresAt: expiresAt || 0,
      };
    }
  },

  setWebflowAuth: (token: string, expiresIn?: number) => {
    const expiresAt = expiresIn ? Date.now() + expiresIn * 1000 : undefined;
    if (typeof window !== "undefined") {
      localStorage.setItem(
        STORAGE_KEYS.WEBFLOW,
        JSON.stringify({ token, expiresAt })
      );
    } else {
      memoryStorage[STORAGE_KEYS.WEBFLOW] = {
        token,
        expiresAt: expiresAt || 0,
      };
    }
  },

  getPrintfulAuth: () => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEYS.PRINTFUL);
      if (!stored) return null;
      const { token, expiresAt } = JSON.parse(stored);
      if (expiresAt && Date.now() > expiresAt) {
        localStorage.removeItem(STORAGE_KEYS.PRINTFUL);
        return null;
      }
      return token;
    }
    const stored = memoryStorage[STORAGE_KEYS.PRINTFUL];
    if (!stored || (stored.expiresAt && Date.now() > stored.expiresAt)) {
      delete memoryStorage[STORAGE_KEYS.PRINTFUL];
      return null;
    }
    return stored.token;
  },

  getWebflowAuth: () => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEYS.WEBFLOW);
      if (!stored) return null;
      const { token, expiresAt } = JSON.parse(stored);
      if (expiresAt && Date.now() > expiresAt) {
        localStorage.removeItem(STORAGE_KEYS.WEBFLOW);
        return null;
      }
      return token;
    }
    const stored = memoryStorage[STORAGE_KEYS.WEBFLOW];
    if (!stored || (stored.expiresAt && Date.now() > stored.expiresAt)) {
      delete memoryStorage[STORAGE_KEYS.WEBFLOW];
      return null;
    }
    return stored.token;
  },

  clearAuth: (provider?: "printful" | "webflow") => {
    if (typeof window !== "undefined") {
      if (!provider || provider === "printful") {
        localStorage.removeItem(STORAGE_KEYS.PRINTFUL);
      }
      if (!provider || provider === "webflow") {
        localStorage.removeItem(STORAGE_KEYS.WEBFLOW);
      }
    } else {
      if (!provider || provider === "printful") {
        delete memoryStorage[STORAGE_KEYS.PRINTFUL];
      }
      if (!provider || provider === "webflow") {
        delete memoryStorage[STORAGE_KEYS.WEBFLOW];
      }
    }
  },
};
