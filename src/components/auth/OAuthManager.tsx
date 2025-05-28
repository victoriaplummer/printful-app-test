"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";

export default function OAuthManager() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { sessionId, webflowTokens, printfulTokens, isFullyConnected } =
    useSession();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle OAuth callback success messages
  useEffect(() => {
    const handleCallback = async () => {
      // Handle Webflow callback success
      if (searchParams.get("webflow_success") === "true") {
        // Clean up URL
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete("webflow_success");
        router.replace(newUrl.pathname + newUrl.search);
      }

      // Handle Printful callback success
      if (searchParams.get("printful_success") === "true") {
        // Clean up URL
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete("printful_success");
        router.replace(newUrl.pathname + newUrl.search);
      }

      // Handle errors
      const error = searchParams.get("error");
      if (error) {
        const details = searchParams.get("details");
        setError(
          `Authentication failed: ${error}${details ? ` - ${details}` : ""}`
        );
        // Clean up URL
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete("error");
        newUrl.searchParams.delete("details");
        router.replace(newUrl.pathname + newUrl.search);
      }
    };

    handleCallback();
  }, [searchParams, router]);

  const handleConnect = async (provider: "webflow" | "printful") => {
    if (!sessionId) {
      setError("Session not available");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/cosmic/api/auth/url?provider=${provider}`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get auth URL: ${response.statusText}`);
      }

      const data = await response.json();
      window.location.href = data.authUrl;
    } catch (err) {
      setError(`Failed to initiate ${provider} connection: ${err}`);
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
          <div className="flex items-center space-x-2 text-red-700">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Webflow Connection */}
        <div className="p-6 border rounded-lg">
          <div className="mb-4">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <span>Webflow</span>
              {webflowTokens && <span className="text-green-500">✓</span>}
            </h3>
            <p className="text-gray-600 text-sm">
              Connect your Webflow account to sync products to your ecommerce
              collections.
            </p>
          </div>
          <div>
            {webflowTokens ? (
              <div className="space-y-2">
                <p className="text-sm text-green-600">
                  ✓ Connected successfully
                </p>
                <button
                  className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                  onClick={() => handleConnect("webflow")}
                  disabled={isLoading}
                >
                  Reconnect
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleConnect("webflow")}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                🔗 Connect Webflow
              </button>
            )}
          </div>
        </div>

        {/* Printful Connection */}
        <div className="p-6 border rounded-lg">
          <div className="mb-4">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <span>Printful</span>
              {printfulTokens && <span className="text-green-500">✓</span>}
            </h3>
            <p className="text-gray-600 text-sm">
              Connect your Printful account to access your product catalog.
            </p>
          </div>
          <div>
            {printfulTokens ? (
              <div className="space-y-2">
                <p className="text-sm text-green-600">
                  ✓ Connected successfully
                </p>
                <button
                  className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                  onClick={() => handleConnect("printful")}
                  disabled={isLoading}
                >
                  Reconnect
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleConnect("printful")}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                🔗 Connect Printful
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Status Summary */}
      {isFullyConnected() && (
        <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
          <div className="flex items-center space-x-2 text-green-700">
            <span>✅</span>
            <span>
              Both services connected! You can now sync products between
              Printful and Webflow.
            </span>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
          <div className="flex items-center space-x-2 text-blue-700">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span>Connecting...</span>
          </div>
        </div>
      )}
    </div>
  );
}
