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

      // Check if any of the variants are already synced to Webflow
      console.log("Checking if products already exist in Webflow...");

      // Fetch products using the Webflow client
      const productsResponse = await webflow.products.list(webflowSiteId);

      // Fetch schema to check if we need to create the sync-variant-id field
      const collectionsResponse = await webflow.collections.list(webflowSiteId);

      const productsCollection = collectionsResponse?.collections?.find(
        (c) => c.displayName === "Products"
      );

      const collectionDetails = await webflow.collections.get(
        productsCollection?.id || ""
      );
      const schema = collectionDetails.fields;

      // Define field interface
      interface SchemaField {
        id: string;
        displayName: string;
        type: string;
        required?: boolean;
      }

      // Check if lastSynced field exists in the product fields
      const hasProductLastSyncedField = schema.some(
        (field: SchemaField) => field.displayName === "lastSynced"
      );

      console.log(
        `Product field 'lastSynced' exists: ${hasProductLastSyncedField}`
      );

      // Create missing fields with Date type
      if (!hasProductLastSyncedField) {
        console.log("Creating lastSynced field for products...");
        try {
          await webflow.collections.fields.create(
            productsCollection?.id || "",
            {
              displayName: "lastSynced",
              type: "DateTime",
              isRequired: false,
            }
          );

          // Wait for Webflow to propagate schema changes
          await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait 3 seconds
        } catch (error) {
          console.error("Error creating product field:", error);
        }
      }

      // Double-check that schema changes have been applied
      const updatedSchema = await webflow.collections.get(
        productsCollection?.id || ""
      );

      const productHasField = updatedSchema.fields.some(
        (field: SchemaField) => field.displayName === "lastSynced"
      );

      if (!productHasField) {
        console.warn(
          "Some required fields are still missing after creation attempts"
        );
      }

      // Create a current timestamp for the lastSynced field
      const currentTimestamp = new Date().toISOString();

      // Extract product data from the API response
      console.log("=== PROCESSING PRODUCT DATA ===");
      const existingProducts = productsResponse.items || [];
      const existingSyncVariantIds: string[] = [];
      const existingSkuUpdates = {
        success: 0,
        failed: 0,
      };

      // Extract all sync_variant_ids from existing products
      for (const product of existingProducts as WebflowProductResponse[]) {
        // Check the product for sync_variant_id
        if (product.fieldData && product.fieldData["sync_variant_id"]) {
          const syncId = product.fieldData["sync_variant_id"];
          existingSyncVariantIds.push(
            typeof syncId === "string" ? syncId : String(syncId)
          );
        }

        // Check all SKUs for sync_variant_id
        if (product.skus && Array.isArray(product.skus)) {
          for (const sku of product.skus) {
            if (sku.fieldData && sku.fieldData["sync_variant_id"]) {
              const syncId = sku.fieldData["sync_variant_id"];
              existingSyncVariantIds.push(
                typeof syncId === "string" ? syncId : String(syncId)
              );
            }
          }
        }
      }

      // Check which variants need to be synced (not already in Webflow)
      const variantsToSync = printfulVariants.filter(
        (v: PrintfulSyncVariant) =>
          !existingSyncVariantIds.includes(v.sync_variant_id)
      );

      if (variantsToSync.length === 0) {
        console.log(
          "All variants are already synced to Webflow. Checking for stock updates..."
        );

        // Find products and SKUs with out-of-stock status
        const variantsToUpdate = printfulVariants.filter(
          (variant: PrintfulSyncVariant) =>
            variant.availability_status === "temporary_out_of_stock" ||
            variant.availability_status === "out_of_stock"
        );

        console.log(
          `Found ${variantsToUpdate.length} variants with out-of-stock status`
        );

        // Find each SKU by color and size instead of sync_variant_id
        for (const variant of variantsToUpdate) {
          // Add type annotation for variant
          const typedVariant: PrintfulSyncVariant = variant;

          // Parse variant name to extract color and size
          const parts = typedVariant.name.split(" / ");
          let colorValue, sizeValue;

          if (parts.length > 1) {
            colorValue = parts[0];
            sizeValue = parts[1];
          } else {
            colorValue = variant.name;
            sizeValue = "One Size";
          }

          // Find the SKU by color and size
          const matchingSkuInfo = await findMatchingSku(
            webflow,
            webflowSiteId,
            printfulProduct.name,
            colorValue,
            sizeValue
          );

          if (
            matchingSkuInfo &&
            matchingSkuInfo.productId &&
            matchingSkuInfo.skuId
          ) {
            const quantity = getQuantityForVariant(typedVariant);

            console.log(
              `Updating SKU quantity for ${typedVariant.name} to ${quantity}`
            );

            const success = await updateSkuQuantity(
              webflowSiteId,
              matchingSkuInfo.productId,
              matchingSkuInfo.skuId,
              quantity,
              session.webflowAccessToken as string
            );

            if (success) {
              existingSkuUpdates.success++;
            } else {
              existingSkuUpdates.failed++;
            }
          } else {
            console.warn(
              `Could not find matching SKU for variant: ${typedVariant.name}`
            );
            existingSkuUpdates.failed++;
          }
        }

        return NextResponse.json({
          message: `Updated stock information for ${existingSkuUpdates.success} SKUs`,
          status: "stock_updated",
          stockUpdates: existingSkuUpdates,
        });
      }

      // Create the product in Webflow
      console.log(`Creating product in Webflow: ${printfulProduct.name}`);

      // Get the first variant as the base SKU (required by Webflow)
      const firstVariant = variantsToSync[0];
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
            ["sku-properties"]: extractSkuProperties(variantsToSync),
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
                    quantity: getQuantityForVariant(variant),
                    "main-image":
                      variant.thumbnail_url || printfulProduct.thumbnail_url,
                    ["sku-values"]: variantSkuValues,
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
