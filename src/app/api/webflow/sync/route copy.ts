/* eslint-disable */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/auth.config";
import { WebflowClient } from "webflow-api";

interface PrintfulSyncVariant {
  id: string;
  name: string;
  variant_id: string;
  external_id?: string; // External ID may hold the Webflow ID
  sync_variant_id: string; // The sync_variant_id we want to store
  product_id: string;
  retail_price: string;
  thumbnail_url?: string;
  availability_status?: string; // Add availability_status field
  options?: Array<{
    id: string;
    value: string;
  }>;
}

// Helper function to extract variant properties for Webflow SKU properties
function extractSkuProperties(variants: PrintfulSyncVariant[]) {
  // Always use Color and Size options
  const allOptions = new Map<string, Set<string>>();
  allOptions.set("Color", new Set());
  allOptions.set("Size", new Set());

  variants.forEach((variant) => {
    // Parse the name for options regardless of what Printful provides
    const parts = variant.name.split(" / ");
    if (parts.length > 1) {
      // Assume first part is Color, second is Size (common pattern)
      allOptions.get("Color")?.add(parts[0]);
      allOptions.get("Size")?.add(parts[1]);
    } else {
      // Just use the name as Color if there's only one part
      allOptions.get("Color")?.add(variant.name);
      // Add a default size
      allOptions.get("Size")?.add("One Size");
    }
  });

  // Convert to Webflow SKU properties format
  const skuProperties = Array.from(allOptions.entries()).map(
    ([optionName, values]) => {
      return {
        id: optionName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        name: optionName,
        enum: Array.from(values).map((value) => ({
          id: value.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          name: value,
          slug: value.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        })),
      };
    }
  );

  return skuProperties;
}

// Helper function to generate SKU values for a variant
function generateSkuValues(variant: PrintfulSyncVariant) {
  const skuValues: Record<string, string> = {};

  // Always use Color and Size regardless of what Printful provides
  const parts = variant.name.split(" / ");
  if (parts.length > 1) {
    // First part is Color, second is Size
    skuValues["color"] = parts[0].toLowerCase().replace(/[^a-z0-9]+/g, "-");
    skuValues["size"] = parts[1].toLowerCase().replace(/[^a-z0-9]+/g, "-");
  } else {
    // Just the name as Color and a default Size
    skuValues["color"] = variant.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    skuValues["size"] = "one-size";
  }

  return skuValues;
}

// Helper function to get quantity based on availability status
function getQuantityForVariant(variant: PrintfulSyncVariant): number {
  // Check if out of stock
  if (
    variant.availability_status === "temporary_out_of_stock" ||
    variant.availability_status === "out_of_stock"
  ) {
    return 0;
  }

  // Default quantity for in-stock items
  return 999; // Using 999 as a default "in stock" quantity
}

