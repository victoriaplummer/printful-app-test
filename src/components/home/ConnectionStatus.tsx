"use client";

import { useRouter } from "next/navigation";
import { useOAuthTokens } from "@/lib/auth/clerk-oauth";

export default function ConnectionStatus() {
  const router = useRouter();
  const {
    isSignedIn,
    webflowTokens,
    printfulTokens,
    isFullyConnected,
    getAuthUrl,
  } = useOAuthTokens();

  const handleConnect = async (provider: "printful" | "webflow") => {
    if (!isSignedIn) {
      alert("Please sign in first");
      return;
    }

    try {
      const authUrl = getAuthUrl(provider);
      window.location.href = authUrl;
    } catch (error) {
      console.error(`Error connecting to ${provider}:`, error);
      alert(`Failed to connect to ${provider}. Please try again.`);
    }
  };

  if (!isSignedIn) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Integration Status</h2>
          <div className="alert alert-info">
            <span>Please sign in to connect your services.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">Integration Status</h2>
        <div className="space-y-4 mt-4">
          <ServiceConnection
            name="Webflow"
            step={1}
            isConnected={!!webflowTokens}
            onConnect={() => handleConnect("webflow")}
            buttonVariant="neutral"
          />

          <ServiceConnection
            name="Printful"
            step={2}
            isConnected={!!printfulTokens}
            onConnect={() => handleConnect("printful")}
            buttonVariant="primary"
            disabled={!webflowTokens}
          />
        </div>

        {isFullyConnected() && (
          <div className="alert alert-success mt-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <span>Both services connected! You can now sync products.</span>
              <div className="mt-2">
                <button
                  className="btn btn-primary w-full"
                  onClick={() => router.push("/products")}
                >
                  Go to Products
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface ServiceConnectionProps {
  name: string;
  step: number;
  isConnected: boolean;
  onConnect: () => void;
  buttonVariant: "primary" | "neutral" | "secondary";
  disabled?: boolean;
}

function ServiceConnection({
  name,
  step,
  isConnected,
  onConnect,
  buttonVariant,
  disabled = false,
}: ServiceConnectionProps) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg bg-base-200">
      <div className="flex items-center gap-2">
        <div
          className={`badge ${
            isConnected ? "badge-success" : "badge-error"
          } badge-sm`}
        ></div>
        <span className="font-medium">{name}</span>
        <div className="badge badge-primary badge-outline">Step {step}</div>
      </div>
      {!isConnected ? (
        <button
          onClick={onConnect}
          className={`btn btn-${buttonVariant}`}
          disabled={disabled}
        >
          Connect {name}
        </button>
      ) : (
        <div className="badge badge-success gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            className="inline-block w-4 h-4 stroke-current"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M5 13l4 4L19 7"
            ></path>
          </svg>
          Connected
        </div>
      )}
    </div>
  );
}
