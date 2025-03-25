"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navigation from "../../components/Navigation";
import WebflowSettings, {
  WebflowSettingsData,
} from "@/components/webflow/WebflowSettings";
import { ProductsList } from "@/components/products/ProductsList";
import { ProductsFilters } from "@/components/products/ProductsFilters";
import { useQuery } from "@tanstack/react-query";

// API function
const fetchProducts = async () => {
  try {
    // Now using our enhanced API that fetches both products and variants in one call
    const response = await fetch("/api/printful/store/products");

    if (!response.ok) {
      console.error(
        "Error fetching products:",
        response.status,
        response.statusText
      );
      throw new Error(`Failed to fetch products: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("API Response:", data);

    // The data should now already contain products with their variants
    return data.result || [];
  } catch (error) {
    console.error("Error fetching products:", error);
    return []; // Return empty array on error
  }
};

export default function ProductsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [webflowSettings, setWebflowSettings] = useState<WebflowSettingsData>({
    siteId: "",
    syncOptions: {
      autoDraft: true,
      includeImages: true,
      skipExisting: false,
    },
  });
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

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

  // Handler for WebflowSettings changes
  const handleSettingsChange = (settings: WebflowSettingsData) => {
    console.log("Settings changed:", settings);
    setWebflowSettings(settings);
    setSelectedSiteId(settings.siteId); // Update selected site ID for product filtering
    // Save to localStorage for persistence
    localStorage.setItem("webflowSettings", JSON.stringify(settings));
  };

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem("webflowSettings");
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setWebflowSettings(parsed);
        setSelectedSiteId(parsed.siteId);
      } catch (e) {
        console.error("Failed to parse saved settings", e);
      }
    }
  }, []);

  // Fetch products with TanStack Query
  const {
    data: products = [],
    isLoading: isLoadingProducts,
    error: productsError,
  } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2, // Retry failed requests 2 times
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
  });

  // Handle search change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  // Handle status filter change
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
  };

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navigation />
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
      <Navigation />
      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Printful Product Variants</h1>

          {/* WebflowSettings card */}
          <div className="mb-6">
            <WebflowSettings
              onSettingsChange={handleSettingsChange}
              initialSettings={webflowSettings || undefined}
            />
          </div>

          {/* Loading indicator */}
          {isLoadingProducts && (
            <div className="flex justify-center items-center p-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-2">Loading products...</span>
            </div>
          )}

          {/* Error state */}
          {productsError && (
            <div className="alert alert-error">
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
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>
                Error loading products:{" "}
                {productsError instanceof Error
                  ? productsError.message
                  : "Unknown error"}
              </span>
            </div>
          )}

          {selectedSiteId && !isLoadingProducts && !productsError ? (
            // Show products only when a site is selected and products are loaded
            <div>
              <ProductsFilters
                searchQuery={searchQuery}
                statusFilter={statusFilter}
                onSearchChange={handleSearchChange}
                onStatusFilterChange={handleStatusFilterChange}
              />

              <ProductsList
                products={products}
                searchQuery={searchQuery}
                statusFilter={statusFilter}
                selectedSiteId={selectedSiteId}
                webflowSettings={webflowSettings}
              />
            </div>
          ) : !selectedSiteId ? (
            // Show message if no site is selected
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
              <span>
                Please select a Webflow site to view and sync products.
              </span>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
