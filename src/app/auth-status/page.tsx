"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";

interface ApiResponse {
  error?: string;
  result?: any;
}

export default function AuthStatusPage() {
  const { data: session, status } = useSession();
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const testApi = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/printful/store/products");
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
              <h2 className="card-title">Session Status</h2>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Printful</th>
                      <th>Webflow</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{status}</td>
                      <td>
                        {session?.printfulAccessToken ? (
                          <span className="badge badge-success">Connected</span>
                        ) : (
                          <span className="badge badge-error">
                            Not Connected
                          </span>
                        )}
                      </td>
                      <td>
                        {session?.webflowAccessToken ? (
                          <span className="badge badge-success">Connected</span>
                        ) : (
                          <span className="badge badge-error">
                            Not Connected
                          </span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Raw session data - collapsed by default */}
              <div className="collapse collapse-arrow bg-base-200 mt-4">
                <input type="checkbox" className="peer" />
                <div className="collapse-title">Raw Session Data</div>
                <div className="collapse-content">
                  <pre className="p-4 bg-neutral text-neutral-content rounded-box overflow-x-auto text-xs">
                    {JSON.stringify(session, null, 2)}
                  </pre>
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
                disabled={isLoading || !session?.printfulAccessToken}
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
