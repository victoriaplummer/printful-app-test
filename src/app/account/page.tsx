"use client";

import { useSession } from "@/hooks/useSession";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import ClientOnly from "@/components/ClientOnly";

// Prevent static prerendering since this page uses client-side auth
export const dynamic = "force-dynamic";

function AccountPageContent() {
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
      <h1 className="text-2xl font-bold mb-4">Session Information</h1>
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Current Session</h2>
          <p>
            <strong>Session ID:</strong> {sessionId.substring(0, 8)}...
          </p>
          <p>
            <strong>Status:</strong> Active
          </p>
          <p>
            <strong>Services Connected:</strong> Printful & Webflow
          </p>
          <div className="alert alert-info mt-4">
            <span>
              Sessions are temporary and expire after 24 hours. You&apos;ll need
              to reconnect your services if your session expires.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <ClientOnly
      fallback={<div className="container mx-auto p-4">Loading...</div>}
    >
      <AccountPageContent />
    </ClientOnly>
  );
}
