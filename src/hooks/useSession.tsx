"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { OAuthTokens } from "@/lib/auth/oauth";

interface SessionContextType {
  sessionId: string | null;
  webflowTokens: OAuthTokens | null;
  printfulTokens: OAuthTokens | null;
  isLoading: boolean;
  isFullyConnected: () => boolean;
  storeTokens: (
    provider: "webflow" | "printful",
    tokens: OAuthTokens
  ) => Promise<void>;
  clearTokens: (provider: "webflow" | "printful") => Promise<void>;
  refreshTokens: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [webflowTokens, setWebflowTokens] = useState<OAuthTokens | null>(null);
  const [printfulTokens, setPrintfulTokens] = useState<OAuthTokens | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);

  // Initialize session and load tokens
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch("/cosmic-2/api/session", {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          setSessionId(data.sessionId);
          setWebflowTokens(data.webflowTokens);
          setPrintfulTokens(data.printfulTokens);
        }
      } catch (error) {
        console.error("Failed to fetch session:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();
  }, []);

  const storeTokens = async (
    provider: "webflow" | "printful",
    tokens: OAuthTokens
  ) => {
    try {
      const response = await fetch("/cosmic-2/api/session/tokens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ provider, tokens }),
      });

      if (response.ok) {
        if (provider === "webflow") {
          setWebflowTokens(tokens);
        } else {
          setPrintfulTokens(tokens);
        }
      }
    } catch (error) {
      console.error("Failed to store tokens:", error);
    }
  };

  const clearTokens = async (provider: "webflow" | "printful") => {
    try {
      const response = await fetch(
        `/cosmic-2/api/session/tokens?provider=${provider}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (response.ok) {
        if (provider === "webflow") {
          setWebflowTokens(null);
        } else {
          setPrintfulTokens(null);
        }
      }
    } catch (error) {
      console.error("Failed to clear tokens:", error);
    }
  };

  const refreshTokens = async () => {
    try {
      const response = await fetch("/cosmic-2/api/session", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setSessionId(data.sessionId);
        setWebflowTokens(data.webflowTokens);
        setPrintfulTokens(data.printfulTokens);
      }
    } catch (error) {
      console.error("Failed to refresh session:", error);
    }
  };

  const isFullyConnected = () => {
    return !!(webflowTokens?.access_token && printfulTokens?.access_token);
  };

  const value: SessionContextType = {
    sessionId,
    webflowTokens,
    printfulTokens,
    isLoading,
    isFullyConnected,
    storeTokens,
    clearTokens,
    refreshTokens,
  };

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
