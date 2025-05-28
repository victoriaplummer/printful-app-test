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

export const fetchPrintfulProducts = async (): Promise<PrintfulProduct[]> => {
  try {
    const response = await fetch("/cosmic/api/printful/store/products", {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.result || [];
  } catch (error) {
    console.error("Error fetching Printful products:", error);
    throw error;
  }
};

export const fetchPrintfulProduct = async (
  productId: string
): Promise<PrintfulProduct | null> => {
  try {
    const response = await fetch(
      `/api/printful/store/product?id=${productId}`,
      {
        credentials: "include",
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.result || null;
  } catch (error) {
    console.error("Error fetching Printful product:", error);
    throw error;
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
    const response = await fetch("/cosmic/api/webflow/sync", {
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
