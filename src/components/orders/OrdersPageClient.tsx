"use client";

import { useOAuthTokens } from "@/lib/auth/clerk-oauth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import ClientOnly from "@/components/ClientOnly";

function OrdersContent() {
  const { isSignedIn, isFullyConnected } = useOAuthTokens();
  const router = useRouter();

  useEffect(() => {
    if (!isSignedIn) {
      router.push("/");
      return;
    }

    if (!isFullyConnected()) {
      router.push("/");
      return;
    }
  }, [isSignedIn, isFullyConnected, router]);

  if (!isSignedIn || !isFullyConnected()) {
    return <div>Redirecting...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Orders</h1>
      <p>Orders functionality coming soon...</p>
    </div>
  );
}

export default function OrdersPageClient() {
  return (
    <ClientOnly
      fallback={<div className="container mx-auto p-4">Loading...</div>}
    >
      <OrdersContent />
    </ClientOnly>
  );
}
