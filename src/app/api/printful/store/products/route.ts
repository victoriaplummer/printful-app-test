import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/auth.config";
import { NextResponse } from "next/server";
import { WebflowClient } from "webflow-api";
import * as Webflow from "webflow-api/api";
import { getProviderToken } from "../../../auth/printful.config";
import {
  getPrintfulProducts,
  getPrintfulProduct,
  getPrintfulVariant,
} from "@/lib/api/printful";

// Define interfaces for type safety
interface CustomFieldData {
  sku?: string;
  lastSynced?: string;
  [key: string]: string | number | boolean | undefined; // More specific types for custom fields
}

interface PrintfulVariant {
  id: string | number;
  name: string;
  variant_id: string | number;
  product_id?: string | number;
  retail_price?: string;
  sku?: string;
  sync_variant_id?: string;
}

// Update the interface to match Printful's response structure
interface PrintfulVariantDetails {
  name: string;
  retail_price: string;
  files?: Array<{
    type: string;
    preview_url: string;
  }>;
  product: {
    image: string;
  };
  availability_status: string;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  if (!session.printfulAccessToken) {
    // Try to get token from Redis/memory as fallback
    const token = await getProviderToken("printful");
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    // Use the token from Redis/memory
    session.printfulAccessToken = token;
  }

  // Get siteId from URL params
  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get("siteId");

  if (!siteId) {
    return NextResponse.json(
      { error: "Webflow site ID is required" },
      { status: 400 }
    );
  }

  // Debug: Log session details
  // console.log("Printful Store Products API - Session:", {
  //   hasSession: !!session,
  //   hasPrintfulToken: !!session?.printfulAccessToken,
  //   tokenPrefix: session?.printfulAccessToken
  //     ? session.printfulAccessToken.substring(0, 10) + "..."
  //     : "none",
  //   sessionKeys: session ? Object.keys(session) : [],
  // });

  // Add type assertion for the token since we've already checked it exists
  const accessToken = session.printfulAccessToken as string;

  try {
    console.log(
      "Fetching Printful products with token:",
      accessToken.substring(0, 10) + "..."
    );

    // Step 1: Fetch all products from Printful
    const productsList = await getPrintfulProducts(accessToken);

    if (!Array.isArray(productsList) || productsList.length === 0) {
      console.log("No products found in Printful store");
      return NextResponse.json({ result: [] });
    }

    console.log(`Found ${productsList.length} products, fetching details...`);

    // Step 2: Fetch detailed information for each product and its variants
    const productsWithDetails = await Promise.all(
      productsList.map(async (product) => {
        try {
          const detailData = await getPrintfulProduct(
            product.id.toString(),
            accessToken // Use the asserted token
          );

          if (!detailData || !detailData.sync_variants) {
            throw new Error("Invalid product details response");
          }

          // Step 3: Fetch variant details
          const variantsWithDetails = await Promise.all(
            detailData.sync_variants.map(async (variant: PrintfulVariant) => {
              try {
                const variantDetails = (await getPrintfulVariant(
                  variant.id.toString(),
                  accessToken // Use the asserted token
                )) as PrintfulVariantDetails;

                // Create consistent variant object
                return {
                  id: variant.id.toString(),
                  name: variantDetails.name,
                  variant_id: variant.id.toString(),
                  product_id: product.id.toString(),
                  retail_price: variantDetails.retail_price || "0.00",
                  sku: variant.id.toString(),
                  thumbnail_url:
                    variantDetails.files?.find(
                      (file) => file.type === "preview"
                    )?.preview_url ||
                    variantDetails.product.image ||
                    "",
                  preview_url:
                    variantDetails.files?.find(
                      (file) => file.type === "preview"
                    )?.preview_url || null,
                  availability_status: variantDetails.availability_status,
                  sync_status: "not_synced" as const,
                  lastSynced: null,
                };
              } catch (error) {
                console.error(
                  `Error fetching variant details for ${variant.id}:`,
                  error
                );
                // Return fallback variant info
                return createFallbackVariant(variant, product.id);
              }
            })
          );

          return {
            id: product.id.toString(),
            name: product.name,
            thumbnail_url: product.thumbnail_url || "",
            variants: variantsWithDetails,
          };
        } catch (error) {
          console.error(`Error processing product ${product.id}:`, error);
          return createFallbackProduct(product);
        }
      })
    );

    // Step 4: Add Webflow sync status information
    const webflowProductsMap = new Map();
    if (session.webflowAccessToken && siteId) {
      try {
        const webflowClient = new WebflowClient({
          accessToken: session.webflowAccessToken as string,
        });

        const webflowProducts = await webflowClient.products.list(siteId);
        webflowProducts.items?.forEach((product: Webflow.ProductAndSkUs) => {
          const customFields = product.product
            ?.fieldData as unknown as CustomFieldData;
          if (customFields?.sku) {
            webflowProductsMap.set(customFields.sku, {
              lastSynced: customFields.lastSynced,
            });
          }
          product.skus?.forEach((sku: Webflow.Sku) => {
            const customSkuFields = sku.fieldData as unknown as CustomFieldData;
            if (customSkuFields?.sku) {
              webflowProductsMap.set(customSkuFields.sku, {
                lastSynced: customSkuFields.lastSynced,
              });
            }
          });
        });
      } catch (error) {
        console.error("Error fetching Webflow products:", error);
      }
    }

    // Update sync status for all products
    const productsWithSync = productsWithDetails.map((product) => ({
      ...product,
      variants: product.variants.map((variant) => {
        const webflowData = webflowProductsMap.get(variant.sku);
        return {
          ...variant,
          sync_status: webflowData ? "synced" : "not_synced",
          lastSynced: webflowData?.lastSynced || null,
        };
      }),
    }));

    // Return all products, regardless of sync status
    return NextResponse.json({ result: productsWithSync });
  } catch (error) {
    console.error("Error fetching Printful products:", error);
    return NextResponse.json(
      { error: "Failed to fetch Printful products" },
      { status: 500 }
    );
  }
}

// Helper functions for consistent fallback objects
function createFallbackVariant(
  variant: PrintfulVariant,
  productId: string | number
) {
  return {
    id: variant.id.toString(),
    name: variant.name,
    variant_id: variant.variant_id.toString(),
    product_id: productId.toString(),
    retail_price: variant.retail_price || "0.00",
    sku: variant.sku || `PF-${variant.variant_id}`,
    thumbnail_url: "",
    preview_url: null,
    availability_status: "unknown",
    sync_status: "not_synced" as const,
    lastSynced: null,
  };
}

function createFallbackProduct(product: {
  id: string | number;
  name: string;
  thumbnail_url?: string;
}) {
  return {
    id: product.id.toString(),
    name: product.name,
    thumbnail_url: product.thumbnail_url || "",
    variants: [],
    sync_status: "not_synced" as const,
  };
}
