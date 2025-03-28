"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import WelcomeSection from "@/components/home/WelcomeSection";
import ConnectionStatus from "@/components/home/ConnectionStatus";

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();

  // Redirect to products page if both services are connected
  useEffect(() => {
    if (session?.isMultiConnected) {
      router.push("/products");
    }
  }, [session, router]);

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 p-8">
        <div className="w-full max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-center">
            Printful-Webflow Sync Utility
          </h1>

          <WelcomeSection />
          <ConnectionStatus />
        </div>
      </main>
    </div>
  );
}
