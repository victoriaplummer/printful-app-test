export interface PrintfulVariant {
  id: string;
  name: string;
  variant_id: string;
  product_id: string;
  retail_price: string;
  sync_status?: "pending" | "synced" | "not_synced" | "error";
  lastSynced?: string;
  files?: Array<{
    id: string;
    type: string;
    hash: string;
    url: string;
    filename: string;
    mime_type: string;
    size: number;
    width: number;
    height: number;
    dpi: number;
    status: string;
    created: number;
    thumbnail_url: string;
    preview_url: string;
    visible: boolean;
    is_temporary: boolean;
  }>;
  options?: Array<{
    id: string;
    value: string;
  }>;
}

export interface PrintfulProduct {
  id: string;
  name: string;
  thumbnail_url: string;
  variants: PrintfulVariant[];
  sync_variants?: PrintfulVariant[];
}

// Define the response structure for the sync operation
export interface SyncResponse {
  message: string;
  status: "success" | "already_synced" | "error";
  product?: {
    printfulId: string;
    webflowId: string;
    name: string;
    variants: number;
  };
  error?: string;
  details?: string;
}

export const fetchPrintfulProducts = async () => {
  try {
    // First, fetch the product list
    const productsResponse = await fetch("/api/printful/store/products", {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!productsResponse.ok) {
      console.error(
        "Failed to fetch products:",
        productsResponse.status,
        productsResponse.statusText
      );
      return []; // Return empty array instead of throwing
    }

    const productsData = await productsResponse.json();
    const productsList = productsData.result || [];

    if (!Array.isArray(productsList) || productsList.length === 0) {
      console.log("No products found in Printful store");
      return [];
    }

    console.log(`Found ${productsList.length} products, fetching details...`);

    // Fetch detailed information for each product
    const productsWithDetails = await Promise.all(
      productsList.map(async (product) => {
        try {
          const detailResponse = await fetch(
            `/api/printful/store/product?id=${product.id}`,
            {
              headers: {
                "Content-Type": "application/json",
              },
            }
          );

          if (!detailResponse.ok) {
            console.warn(`Failed to fetch details for product ${product.id}`);
            // Return a product with placeholder variants
            return {
              id: product.id.toString(),
              name: product.name,
              thumbnail_url: product.thumbnail_url,
              variants: Array(product.variants || 0)
                .fill(null)
                .map((_, index) => ({
                  id: `temp-${product.id}-${index}`,
                  name: `Variant ${index + 1}`,
                  variant_id: `temp-variant-${index}`,
                  product_id: product.id.toString(),
                  retail_price: "0.00",
                  sync_status: "not_synced",
                })),
            };
          }

          const detailData = await detailResponse.json();

          // Map the product detail to the expected format
          return {
            id: product.id.toString(),
            name: product.name,
            thumbnail_url: product.thumbnail_url,
            // Use sync_variants from the detail data, or create placeholders if missing
            variants: (detailData.result?.sync_variants || []).map(
              (variant: PrintfulVariant) => ({
                id: variant.id.toString(),
                name: variant.name,
                variant_id: variant.variant_id.toString(),
                product_id: product.id.toString(),
                retail_price: variant.retail_price || "0.00",
                sync_status: "not_synced", // Default status
              })
            ),
          };
        } catch (error) {
          console.error(
            `Error fetching details for product ${product.id}:`,
            error
          );
          // Return a product with placeholder variants on error
          return {
            id: product.id.toString(),
            name: product.name,
            thumbnail_url: product.thumbnail_url,
            variants: [],
          };
        }
      })
    );

    console.log(
      `Successfully fetched details for ${productsWithDetails.length} products`
    );
    return productsWithDetails;
  } catch (error) {
    console.error("Error fetching products:", error);
    return []; // Return empty array on any error
  }
};

export const syncProductToWebflow = async (
  productId: string,
  siteId?: string
): Promise<SyncResponse> => {
  if (!siteId) {
    throw new Error("Site ID is required for syncing products");
  }

  try {
    const response = await fetch("/api/webflow/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ productId, siteId }),
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      console.error("Sync error:", errorData);
      throw new Error(
        errorData.error ||
          `Failed to sync product: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error(
      "Error syncing product:",
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
};

export interface PrintfulProfile {
  sub: string; // Unique identifier for the user/store
  name: string; // Store name
  // Note: Printful doesn't actually provide a sub/name in their API
  // We're creating these values ourselves in the userinfo.request
}

// You might also want to add other Printful-related interfaces here
export interface PrintfulTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  result?: {
    access_token?: string;
    refresh_token?: string;
  };
}

export async function getPrintfulProducts(accessToken: string) {
  const response = await fetch("https://api.printful.com/store/products", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Printful products: ${response.statusText}`
    );
  }

  const data = await response.json();
  return data.result || [];
}

export async function getPrintfulProduct(
  productId: string,
  accessToken: string
) {
  const response = await fetch(
    `https://api.printful.com/store/products/${productId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch Printful product: ${response.statusText}`);
  }

  const data = await response.json();
  return data.result;
}

export async function getPrintfulVariant(
  variantId: string,
  accessToken: string
) {
  const response = await fetch(
    `https://api.printful.com/store/variants/${variantId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch variant details: ${response.statusText}`);
  }

  const data = await response.json();
  return data.result;
}
