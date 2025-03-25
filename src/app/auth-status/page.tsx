"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import Navigation from "@/components/Navigation";

export interface ApiResponse {
  success?: boolean;
  result?: unknown;
  error?: string;
  [key: string]: unknown;
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
      <Navigation />
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Authentication Status</h1>

          {/* Using daisyUI card component */}
          <div className="card bg-base-100 shadow-xl mb-6">
            <div className="card-body">
              <h2 className="card-title">Session Status: {status}</h2>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="border dark:border-gray-700 p-3 rounded">
                  <p className="font-medium">Webflow Connected:</p>
                  <p
                    className={
                      session?.webflowAccessToken
                        ? "text-success"
                        : "text-error"
                    }
                  >
                    {session?.webflowAccessToken ? "Yes" : "No"}
                  </p>
                </div>

                <div className="border dark:border-gray-700 p-3 rounded">
                  <p className="font-medium">Printful Connected:</p>
                  <p
                    className={
                      session?.printfulAccessToken
                        ? "text-success"
                        : "text-error"
                    }
                  >
                    {session?.printfulAccessToken ? "Yes" : "No"}
                  </p>
                </div>
              </div>

              <div className="collapse collapse-arrow bg-base-200">
                <input type="checkbox" />
                <div className="collapse-title font-medium">Session Data</div>
                <div className="collapse-content">
                  <pre className="text-xs overflow-auto bg-base-300 p-3 rounded max-h-64">
                    {JSON.stringify(session, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>

          {/* Using daisyUI card for API Test */}
          <div className="card bg-base-100 shadow-xl mb-6">
            <div className="card-body">
              <h2 className="card-title">API Test</h2>

              {/* Using daisyUI button component */}
              <button
                onClick={testApi}
                className={`btn btn-primary ${
                  isLoading ? "btn-disabled loading" : ""
                }`}
                disabled={isLoading}
              >
                {isLoading ? "Loading..." : "Test Printful API"}
              </button>

              {apiResponse && (
                <div className="collapse collapse-arrow bg-base-200 mt-4">
                  <input type="checkbox" defaultChecked />
                  <div className="collapse-title font-medium">API Response</div>
                  <div className="collapse-content">
                    <pre className="text-xs overflow-auto bg-base-300 p-3 rounded max-h-64">
                      {JSON.stringify(apiResponse, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Examples of daisyUI components */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">DaisyUI Component Examples</h2>

              <div className="flex flex-wrap gap-2 mb-4">
                <button className="btn btn-primary">Primary</button>
                <button className="btn btn-secondary">Secondary</button>
                <button className="btn btn-accent">Accent</button>
                <button className="btn btn-info">Info</button>
                <button className="btn btn-success">Success</button>
                <button className="btn btn-warning">Warning</button>
                <button className="btn btn-error">Error</button>
                <button className="btn btn-ghost">Ghost</button>
                <button className="btn btn-link">Link</button>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <button className="btn btn-sm">Small</button>
                <button className="btn">Normal</button>
                <button className="btn btn-lg">Large</button>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <button className="btn btn-disabled">Disabled</button>
                <button className="btn loading">Loading</button>
                <button className="btn btn-block mt-2">Full Width</button>
              </div>

              <div className="divider">Other Components</div>

              <div className="flex flex-wrap gap-2 mb-4">
                <div className="badge">Badge</div>
                <div className="badge badge-primary">Primary</div>
                <div className="badge badge-secondary">Secondary</div>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <input type="checkbox" className="toggle toggle-primary" />
                <input
                  type="checkbox"
                  checked
                  className="toggle toggle-secondary"
                />
                <input type="checkbox" className="checkbox" />
                <input
                  type="checkbox"
                  checked
                  className="checkbox checkbox-primary"
                />
                <input type="radio" name="radio-1" className="radio" />
                <input
                  type="radio"
                  name="radio-1"
                  className="radio radio-primary"
                  checked
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Example Input</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Type here"
                    className="input input-bordered"
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Example Select</span>
                  </label>
                  <select className="select select-bordered">
                    <option disabled selected>
                      Pick one
                    </option>
                    <option>Option 1</option>
                    <option>Option 2</option>
                    <option>Option 3</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
