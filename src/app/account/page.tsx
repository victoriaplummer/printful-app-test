"use client";

import { useSession, signIn } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authStorage } from "../../lib/storage";

export default function AccountPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  const handleSignIn = async (provider: "printful" | "webflow") => {
    try {
      console.log(`Signing in with ${provider}...`);
      await signIn(provider, {
        redirect: true,
        callbackUrl: "/account",
      });
    } catch (error) {
      console.error(`Error signing in with ${provider}:`, error);
      alert(`Failed to connect to ${provider}. Please try again.`);
    }
  };

  const handleDisconnect = async (provider: "printful" | "webflow") => {
    if (confirm(`Are you sure you want to disconnect from ${provider}?`)) {
      authStorage.clearAuth(provider);
      update();
    }
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen flex-col">
        <main className="flex-1 p-4">
          <div className="max-w-lg mx-auto">
            <div className="flex justify-center items-center h-32">
              <span className="loading loading-spinner loading-lg text-primary"></span>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 p-4">
        <div className="max-w-lg mx-auto">
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h2 className="card-title">Your Account</h2>
              {session ? (
                <div>
                  <p>Signed in as {session.user?.email || "User"}</p>
                  <div className="divider"></div>

                  <h3 className="font-bold mb-2">Connected Services</h3>

                  <div className="card bg-base-200 mb-4">
                    <div className="card-body p-4">
                      <h3 className="card-title text-base">Printful</h3>
                      {session.printfulAccessToken ? (
                        <div className="flex flex-col gap-2">
                          <div className="badge badge-success">Connected</div>
                          <button
                            onClick={() => handleDisconnect("printful")}
                            className="btn btn-sm btn-error"
                          >
                            Disconnect
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <div className="badge badge-error">Not Connected</div>
                          <button
                            onClick={() => handleSignIn("printful")}
                            className="btn btn-sm btn-primary"
                          >
                            Connect
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="card bg-base-200">
                    <div className="card-body p-4">
                      <h3 className="card-title text-base">Webflow</h3>
                      {session.webflowAccessToken ? (
                        <div className="flex flex-col gap-2">
                          <div className="badge badge-success">Connected</div>
                          <button
                            onClick={() => handleDisconnect("webflow")}
                            className="btn btn-sm btn-error"
                          >
                            Disconnect
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <div className="badge badge-error">Not Connected</div>
                          <button
                            onClick={() => handleSignIn("webflow")}
                            className="btn btn-sm btn-primary"
                          >
                            Connect
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 py-4">
                  <p>You are not signed in.</p>
                  <button onClick={() => signIn()} className="btn btn-primary">
                    Sign In
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
