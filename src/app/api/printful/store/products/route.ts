import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/auth.config";
import { NextResponse } from "next/server";
import { WebflowClient } from "@webflow/webflow-client";

// Define interfaces for type safety
interface PrintfulVariant {
  id: string | number;
  name: string;
  variant_id: string | number;
  retail_price?: string;
  sku?: string;
}

export async function GET() {
  const session = await getServerSession(authOptions);

  // Debug: Log session details
  // console.log("Printful Store Products API - Session:", {
  //   hasSession: !!session,
  //   hasPrintfulToken: !!session?.printfulAccessToken,
  //   tokenPrefix: session?.printfulAccessToken
  //     ? session.printfulAccessToken.substring(0, 10) + "..."
  //     : "none",
  //   sessionKeys: session ? Object.keys(session) : [],
  // });

  if (!session?.printfulAccessToken) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  try {
    console.log(
      "Fetching Printful products with token:",
      session.printfulAccessToken.substring(0, 10) + "..."
    );

    // Step 1: Fetch the list of products
    const productsResponse = await fetch(
      "https://api.printful.com/store/products",
      {
        headers: {
          Authorization: `Bearer ${session.printfulAccessToken}`,
        },
      }
    );

    if (!productsResponse.ok) {
      console.error(
        "Printful API error:",
        productsResponse.status,
        productsResponse.statusText
      );
      return NextResponse.json(
        { error: "Failed to fetch products from Printful" },
        { status: productsResponse.status }
      );
    }

    const productsData = await productsResponse.json();
    const productsList = productsData.result || [];

    if (!Array.isArray(productsList) || productsList.length === 0) {
      console.log("No products found in Printful store");
      return NextResponse.json({ result: [] });
    }

    console.log(`Found ${productsList.length} products, fetching details...`);

    // Step 2: If we have a Webflow token, try to fetch the lastSynced info
    let webflowProducts: any[] = [];
    if (session.webflowAccessToken) {
      try {
        // Get the user's default Webflow site ID from settings
        // (You may need to adjust this to get the actual siteId)
        const settingsResponse = await fetch("/api/user/settings", {
          headers: {
            Cookie: `next-auth.session-token=${session.sessionToken || ""}`,
          },
        });

        if (settingsResponse.ok) {
          const settings = await settingsResponse.json();
          const defaultSiteId = settings?.webflowSettings?.siteId;

          if (defaultSiteId) {
            // Fetch products from Webflow
            const webflowClient = new WebflowClient({
              accessToken: session.webflowAccessToken,
            });

            const webflowResponse = await webflowClient.products.list(
              defaultSiteId
            );
            webflowProducts = webflowResponse.items || [];

            console.log(`Found ${webflowProducts.length} products in Webflow`);
          }
        }
      } catch (error) {
        console.error("Error fetching Webflow products:", error);
        // Non-critical error, continue without Webflow data
      }
    }

    // Create lookup map for Webflow products based on sync_variant_id
    const webflowProductsMap = new Map();
    webflowProducts.forEach((product) => {
      // Check product's field data for sync_variant_id
      if (product.fieldData && product.fieldData.lastSynced) {
        webflowProductsMap.set(product.fieldData.sync_variant_id, {
          lastSynced: product.fieldData.lastSynced,
        });
      }

      // Check SKUs
      if (product.skus && Array.isArray(product.skus)) {
        product.skus.forEach((sku) => {
          if (sku.fieldData && sku.fieldData.lastSynced) {
            webflowProductsMap.set(sku.fieldData.sync_variant_id, {
              lastSynced: sku.fieldData.lastSynced,
            });
          }
        });
      }
    });

    // Step 3: Fetch detailed information for each product in parallel
    const productsWithDetails = await Promise.all(
      productsList.map(async (product) => {
        try {
          const detailResponse = await fetch(
            `https://api.printful.com/store/products/${product.id}`,
            {
              headers: {
                Authorization: `Bearer ${session.printfulAccessToken}`,
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
              (variant: PrintfulVariant) => {
                const webflowData = webflowProductsMap.get(
                  variant.sync_variant_id
                );

                return {
                  id: variant.id.toString(),
                  name: variant.name,
                  variant_id: variant.variant_id.toString(),
                  product_id: product.id.toString(),
                  retail_price: variant.retail_price || "0.00",
                  sync_status: webflowData ? "synced" : "not_synced",
                  lastSynced: webflowData?.lastSynced || null,
                  sku: variant.sku || "",
                };
              }
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
    return NextResponse.json({ result: productsWithDetails });
  } catch (error) {
    console.error("Error fetching Printful products:", error);
    return NextResponse.json(
      { error: "Failed to fetch Printful products" },
      { status: 500 }
    );
  }
}
