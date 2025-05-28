"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import OAuthManager from "@/components/auth/OAuthManager";
import ClientOnly from "@/components/ClientOnly";

// Prevent static prerendering since this page uses client-side auth
export const dynamic = "force-dynamic";

function HomeContent() {
  const router = useRouter();
  const { isFullyConnected } = useSession();

  // Redirect to products page if both services are connected
  useEffect(() => {
    if (isFullyConnected()) {
      router.push("/products");
    }
  }, [isFullyConnected, router]);

  return (
    <div className="flex min-h-screen flex-col">
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

          <OAuthManager />
        </div>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <ClientOnly
      fallback={
        <div className="flex min-h-screen flex-col">
          <main className="flex-1 p-8">
            <div className="w-full max-w-6xl mx-auto">Loading...</div>
          </main>
        </div>
      }
    >
      <HomeContent />
    </ClientOnly>
  );
}
