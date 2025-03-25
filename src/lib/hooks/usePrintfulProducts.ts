import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchPrintfulProducts,
  syncProductToWebflow,
  PrintfulProduct,
  PrintfulVariant,
} from "@/lib/api/printful";
import { useState, useMemo } from "react";

export interface UsePrintfulProductsFilters {
  status?: "all" | "synced" | "not_synced" | "error";
  price?: "all" | "under10" | "10to25" | "25to50" | "over50";
  search?: string;
}

export interface UsePrintfulProductsReturn {
  products: PrintfulProduct[];
  filteredProducts: (PrintfulProduct & {
    filteredVariants: PrintfulVariant[];
  })[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  syncVariant: (productId: string, siteId?: string) => Promise<void>;
  syncAllVariantsForProduct: (
    productId: string,
    siteId?: string
  ) => Promise<void>;
  filters: UsePrintfulProductsFilters;
  setFilter: (
    filterType: keyof UsePrintfulProductsFilters,
    value: string
  ) => void;
  totalVariants: number;
  syncProduct: (productId: string, siteId?: string) => Promise<void>;
  isSyncing: boolean;
  selectSite: (siteId: string) => void;
  selectedSiteId: string | null;
}

export const usePrintfulProducts = (
  initialFilters: UsePrintfulProductsFilters = {}
): UsePrintfulProductsReturn => {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<UsePrintfulProductsFilters>({
    status: initialFilters.status || "all",
    price: initialFilters.price || "all",
    search: initialFilters.search || "",
  });
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

  // Query for fetching products
  const {
    data: products = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["printfulProducts", selectedSiteId],
    queryFn: () => fetchPrintfulProducts(),
    enabled: true, // Start loading even without site selected, will be updated when site is selected
  });

  // Mutation for syncing products
  const syncMutation = useMutation({
    mutationFn: ({
      productId,
      siteId,
    }: {
      productId: string;
      siteId?: string;
    }) =>
      syncProductToWebflow(productId, siteId || selectedSiteId || undefined),
    onMutate: async ({ productId }) => {
      // Optimistically update the UI
      const previousProducts = queryClient.getQueryData([
        "printfulProducts",
        selectedSiteId,
      ]) as PrintfulProduct[] | undefined;

      // Only update if there's existing data
      if (previousProducts) {
        queryClient.setQueryData(
          ["printfulProducts", selectedSiteId],
          previousProducts.map((product) =>
            product.id === productId
              ? {
                  ...product,
                  sync_status: "pending",
                  variants: product.variants.map((variant) => ({
                    ...variant,
                    sync_status: "pending",
                  })),
                }
              : product
          )
        );
      }

      return { previousProducts };
    },
    onSuccess: () => {
      // Refetch products to get updated sync status
      refetch();
    },
    onError: (error, _, context) => {
      // Revert to previous state on error
      if (context?.previousProducts) {
        queryClient.setQueryData(
          ["printfulProducts", selectedSiteId],
          context.previousProducts
        );
      }
      console.error("Error syncing product:", error);
    },
  });

