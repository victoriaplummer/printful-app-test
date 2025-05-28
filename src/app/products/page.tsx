"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import WebflowSettings from "@/components/webflow/WebflowSettings";
import { ProductsList } from "@/components/products/ProductsList";
import { ProductsFilters } from "@/components/products/ProductsFilters";
import { useQuery } from "@tanstack/react-query";
import { useWebflowSettings } from "@/hooks/useWebflowSettings";
import ClientOnly from "@/components/ClientOnly";

// Prevent static prerendering since this page uses client-side auth
export const dynamic = "force-dynamic";

// API function
const fetchProducts = async (siteId: string) => {
  try {
    const response = await fetch(
      `/cosmic-2/api/printful/store/products?siteId=${siteId}`
    );
    if (!response.ok) {
      console.error(
        "Error fetching products:",
        response.status,
        response.statusText
      );
      throw new Error(`Failed to fetch products: ${response.statusText}`);
    }

    const data = await response.json();
    return data.result || [];
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
};

function ProductsPageContent() {
  const { sessionId, isFullyConnected } = useSession();
  const router = useRouter();
  const { settings, updateSettings } = useWebflowSettings();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Redirect to home if not connected to both services
  useEffect(() => {
    if (!sessionId) {
      router.push("/");
      return;
    }

    if (sessionId && !isFullyConnected()) {
      router.push("/");
      return;
    }
  }, [sessionId, isFullyConnected, router]);

  // Fetch products with TanStack Query
  const {
    data: products = [],
    isLoading,
    error: productsError,
  } = useQuery({
    queryKey: ["products", settings.siteId],
    queryFn: () => fetchProducts(settings.siteId),
    enabled: !!settings.siteId && !!sessionId && isFullyConnected(),
    staleTime: 1000 * 60 * 5,
  });

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Printful Product Variants</h1>

          {/* WebflowSettings handles site selection */}
          <div className="mb-6">
            <WebflowSettings
              onSettingsChange={updateSettings}
              initialSettings={settings}
            />
          </div>

          {/* Only show products when we have a siteId and data is loaded */}
          {settings.siteId && !isLoading && !productsError ? (
            <div>
              <ProductsFilters
                searchQuery={searchQuery}
                statusFilter={statusFilter}
                onSearchChange={setSearchQuery}
                onStatusFilterChange={setStatusFilter}
              />

              <ProductsList
                products={products}
                searchQuery={searchQuery}
                statusFilter={statusFilter}
                selectedSiteId={settings.siteId}
                webflowSettings={settings}
                isLoading={isLoading}
              />
            </div>
          ) : !settings.siteId ? (
            <div className="alert alert-info">
              <span>
                Please select a Webflow site to view and sync products.
              </span>
            </div>
          ) : null}

          {/* Loading and error states */}
          {isLoading && (
            <div className="flex justify-center items-center p-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-2">Loading products...</span>
            </div>
          )}

          {productsError && (
            <div className="alert alert-error">
              <span>
                Error loading products:{" "}
                {productsError instanceof Error
                  ? productsError.message
                  : "Unknown error"}
              </span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <ClientOnly
      fallback={
        <div className="flex min-h-screen flex-col">
          <main className="flex-1 p-8">
            <div className="max-w-6xl mx-auto">Loading...</div>
          </main>
        </div>
      }
    >
      <ProductsPageContent />
    </ClientOnly>
  );
}
