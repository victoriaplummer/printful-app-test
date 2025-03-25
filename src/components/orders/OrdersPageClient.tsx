"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import WebflowSettings from "@/components/webflow/WebflowSettings";
import OrdersPage from "@/components/orders/OrdersPage";
import { useWebflowSettings } from "@/hooks/useWebflowSettings";

export default function OrdersPageClient() {
  const { data: session } = useSession();
  const router = useRouter();
  const { settings, updateSettings } = useWebflowSettings();

  // Redirect to home if not connected to both services
  useEffect(() => {
    if (!session) {
      router.push("/");
      return;
    }

    if (session && !session.isMultiConnected) {
      router.push("/");
      return;
    }
  }, [session, router]);

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col">
        <main className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Loading...</h1>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Orders</h1>

          {/* WebflowSettings card */}
          <div className="mb-6">
            <WebflowSettings
              onSettingsChange={updateSettings}
              initialSettings={settings}
            />
          </div>

          {settings.siteId ? (
            <OrdersPage />
          ) : (
            <div className="alert alert-info">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                className="stroke-current shrink-0 w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
              <span>Please select a Webflow site to view orders.</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