// Helper function to update an existing SKU
async function updateSkuQuantity(
  webflowSiteId: string,
  productId: string,
  skuId: string,
  quantity: number,
  accessToken: string
): Promise<boolean> {
  try {
    console.log(`Updating SKU ${skuId} quantity to ${quantity}`);

    const response = await fetch(
      `https://api.webflow.com/v2/sites/${webflowSiteId}/products/${productId}/skus/${skuId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          fieldData: {
            quantity: quantity,
          },
        }),
      }
    );

    if (!response.ok) {
      const responseText = await response.text();
      console.error(`Failed to update SKU quantity: ${responseText}`);
      return false;
    }

    console.log(`Successfully updated SKU ${skuId} quantity`);
    return true;
  } catch (error) {
    console.error(`Error updating SKU: ${error}`);
    return false;
  }
}

// Define interface to match actual API response
interface WebflowProductResponse {
  id?: string; // Add ID to the product response
  fieldData?: {
    printful_id?: string;
    sync_variant_id?: string;
    lastSynced?: string;
    [key: string]: string | number | boolean | object | undefined;
  };
  sku?: {
    // Add sku property for the main SKU
    id?: string;
    fieldData?: {
      [key: string]: string | number | boolean | object | undefined;
    };
  };
  skus?: Array<{
    id?: string; // Add ID to the SKU response
    fieldData?: {
      printful_id?: string;
      sync_variant_id?: string;
      [key: string]: string | number | boolean | object | undefined;
    };
  }>;
}

// Helper function to find a matching SKU by color and size
async function findMatchingSku(
  webflow: WebflowClient,
  webflowSiteId: string,
  productName: string,
  colorValue: string,
  sizeValue: string
): Promise<{ productId?: string; skuId?: string } | null> {
  try {
    console.log(
      `Looking for SKU match: ${productName}, Color: ${colorValue}, Size: ${sizeValue}`
    );

    // Normalized values for matching
    const normalizedColor = colorValue
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
    const normalizedSize = sizeValue.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    // Get all products
    const productsResponse = await webflow.products.list(webflowSiteId);
    const products = productsResponse.items || [];

    // Find matching product by name first
    const matchingProducts = products.filter((product) => {
      // Use type assertion with unknown as an intermediate step
      const productData = product as unknown as WebflowProductResponse;
      const name = productData.fieldData?.name;
      return (
        name &&
        name.toString().toLowerCase().includes(productName.toLowerCase())
      );
    });

    console.log(
      `Found ${matchingProducts.length} potential product matches for "${productName}"`
    );

    // Look through each product's SKUs
    for (const product of matchingProducts) {
      const typedProduct = product as WebflowProductResponse;

      // Check the main SKU
      if (typedProduct.sku?.fieldData?.["sku-values"]) {
        const skuValues = typedProduct.sku.fieldData["sku-values"] as Record<
          string,
          string
        >;

        if (
          skuValues?.color === normalizedColor &&
          skuValues?.size === normalizedSize
        ) {
          console.log(
            `Found matching main SKU for product ${typedProduct.fieldData?.name}`
          );
          return {
            productId: typedProduct.id,
            skuId: typedProduct.sku.id,
          };
        }
      }

      // Check additional SKUs
      if (typedProduct.skus && Array.isArray(typedProduct.skus)) {
        for (const sku of typedProduct.skus) {
          if (sku.fieldData?.["sku-values"]) {
            const skuValues = sku.fieldData["sku-values"] as Record<
              string,
              string
            >;

            if (
              skuValues?.color === normalizedColor &&
              skuValues?.size === normalizedSize
            ) {
              console.log(
                `Found matching SKU for product ${typedProduct.fieldData?.name}`
              );
              return {
                productId: typedProduct.id,
                skuId: sku.id,
              };
            }
          }
        }
      }
    }

    console.log(
      `No matching SKU found for ${productName}, Color: ${colorValue}, Size: ${sizeValue}`
    );
    return null;
  } catch (error) {
    console.error(`Error finding matching SKU: ${error}`);
    return null;
  }
}

// Add helper function to find existing SKU by Printful variant_id
async function findExistingSkuByVariantId(
  webflow: WebflowClient,
  webflowSiteId: string,
  printfulVariantId: string
): Promise<{ productId?: string; skuId?: string } | null> {
  try {
    console.log(
      `Looking for SKU with Printful variant_id: ${printfulVariantId}`
    );

    // Get all products
    const productsResponse = await webflow.products.list(webflowSiteId);
    const products = productsResponse.items || [];

    // Look through each product's SKUs
    for (const product of products) {
      const typedProduct = product as WebflowProductResponse;

      // Check the main SKU
      if (typedProduct.sku?.fieldData?.sku === printfulVariantId) {
        console.log(
          `Found matching main SKU for product ${typedProduct.fieldData?.name}`
        );
        return {
          productId: typedProduct.id,
          skuId: typedProduct.sku.id,
        };
      }

      // Check additional SKUs
      if (typedProduct.skus && Array.isArray(typedProduct.skus)) {
        for (const sku of typedProduct.skus) {
          if (sku.fieldData?.sku === printfulVariantId) {
            console.log(
              `Found matching SKU for product ${typedProduct.fieldData?.name}`
            );
            return {
              productId: typedProduct.id,
              skuId: sku.id,
            };
          }
        }
      }
    }

    console.log(`No matching SKU found for variant_id: ${printfulVariantId}`);
    return null;
  } catch (error) {
    console.error(`Error finding matching SKU: ${error}`);
    return null;
  }
}

// Add new helper function to find existing product by any variant
async function findExistingProductByAnyVariant(
  webflow: WebflowClient,
  webflowSiteId: string,
  printfulVariants: PrintfulSyncVariant[]
): Promise<string | null> {
  for (const variant of printfulVariants) {
    const existingSku = await findExistingSkuByVariantId(
      webflow,
      webflowSiteId,
      variant.variant_id
    );
    if (existingSku?.productId) {
      return existingSku.productId;
    }
  }
  return null;
}

export async function POST(request: Request) {
  try {
    console.log("=== STARTING WEBFLOW SYNC PROCESS ===");
    // Get session to check if user is authenticated and has both tokens
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !session.webflowAccessToken ||
      !session.printfulAccessToken
    ) {
      return NextResponse.json(
        {
          error:
            "Unauthorized. Please connect both Printful and Webflow accounts.",
        },
        { status: 401 }
      );
    }

    // Parse the request body to get the product ID and site ID
    const body = await request.json();
    const { productId, siteId, collectionId } = body;

    if (!productId || !siteId) {
      return NextResponse.json(
        { error: "Missing required parameters: productId and siteId" },
        { status: 400 }
      );
    }

    // Log the sync request
    console.log(
      `Syncing Printful product ${productId} to Webflow site ${siteId}${
        collectionId ? ` (collection: ${collectionId})` : ""
      }...`
    );

    console.log("=== FETCHING PRINTFUL PRODUCT DETAILS ===");
    // Get the detailed product info from Printful
    const printfulResponse = await fetch(
      `https://api.printful.com/store/products/${productId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.printfulAccessToken}`,
          "Content-type": "application/json",
        },
      }
    );

    if (!printfulResponse.ok) {
      console.error("Failed to fetch product details from Printful");
      return NextResponse.json(
        { error: "Failed to fetch product details from Printful" },
        { status: printfulResponse.status }
      );
    }

    const printfulData = await printfulResponse.json();
    const printfulProduct = printfulData.result.sync_product;
    const printfulVariants = printfulData.result.sync_variants;

    if (!printfulVariants || printfulVariants.length === 0) {
      return NextResponse.json(
        { error: "No variants found for this Printful product" },
        { status: 404 }
      );
    }

    console.log(`Found ${printfulVariants.length} variants for product`);

    // Log all variant data to analyze stock information
    console.log("=== PRINTFUL VARIANT DATA (STOCK INFO) ===");
    printfulVariants.forEach((variant: PrintfulSyncVariant, index: number) => {
      console.log(`Variant ${index + 1}/${printfulVariants.length}:`);
      console.log({
        id: variant.id,
        name: variant.name,
        variantId: variant.variant_id,
        syncVariantId: variant.sync_variant_id,
        price: variant.retail_price,
        availabilityStatus: variant.hasOwnProperty("availability_status")
          ? variant.availability_status
          : "not provided",
        options: variant.options,
      });
    });

    // Get the site and check for a products collection
    const webflowSiteId = siteId;

    try {
      console.log(`=== STARTING WEBFLOW API OPERATIONS ===`);
      // Create Webflow client
      const webflow = new WebflowClient({
        accessToken: session.webflowAccessToken as string,
      });

      // First, check if we already have this product in Webflow
      const existingProductId = await findExistingProductByAnyVariant(
        webflow,
        webflowSiteId,
        printfulVariants
      );

      if (existingProductId) {
        console.log(`Found existing product: ${existingProductId}`);

        // Check which variants need to be added/updated
        const variantsToSync: PrintfulSyncVariant[] = [];
        const existingVariants: PrintfulSyncVariant[] = [];

        for (const variant of printfulVariants) {
          const existingSku = await findExistingSkuByVariantId(
            webflow,
            webflowSiteId,
            variant.variant_id
          );

          if (existingSku) {
            existingVariants.push(variant);
          } else {
            variantsToSync.push(variant);
          }
        }

        // Update existing variants
        const stockUpdates = {
          success: 0,
          failed: 0,
        };

        // Update existing SKUs
        for (const variant of existingVariants) {
          const existingSku = await findExistingSkuByVariantId(
            webflow,
            webflowSiteId,
            variant.variant_id
          );

          if (existingSku?.skuId) {
            const quantity = getQuantityForVariant(variant);
            const success = await updateSkuQuantity(
              webflowSiteId,
              existingProductId,
              existingSku.skuId,
              quantity,
              session.webflowAccessToken as string
            );

            if (success) {
              stockUpdates.success++;
            } else {
              stockUpdates.failed++;
            }
          }
        }

        // Add new variants to existing product if any
        if (variantsToSync.length > 0) {
          // Use the existing bulk SKU creation code here, but with existingProductId
          const bulkSkuData = {
            publishStatus: "live",
            skus: variantsToSync.map((variant) => ({
              fieldData: {
                name: `${printfulProduct.name} - ${variant.name}`,
                slug: `${printfulProduct.name
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")}-${variant.name
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")}`,
                price: {
                  value: Math.round(parseFloat(variant.retail_price) * 100),
                  unit: "USD",
                },
                "main-image":
                  variant.thumbnail_url || printfulProduct.thumbnail_url,
                ["sku-values"]: generateSkuValues(variant),
                ["sku"]: variant.variant_id.toString(),
              },
            })),
          };

          // Add new SKUs to existing product
          const response = await fetch(
            `https://api.webflow.com/v2/sites/${webflowSiteId}/products/${existingProductId}/skus`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${session.webflowAccessToken}`,
                "Content-type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify(bulkSkuData),
            }
          );

          // Handle response...
        }

        return NextResponse.json({
          message: "Product updated successfully",
          status: "success",
          productId: existingProductId,
          updates: {
            existingVariants: stockUpdates,
            newVariants: variantsToSync.length,
          },
        });
      }

      // If no existing product found, continue with current creation logic...
      console.log(`Creating product in Webflow: ${printfulProduct.name}`);

      // Get the first variant as the base SKU (required by Webflow)
      const firstVariant = printfulVariants[0];
      if (!firstVariant) {
        return NextResponse.json({
          error: "No variants available to sync",
          status: "error",
        });
      }

      // Preparing the product data for Webflow
      const productData = {
        publishStatus: "live" as "staging" | "live",
        product: {
          fieldData: {
            name: printfulProduct.name,
            slug: printfulProduct.name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-"),
            description: printfulProduct.description || "",
            ["sku-properties"]: extractSkuProperties(printfulVariants),
            // ["lastSynced"]: currentTimestamp,
          },
        },
        sku: {
          fieldData: {
            name: `${printfulProduct.name} - ${firstVariant.name}`,
            slug: `${printfulProduct.name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")}-${firstVariant.name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")}`,
            price: {
              value: Math.round(parseFloat(firstVariant.retail_price) * 100),
              currency: "USD",
              unit: "USD",
            },
            // quantity: getQuantityForVariant(firstVariant),
            "main-image":
              firstVariant.thumbnail_url || printfulProduct.thumbnail_url,
            ["sku-values"]: generateSkuValues(firstVariant),
            ["sku"]: firstVariant.variant_id.toString(),
          },
        },
      };

      console.log("Creating product with initial SKU...");

      try {
        // Create product using the SDK - use only fields that are guaranteed to be supported
        const result = await webflow.products.create(
          webflowSiteId,
          productData
        );

        console.log("Product created successfully!");

        // Process additional variants if they exist
        const additionalSkuResults = {
          success: 0,
          failed: 0,
          errors: [] as string[],
        };

        if (printfulVariants.length > 1 && result.product?.id) {
          console.log(
            `Creating ${printfulVariants.length - 1} additional SKUs...`
          );

          try {
            // Prepare all remaining variants (skip the first one which was created with the product)
            const remainingVariants = printfulVariants.slice(1);

            // Use direct fetch API call instead of SDK to bypass type issues
            const bulkSkuData = {
              publishStatus: "live", // Keep as string for direct API call
              skus: remainingVariants.map((variant: PrintfulSyncVariant) => {
                const variantSkuValues = generateSkuValues(variant);
                return {
                  fieldData: {
                    name: `${printfulProduct.name} - ${variant.name}`,
                    slug: `${printfulProduct.name
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")}-${variant.name
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")}`,
                    price: {
                      value: Math.round(parseFloat(variant.retail_price) * 100),
                      unit: "USD",
                    },
                    // quantity: getQuantityForVariant(variant),
                    "main-image":
                      variant.thumbnail_url || printfulProduct.thumbnail_url,
                    ["sku-values"]: variantSkuValues,
                    ["sku"]: variant.variant_id.toString(),
                  },
                };
              }),
            };

            const response = await fetch(
              `https://api.webflow.com/v2/sites/${webflowSiteId}/products/${result.product.id}/skus`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${session.webflowAccessToken}`,
                  "Content-type": "application/json",
                  Accept: "application/json",
                },
                body: JSON.stringify(bulkSkuData),
              }
            );

            const responseText = await response.text();

            if (!response.ok) {
              let errorData;
              try {
                errorData = JSON.parse(responseText);
              } catch {
                errorData = { rawText: responseText };
              }
              console.error(
                "Detailed error from Webflow API:",
                JSON.stringify(errorData, null, 2)
              );
              throw new Error(
                `Failed to create SKUs: ${JSON.stringify(errorData)}`
              );
            }

            const responseData = JSON.parse(responseText);
            const skusCreated = responseData.skus?.length || 0;
            console.log(
              `Successfully created ${skusCreated} SKUs in bulk request`
            );
            additionalSkuResults.success = skusCreated;
          } catch (error) {
            console.error("Failed to create additional SKUs:", error);
            additionalSkuResults.failed = printfulVariants.length - 1;
            additionalSkuResults.errors.push(
              error instanceof Error ? error.message : String(error)
            );
          }

          // Wait 5 seconds before proceeding
          await new Promise((resolve) => setTimeout(resolve, 5000));

          console.log(
            `Successfully created ${additionalSkuResults.success} SKUs, failed: ${additionalSkuResults.failed}`
          );
        }

        return NextResponse.json({
          message: "Product synced successfully to Webflow",
          productId: printfulProduct.id,
          webflowProductId: result.product?.id || "unknown",
          status: "success",
          variantStats:
            printfulVariants.length > 1
              ? {
                  total: printfulVariants.length,
                  skipped: 1, // First variant already created with product
                  success: additionalSkuResults.success,
                  failed: additionalSkuResults.failed,
                }
              : undefined,
        });
      } catch (error) {
        console.error("Error creating Webflow product:", error);
        return NextResponse.json(
          {
            error: "Failed to create product in Webflow",
            details: error instanceof Error ? error.message : String(error),
            status: "error",
          },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error("Error in sync process:", error);
      return NextResponse.json(
        {
          error: "Failed to sync product to Webflow",
          details: error instanceof Error ? error.message : String(error),
          status: "error",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error syncing product:", error);
    return NextResponse.json(
      {
        error: "Failed to sync product to Webflow",
        details: error instanceof Error ? error.message : String(error),
        status: "error",
      },
      { status: 500 }
    );
  }
}
