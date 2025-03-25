import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import SyncStatus from "@/components/SyncStatus";
import Image from "next/image";

interface WebflowSettings {
  siteId: string;
  syncOptions: {
    autoDraft: boolean;
    includeImages: boolean;
    skipExisting: boolean;
  };
}

interface PrintfulVariant {
  id: string;
  name: string;
  variant_id: string;
  product_id: string;
  retail_price: string;
  sync_status?: "synced" | "stale" | "warning" | "not_synced";
  sku?: string;
  price?: string | number;
  lastSynced?: string;
}

interface Product {
  id: string;
  name: string;
  thumbnail_url: string;
  variants: PrintfulVariant[];
}

interface ProductWithVariants {
  id: string;
  name: string;
  thumbnail_url: string;
  filteredVariants: PrintfulVariant[];
}

interface ProductsListProps {
  products: Product[];
  searchQuery: string;
  statusFilter: string;
  selectedSiteId: string;
  webflowSettings: WebflowSettings;
}

// API function for syncing products
const syncProduct = async ({
  productId,
  settings,
}: {
  productId: string;
  settings: WebflowSettings;
}) => {
  if (!settings.siteId) {
    throw new Error("No Webflow site selected");
  }

  try {
    console.log(
      `Syncing product ${productId} to Webflow site ${settings.siteId}...`,
      { settings }
    );

    // Ensure the user is authenticated first by checking the session
    const sessionResponse = await fetch("/api/auth/session");
    const sessionData = await sessionResponse.json();

    if (!sessionData || !sessionData.user) {
      console.error("Not authenticated - session check failed", sessionData);
      throw new Error("You need to be logged in to sync products");
    }

    console.log("Session check passed, proceeding with sync");

    const response = await fetch(`/api/webflow/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        productId,
        siteId: settings.siteId,
        autoDraft: settings.syncOptions.autoDraft,
        includeImages: settings.syncOptions.includeImages,
        skipExisting: settings.syncOptions.skipExisting,
      }),
    });

    // Log the complete response details for debugging
    console.log("Sync API response:", {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries([...response.headers.entries()]),
    });

    // Try to get the response text first
    const responseText = await response.text();
    console.log("Raw response:", responseText);

    let result;
    try {
      // Try to parse as JSON if possible
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse response as JSON:", parseError);
      throw new Error(responseText || "Unknown server error");
    }

    if (!response.ok) {
      throw new Error(result.error || `Server error: ${response.statusText}`);
    }

    return result;
  } catch (error) {
    console.error("Error in sync process:", error);
    throw error;
  }
};

// Product Variant Row Component
const ProductVariantRow: React.FC<{
  variant: PrintfulVariant;
}> = ({ variant }) => (
  <tr className="hover">
    <td className="px-6 py-3 whitespace-nowrap">
      {/* Product cells are now empty since we group by product */}
    </td>
    <td className="px-6 py-3 whitespace-nowrap">
      <div className="text-sm">{variant.name}</div>
    </td>
    <td className="px-6 py-3 whitespace-nowrap">
      <div className="text-sm opacity-70">{variant.variant_id}</div>
    </td>
    <td className="px-6 py-3 whitespace-nowrap">
      <div className="text-sm">${variant.retail_price}</div>
    </td>
    <td className="px-6 py-3 whitespace-nowrap">
      <SyncStatus status={variant.sync_status || "not_synced"} />
    </td>
    <td className="px-6 py-3 whitespace-nowrap">
      <div className="text-sm">
        {variant.lastSynced
          ? new Date(variant.lastSynced).toLocaleString()
          : "Never synced"}
      </div>
    </td>
  </tr>
);

// Product Header Component
const ProductHeader: React.FC<{
  product: ProductWithVariants;
  onSyncAll: () => Promise<void>;
  isSyncing: boolean;
  syncingProductId: string | null;
  selectedSiteId: string;
}> = ({ product, onSyncAll, isSyncing, syncingProductId, selectedSiteId }) => (
  <tr className="bg-base-200">
    <td colSpan={5} className="px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {product.thumbnail_url ? (
            <div className="avatar">
              <div className="mask mask-squircle w-8 h-8 relative">
                <Image
                  src={product.thumbnail_url}
                  alt={product.name}
                  fill
                  sizes="32px"
                  style={{ objectFit: "cover" }}
                />
              </div>
            </div>
          ) : (
            <div className="avatar placeholder">
              <div className="bg-neutral-focus text-neutral-content mask mask-squircle w-8 h-8">
                <span>N/A</span>
              </div>
            </div>
          )}
          <span className="font-medium">{product.name}</span>
          <span className="text-xs opacity-70">
            ({product.filteredVariants.length} variants)
          </span>
        </div>
        <button
          onClick={() => onSyncAll()}
          className="px-4 py-1.5 bg-primary text-primary-content rounded-md text-sm font-medium
                     hover:bg-primary-dark hover:shadow-md hover:-translate-y-0.5
                     active:translate-y-0 active:shadow-none
                     focus:outline-none focus:ring-2 focus:ring-primary/50
                     transition-all duration-200 ease-in-out
                     disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 
                     disabled:hover:shadow-none disabled:hover:bg-primary
                     flex items-center gap-2"
          disabled={isSyncing || !selectedSiteId}
          title={
            !selectedSiteId
              ? "Select a Webflow site first"
              : "Sync this product and all variants"
          }
        >
          {isSyncing && product.id === syncingProductId ? (
            <>
              <span className="w-4 h-4 border-2 border-primary-content/30 border-t-primary-content rounded-full animate-spin"></span>
              <span>Syncing...</span>
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>Sync All</span>
            </>
          )}
        </button>
      </div>
    </td>
  </tr>
);

// Add a helper function to determine sync status based on lastSynced
const getSyncStatus = (lastSynced?: string): PrintfulVariant["sync_status"] => {
  if (!lastSynced) return "not_synced";

  const now = new Date();
  const syncDate = new Date(lastSynced);
  const daysDifference = Math.floor(
    (now.getTime() - syncDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysDifference <= 10) return "synced";
  if (daysDifference <= 30) return "warning";
  return "stale";
};

// Main component
export const ProductsList: React.FC<ProductsListProps> = ({
  products,
  searchQuery,
  statusFilter,
  selectedSiteId,
  webflowSettings,
}) => {
  const queryClient = useQueryClient();

  // Sync product mutation
  const {
    mutate: syncProductMutation,
    isPending: isSyncing,
    variables: syncingVariables,
  } = useMutation({
    mutationFn: syncProduct,
    onSuccess: (data, variables) => {
      console.log("Sync completed successfully:", data);

      // Optimistically update the cache
      queryClient.setQueriesData(
        { queryKey: ["products"] },
        (oldData: Product[] | unknown) => {
          if (!Array.isArray(oldData)) return oldData;

          return oldData.map((product: Product) => {
            if (product.id === variables.productId) {
              return {
                ...product,
                variants: product.variants.map((variant) => ({
                  ...variant,
                  lastSynced: new Date().toISOString(),
                  sync_status: "synced",
                })),
              };
            }
            return product;
          });
        }
      );

      // Instead of invalidating, we'll refetch in the background
      queryClient.invalidateQueries({
        queryKey: ["products"],
        refetchType: "active",
      });
    },
    onError: (error: Error) => {
      console.error("Sync failed:", error.message);
      // Optionally revert the optimistic update here
    },
  });

  // Function to handle syncing products
  const handleSyncProduct = async (productId: string) => {
    if (!selectedSiteId) {
      alert("Please select a Webflow site first");
      return;
    }

    try {
      await syncProductMutation({
        productId,
        settings: webflowSettings,
      });
    } catch (error) {
      console.error("Error in handleSyncProduct:", error);
      // You could add an error toast here
    }
  };

  // Filter and process products
  const filteredProducts = React.useMemo(() => {
    console.log("Products received:", products);

    if (!Array.isArray(products)) {
      console.error("Products is not an array:", products);
      return [];
    }

    return products
      .filter((product: Product) => {
        if (!product || !product.variants) {
          console.log("Skipping product without variants:", product);
          return false;
        }

        // Check if variants is an array
        if (!Array.isArray(product.variants)) {
          console.log("Product variants is not an array:", product);
          return false;
        }

        // Skip products with no variants
        if (product.variants.length === 0) {
          return false;
        }

        const matchesSearch =
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.variants.some(
            (variant) =>
              variant.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (variant.sku &&
                variant.sku.toLowerCase().includes(searchQuery.toLowerCase()))
          );

        if (statusFilter === "all") return matchesSearch;

        const hasSyncedVariants = product.variants.some(
          (variant) => variant.sync_status === "synced"
        );
        const hasUnSyncedVariants = product.variants.some(
          (variant) =>
            variant.sync_status === "not_synced" || !variant.sync_status
        );

        if (statusFilter === "synced" && hasSyncedVariants)
          return matchesSearch;
        if (statusFilter === "not_synced" && hasUnSyncedVariants)
          return matchesSearch;

        return false;
      })
      .map((product) => {
        const variants = Array.isArray(product.variants)
          ? product.variants
          : [];
        return {
          ...product,
          filteredVariants: variants.map((variant: PrintfulVariant) => {
            // Get the lastSynced value from the variant
            const lastSynced = variant.lastSynced || undefined;

            return {
              ...variant,
              id:
                variant.id ||
                `${product.id}-${Math.random().toString(36).substring(2, 11)}`,
              product_id: variant.product_id || product.id,
              variant_id:
                variant.variant_id ||
                variant.id ||
                `variant-${Math.random().toString(36).substring(2, 11)}`,
              retail_price:
                variant.retail_price ||
                (variant.price ? variant.price.toString() : "0.00"),
              name: variant.name || "Unnamed Variant",
              lastSynced: lastSynced,
              sync_status: getSyncStatus(lastSynced),
            };
          }) as PrintfulVariant[],
        };
      }) as ProductWithVariants[];
  }, [products, searchQuery, statusFilter]);

  // Calculate total variants
  const totalVariants = React.useMemo(() => {
    return filteredProducts.reduce(
      (total, product) => total + product.filteredVariants.length,
      0
    );
  }, [filteredProducts]);

  // Configure default options for this component
  React.useEffect(() => {
    queryClient.setDefaultOptions({
      queries: {
        staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
        gcTime: 1000 * 60 * 30, // Keep unused data in cache for 30 minutes
      },
    });
  }, [queryClient]);

  if (filteredProducts.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">
          No products found matching your filters.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 text-sm opacity-70">
        Showing {totalVariants} variants across {filteredProducts.length}{" "}
        products
      </div>

      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Variant</th>
              <th>Variant ID</th>
              <th>Price</th>
              <th>Sync Status</th>
              <th>Last Synced</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => (
              <React.Fragment key={product.id}>
                <ProductHeader
                  product={product}
                  onSyncAll={() => handleSyncProduct(product.id)}
                  isSyncing={isSyncing}
                  syncingProductId={syncingVariables?.productId || null}
                  selectedSiteId={selectedSiteId}
                />

                {product.filteredVariants.map((variant) => (
                  <ProductVariantRow key={variant.id} variant={variant} />
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};
