"use client";

import { useUser } from "@clerk/nextjs";
import { useOAuthTokens } from "@/lib/auth/clerk-oauth";
import { useState } from "react";

// Prevent static prerendering since this page uses client-side auth
export const dynamic = "force-dynamic";

interface ApiResponse {
  error?: string;
  result?: unknown;
}

export default function AuthStatusPage() {
  const { user, isSignedIn } = useUser();
  const { webflowTokens, printfulTokens, isFullyConnected } = useOAuthTokens();
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const testApi = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/cosmic/api/printful/store/products");
      const data = await response.json();
      setApiResponse(data);
    } catch (error) {
      setApiResponse({ error: String(error) });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Authentication Status</h1>

          {/* Card for the session data */}
          <div className="card bg-base-100 shadow-xl mb-6">
            <div className="card-body">
              <h2 className="card-title">Authentication Status</h2>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Status</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Clerk Auth</td>
                      <td>
                        {isSignedIn ? (
                          <span className="badge badge-success">Signed In</span>
                        ) : (
                          <span className="badge badge-error">
                            Not Signed In
                          </span>
                        )}
                      </td>
                      <td>
                        {user?.emailAddresses?.[0]?.emailAddress || "N/A"}
                      </td>
                    </tr>
                    <tr>
                      <td>Printful OAuth</td>
                      <td>
                        {printfulTokens ? (
                          <span className="badge badge-success">Connected</span>
                        ) : (
                          <span className="badge badge-error">
                            Not Connected
                          </span>
                        )}
                      </td>
                      <td>
                        {printfulTokens?.expires_at
                          ? `Expires: ${new Date(
                              printfulTokens.expires_at * 1000
                            ).toLocaleString()}`
                          : "No expiration"}
                      </td>
                    </tr>
                    <tr>
                      <td>Webflow OAuth</td>
                      <td>
                        {webflowTokens ? (
                          <span className="badge badge-success">Connected</span>
                        ) : (
                          <span className="badge badge-error">
                            Not Connected
                          </span>
                        )}
                      </td>
                      <td>
                        {webflowTokens?.expires_at
                          ? `Expires: ${new Date(
                              webflowTokens.expires_at * 1000
                            ).toLocaleString()}`
                          : "No expiration"}
                      </td>
                    </tr>
                    <tr>
                      <td>Full Integration</td>
                      <td>
                        {isFullyConnected() ? (
                          <span className="badge badge-success">Ready</span>
                        ) : (
                          <span className="badge badge-warning">
                            Incomplete
                          </span>
                        )}
                      </td>
                      <td>
                        {isFullyConnected()
                          ? "All services connected"
                          : "Connect both Printful and Webflow"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Raw token data - collapsed by default */}
              <div className="collapse collapse-arrow bg-base-200 mt-4">
                <input type="checkbox" className="peer" />
                <div className="collapse-title">Raw Token Data</div>
                <div className="collapse-content">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold">Printful Tokens:</h4>
                      <pre className="p-4 bg-neutral text-neutral-content rounded-box overflow-x-auto text-xs">
                        {JSON.stringify(printfulTokens, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <h4 className="font-semibold">Webflow Tokens:</h4>
                      <pre className="p-4 bg-neutral text-neutral-content rounded-box overflow-x-auto text-xs">
                        {JSON.stringify(webflowTokens, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card for API testing */}
          <div className="card bg-base-100 shadow-xl mb-6">
            <div className="card-body">
              <h2 className="card-title">API Test</h2>
              <p className="text-sm opacity-70 mb-4">
                Test the Printful API connection by fetching products
              </p>

              <button
                className="btn btn-primary w-full"
                onClick={testApi}
                disabled={isLoading || !printfulTokens}
              >
                {isLoading ? (
                  <>
                    <span className="loading loading-spinner loading-xs"></span>
                    Testing API...
                  </>
                ) : (
                  "Test Printful API"
                )}
              </button>

              {apiResponse && (
                <div className="mt-4">
                  <h3 className="font-semibold mb-2">Response:</h3>
                  <div className="p-4 bg-neutral text-neutral-content rounded-box overflow-x-auto">
                    <pre className="text-xs whitespace-pre-wrap">
                      {JSON.stringify(apiResponse, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
