"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useOAuthTokens } from "@/lib/auth/clerk-oauth";

export default function OAuthManager() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const {
    isSignedIn,
    getAuthUrl,
    storeTokens,
    webflowTokens,
    printfulTokens,
    isFullyConnected,
  } = useOAuthTokens();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle OAuth callback tokens from URL params
  useEffect(() => {
    const handleCallback = async () => {
      // Handle Webflow callback
      if (searchParams.get("webflow_success") === "true") {
        const token = searchParams.get("webflow_token");
        const refresh = searchParams.get("webflow_refresh");
        const expires = searchParams.get("webflow_expires");

        if (token) {
          await storeTokens("webflow", {
            access_token: token,
            refresh_token: refresh || undefined,
            expires_at: expires ? parseInt(expires) : undefined,
            token_type: "Bearer",
          });

          // Clean up URL
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete("webflow_success");
          newUrl.searchParams.delete("webflow_token");
          newUrl.searchParams.delete("webflow_refresh");
          newUrl.searchParams.delete("webflow_expires");
          router.replace(newUrl.pathname + newUrl.search);
        }
      }

      // Handle Printful callback
      if (searchParams.get("printful_success") === "true") {
        const token = searchParams.get("printful_token");
        const refresh = searchParams.get("printful_refresh");
        const expires = searchParams.get("printful_expires");

        if (token) {
          await storeTokens("printful", {
            access_token: token,
            refresh_token: refresh || undefined,
            expires_at: expires ? parseInt(expires) : undefined,
            token_type: "Bearer",
          });

          // Clean up URL
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete("printful_success");
          newUrl.searchParams.delete("printful_token");
          newUrl.searchParams.delete("printful_refresh");
          newUrl.searchParams.delete("printful_expires");
          router.replace(newUrl.pathname + newUrl.search);
        }
      }

      // Handle errors
      const error = searchParams.get("error");
      if (error) {
        setError(`Authentication failed: ${error}`);
        // Clean up URL
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete("error");
        newUrl.searchParams.delete("details");
        router.replace(newUrl.pathname + newUrl.search);
      }
    };

    handleCallback();
  }, [searchParams, storeTokens, router]);

  const handleConnect = async (provider: "webflow" | "printful") => {
    if (!isSignedIn) {
      setError("Please sign in first");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const authUrl = await getAuthUrl(provider);
      window.location.href = authUrl;
    } catch (err) {
      setError(`Failed to initiate ${provider} connection: ${err}`);
      setIsLoading(false);
    }
  };

  if (!isSignedIn) {
    return (
      <div className="p-6 border rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
        <p className="text-gray-600">
          Please sign in to connect your Webflow and Printful accounts.
        </p>
      </div>
    );
  }

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

      {isFullyConnected() && (
        <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
          <div className="flex items-center space-x-2 text-green-700">
            <span>✓</span>
            <span className="font-medium">
              All services connected! You can now sync products between Printful
              and Webflow.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
