"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { useOAuthTokens } from "@/lib/auth/clerk-oauth";
import OAuthManager from "@/components/auth/OAuthManager";

export default function Home() {
  const router = useRouter();
  const { isFullyConnected } = useOAuthTokens();

  // Redirect to products page if both services are connected
  useEffect(() => {
    if (isFullyConnected()) {
      router.push("/products");
    }
  }, [isFullyConnected, router]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Printful-Webflow Sync</h1>
          <div>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </div>
        </div>
      </header>

      <main className="flex-1 p-8">
        <div className="w-full max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">
              Sync Your Printful Products to Webflow
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Connect your Printful and Webflow accounts to automatically sync
              your product catalog to your Webflow ecommerce collections. Manage
              inventory, pricing, and product details seamlessly across both
              platforms.
            </p>
          </div>

          <SignedIn>
            <OAuthManager />
          </SignedIn>

          <SignedOut>
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold mb-4">Get Started</h3>
              <p className="text-gray-600 mb-6">
                Sign in to begin connecting your Printful and Webflow accounts.
              </p>
              <SignInButton mode="modal">
                <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg">
                  Sign In to Continue
                </button>
              </SignInButton>
            </div>
          </SignedOut>
        </div>
      </main>
    </div>
  );
}