  // Filter the products based on current filters
  const filteredProducts = useMemo(() => {
    // Ensure products is an array before attempting to map
    if (!Array.isArray(products)) {
      console.warn("Products is not an array:", products);
      return [];
    }

    return products
      .map((product: PrintfulProduct) => {
        // Ensure product has a variants array before filtering
        if (!product || !Array.isArray(product.variants)) {
          console.warn("Product or product.variants is not valid:", product);
          return { ...product, filteredVariants: [] };
        }

        const filteredVariants = product.variants.filter(
          (variant: PrintfulVariant) => {
            // Status filter
            const matchesStatus =
              filters.status === "all" ||
              (filters.status === "synced" &&
                variant.sync_status === "synced") ||
              (filters.status === "not_synced" &&
                variant.sync_status === "not_synced") ||
              (filters.status === "error" && variant.sync_status === "error");

            // Price filter
            const price = parseFloat(variant.retail_price);
            const matchesPrice =
              !filters.price ||
              filters.price === "all" ||
              (filters.price === "under10" && price < 10) ||
              (filters.price === "10to25" && price >= 10 && price < 25) ||
              (filters.price === "25to50" && price >= 25 && price < 50) ||
              (filters.price === "over50" && price >= 50);

            // Search filter
            const searchTerm = filters.search?.toLowerCase() || "";
            const matchesSearch =
              !searchTerm ||
              product.name.toLowerCase().includes(searchTerm) ||
              variant.name.toLowerCase().includes(searchTerm) ||
              variant.variant_id.toLowerCase().includes(searchTerm);

            return matchesStatus && matchesPrice && matchesSearch;
          }
        );

        return {
          ...product,
          filteredVariants,
        };
      })
      .filter(
        (product: PrintfulProduct & { filteredVariants: PrintfulVariant[] }) =>
          product.filteredVariants.length > 0
      );
  }, [products, filters]);

  // Count total variants across all filtered products
  const totalVariants = useMemo(() => {
    // Ensure filteredProducts is an array before reducing
    if (!Array.isArray(filteredProducts)) {
      return 0;
    }

    return filteredProducts.reduce(
      (
        total: number,
        product: PrintfulProduct & { filteredVariants: PrintfulVariant[] }
      ) => {
        // Make sure filteredVariants exists and is an array
        if (!product || !Array.isArray(product.filteredVariants)) {
          return total;
        }
        return total + product.filteredVariants.length;
      },
      0
    );
  }, [filteredProducts]);

  // Helper to update a single filter
  const setFilter = (
    filterType: keyof UsePrintfulProductsFilters,
    value: string
  ) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
  };

  // Function to sync a variant (now syncs the entire product)
  const syncVariant = async (productId: string, siteId?: string) => {
    await syncMutation.mutateAsync({ productId, siteId });
  };

  // Function to sync all variants for a product (same as syncVariant now)
  const syncAllVariantsForProduct = async (
    productId: string,
    siteId?: string
  ) => {
    // Ensure products is an array before finding
    if (!Array.isArray(products)) {
      console.error("Cannot sync variants: products is not an array");
      return;
    }

    const product = products.find((p: PrintfulProduct) => p.id === productId);
    if (!product) {
      console.error(`Product with ID ${productId} not found`);
      return;
    }

    // Ensure product has variants
    if (!Array.isArray(product.variants) || product.variants.length === 0) {
      console.error(`Product with ID ${productId} has no variants`);
      return;
    }

    // Check if all variants are already synced or pending
    const allSyncedOrPending = product.variants.every(
      (v: PrintfulVariant) =>
        v.sync_status === "synced" || v.sync_status === "pending"
    );

    if (allSyncedOrPending) {
      alert("All variants for this product are already synced or in progress.");
      return;
    }

    if (
      !confirm(
        `Sync all ${product.variants.length} variants for ${product.name}?`
      )
    ) {
      return;
    }

    // Sync the entire product at once
    await syncMutation.mutateAsync({ productId, siteId });
  };

  // Add site selection function
  const selectSite = (siteId: string) => {
    setSelectedSiteId(siteId);
    // Refetch products with new site context
    refetch();
  };

  // Create a wrapper for syncMutation.mutate to match the expected return type
  const syncProduct = async (
    productId: string,
    siteId?: string
  ): Promise<void> => {
    await syncMutation.mutateAsync({ productId, siteId });
  };

  return {
    products,
    filteredProducts,
    isLoading,
    isError,
    error: error as Error | null,
    syncVariant,
    syncAllVariantsForProduct,
    filters,
    setFilter,
    totalVariants,
    syncProduct,
    isSyncing: syncMutation.isPending,
    selectSite,
    selectedSiteId,
  };
};
