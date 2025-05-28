"use client";

import { useSession } from "@/hooks/useSession";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import ClientOnly from "@/components/ClientOnly";

function OrdersContent() {
  const { sessionId, isFullyConnected } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!sessionId) {
      router.push("/");
      return;
    }

    if (!isFullyConnected()) {
      router.push("/");
      return;
    }
  }, [sessionId, isFullyConnected, router]);

  if (!sessionId || !isFullyConnected()) {
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
