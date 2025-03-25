import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import SyncStatus from "@/components/SyncStatus";
import Image from "next/image";
import { WebflowSettingsData } from "@/components/webflow/WebflowSettings";

interface PrintfulVariant {
  id: string;
  name: string;
  variant_id: string;
  product_id: string;
  retail_price: string;
  sync_status?: "pending" | "synced" | "not_synced" | "error";
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
  webflowSettings: WebflowSettingsData;
}

// API function for syncing products
const syncProduct = async ({
  productId,
  settings,
}: {
  productId: string;
  settings: WebflowSettingsData;
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
      // Include credentials to send cookies with the request
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

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
        console.error("Error response from API:", errorData);
      } catch (parseError) {
        console.error("Failed to parse error response:", parseError);
        errorData = { error: "Could not parse error response" };
      }

      throw new Error(
        errorData.error ||
          `Failed to sync product: ${response.status} ${response.statusText}`
      );
    }

    const result = await response.json();
    console.log("Sync result:", result);
    return result;
  } catch (error) {
    console.error("Error syncing product:", error);
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
      // Update the UI to show that the product was synced
      if (data.status === "success" || data.status === "already_synced") {
        // Show success message
        console.log(
          `Product ${variables.productId} synced successfully: ${data.message}`
        );

        // Invalidate the products query to refetch with updated data
        queryClient.invalidateQueries({ queryKey: ["products"] });
      } else {
        // If there was an error in the response
        console.error(`Error syncing product: ${data.error || data.message}`);
      }
    },
    onError: (error) => {
      console.error("Error syncing product:", error);

      // Extract the error message for display
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown error occurred during sync";

      // Here you could implement a toast notification
      console.error(`Sync failed: ${errorMessage}`);

      // If the error indicates authentication issues, we should redirect or prompt login
      if (
        errorMessage.includes("Unauthorized") ||
        errorMessage.includes("logged in")
      ) {
        console.error(
          "Authentication issue detected. User may need to log in again."
        );
        // You could implement a redirect to login page or show a modal
      }
    },
  });

  // Function to handle syncing products
  const handleSyncProduct = async (productId: string) => {
    if (!selectedSiteId) {
      alert("Please select a Webflow site first");
      return;
    }

    // Debug output to verify proper settings structure
    console.log("Starting sync with settings:", {
      siteId: selectedSiteId,
      webflowSettings,
      hasRequiredProps: {
        siteId: !!webflowSettings.siteId,
        syncOptions: !!webflowSettings.syncOptions,
        syncOptionsProps: webflowSettings.syncOptions
          ? Object.keys(webflowSettings.syncOptions)
          : [],
      },
    });

    try {
      await syncProductMutation({
        productId,
        settings: webflowSettings,
      });
    } catch (error) {
      console.error("Error syncing product:", error);
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
        // Ensure variants is always an array before mapping
        const variants = Array.isArray(product.variants)
          ? product.variants
          : [];
        return {
          ...product,
          // Map the variants to ensure they have the required PrintfulVariant fields
          filteredVariants: variants.map((variant: PrintfulVariant) => ({
            ...variant,
            id:
              variant.id ||
              `${product.id}-${Math.random().toString(36).substring(2, 11)}`,
            product_id: variant.product_id || product.id, // Ensure product_id exists
            variant_id:
              variant.variant_id ||
              variant.id ||
              `variant-${Math.random().toString(36).substring(2, 11)}`, // Use variant_id or fallback to id
            retail_price:
              variant.retail_price ||
              (variant.price ? variant.price.toString() : "0.00"), // Convert price if needed
            name: variant.name || "Unnamed Variant",
            sync_status: variant.sync_status || "not_synced",
          })) as PrintfulVariant[],
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
