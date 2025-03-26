import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/auth.config";
import { WebflowClient } from "webflow-api";
import { getPrintfulProduct, getPrintfulVariant } from "@/lib/api/printful";

interface WebflowProductResponse {
  id: string;
  fieldData: {
    name: string;
    [key: string]: string | number | boolean | object | undefined;
  };
  sku?: {
    id: string;
    fieldData: {
      sku: string;
      [key: string]: string | number | boolean | object | undefined;
    };
  };
  skus?: Array<{
    id: string;
    fieldData: {
      sku: string;
      [key: string]: string | number | boolean | object | undefined;
    };
  }>;
}

interface PrintfulSyncVariant {
  id: number;
  name: string;
  variant_id: number;
  retail_price: string;
  size: string;
  color: string;
  product: {
    variant_id: number;
    product_id: number;
    image: string;
    name: string;
  };
  files: Array<{
    thumbnail_url: string;
    preview_url: string;
    [key: string]: string | undefined;
  }>;
  availability_status: string;
  [key: string]: string | number | boolean | object | undefined;
}

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
}

async function findExistingProduct(
  webflow: WebflowClient,
  siteId: string,
  variantId: string | number
): Promise<{ productId?: string; skuId?: string } | null> {
  // Convert variantId to string for comparison
  const variantIdString = variantId.toString();
  console.log(`🔍 Searching for variant_id: ${variantIdString}`);

  const products = await webflow.products.list(siteId);
  console.log(`Found ${products.items?.length || 0} total products to check`);

  for (const product of products.items || []) {
    const typedProduct = product as WebflowProductResponse;

    // Log main SKU check
    if (typedProduct.sku?.fieldData.sku) {
      console.log(
        `Checking main SKU: ${
          typedProduct.sku.fieldData.sku
        } (${typeof typedProduct.sku.fieldData
          .sku}) against ${variantIdString} (${typeof variantIdString})`
      );
    }

    // Check main SKU - ensure string comparison
    if (typedProduct.sku?.fieldData.sku === variantIdString) {
      console.log("✅ Found match in main SKU!");
      return {
        productId: typedProduct.id,
        skuId: typedProduct.sku.id,
      };
    }

    // Log additional SKUs check
    if (typedProduct.skus?.length) {
      console.log(
        `Checking ${typedProduct.skus.length} additional SKUs for product ${typedProduct}`
      );
    }

    // Check additional SKUs - ensure string comparison
    for (const sku of typedProduct.skus || []) {
      if (sku.fieldData.sku) {
        console.log(
          `Checking SKU: ${sku.fieldData.sku} (${typeof sku.fieldData
            .sku}) against ${variantIdString} (${typeof variantIdString})`
        );
      }
      if (sku.fieldData.sku === variantIdString) {
        console.log("✅ Found match in additional SKUs!");
        return {
          productId: typedProduct.id,
          skuId: sku.id,
        };
      }
    }
  }

  console.log("❌ No matching SKU found");
  return null;
}

function extractSkuProperties(variants: PrintfulSyncVariant[]) {
  const allOptions = new Map<string, Set<string>>();
  allOptions.set("Color", new Set());
  allOptions.set("Size", new Set());

  variants.forEach((variant) => {
    console.log("Variant:", variant);
    allOptions.get("Color")?.add(variant.color || "Default");
    allOptions.get("Size")?.add(variant.size || "One Size");
  });

  return Array.from(allOptions.entries()).map(([optionName, values]) => ({
    id: optionName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name: optionName,
    enum: Array.from(values).map((value) => ({
      id: value.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name: value,
      slug: value.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    })),
  }));
}

function generateSkuValues(variant: PrintfulSyncVariant) {
  return {
    color: (variant.color || "Default")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-"),
    size: (variant.size || "One Size")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-"),
  };
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.webflowAccessToken || !session?.printfulAccessToken) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { productId, siteId } = await request.json();
    if (!productId || !siteId) {
      return NextResponse.json(
        { error: "Product ID and Site ID are required" },
        { status: 400 }
      );
    }

    // Use the shared function to get product details
    const printfulProduct = await getPrintfulProduct(
      productId,
      session.printfulAccessToken
    );

    if (!printfulProduct || !printfulProduct.sync_variants) {
      throw new Error("Invalid product details response");
    }

    // Fetch variant details
    const variantsWithDetails = await Promise.all(
      printfulProduct.sync_variants.map(
        async (variant: PrintfulSyncVariant) => {
          try {
            const variantDetails = (await getPrintfulVariant(
              variant.id.toString(),
              session.printfulAccessToken as string
            )) as PrintfulVariantDetails;

            return {
              id: variant.id.toString(),
              name: variantDetails.name,
              variant_id: variant.id.toString(),
              product_id: productId,
              retail_price: variantDetails.retail_price || "0.00",
              sku: variant.id.toString(),
              color: variant.color,
              size: variant.size,
              thumbnail_url:
                variantDetails.files?.find((file) => file.type === "preview")
                  ?.preview_url ||
                variantDetails.product.image ||
                "",
              preview_url:
                variantDetails.files?.find((file) => file.type === "preview")
                  ?.preview_url || null,
            };
          } catch (error) {
            console.error(
              `Error fetching variant details for ${variant.id}:`,
              error
            );
            // Return basic variant info on error
            return {
              id: variant.id.toString(),
              name: variant.name,
              variant_id: variant.variant_id.toString(),
              product_id: productId,
              retail_price: variant.retail_price || "0.00",
              sku: variant.id.toString(),
              thumbnail_url: "",
              preview_url: null,
              color: variant.color,
              size: variant.size,
            };
          }
        }
      )
    );

    const detailedProduct = {
      id: productId,
      name: printfulProduct.sync_product.name,
      thumbnail_url: printfulProduct.thumbnail_url || "",
      variants: variantsWithDetails,
    };

    console.log("Printful Product:", detailedProduct);

    console.log("\n=== Starting Sync Check ===");
    console.log("Product:", detailedProduct.name);
    console.log(
      "Variants to check:",
      detailedProduct.variants.map((v: PrintfulSyncVariant) => v.variant_id)
    );

    // 2. Initialize Webflow client
    const webflow = new WebflowClient({
      accessToken: session.webflowAccessToken,
    });

    // 3. Check if any variant exists in Webflow
    const existingProduct = await findExistingProduct(
      webflow,
      siteId,
      detailedProduct.variants[0].variant_id
    );

    // Add a pause to inspect the logs
    console.log("\n🔍 Sync Check Results:");
    console.log("Existing product found:", existingProduct ? "YES" : "NO");
    if (existingProduct) {
      console.log("Product ID:", existingProduct.productId);
      console.log("SKU ID:", existingProduct.skuId);
    }

    // Remove the if condition around the pause
    console.log("\n⏳ Waiting 5 seconds before proceeding...");
    await new Promise((resolve) => setTimeout(resolve, 5000));
    console.log("Proceeding with operation...");

    if (existingProduct) {
      // Update existing product's SKUs
      const skusToAdd = [];
      for (const variant of detailedProduct.variants) {
        const exists = await findExistingProduct(
          webflow,
          siteId,
          variant.variant_id
        );
        if (!exists) {
          console.log(`Adding variant ${variant.variant_id} to skusToAdd`);
          skusToAdd.push({
            fieldData: {
              name: `${detailedProduct.name} - ${variant.name}`,
              slug: `${detailedProduct.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")}-${variant.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")}`,
              sku: variant.variant_id.toString(),
              ["sku-values"]: {
                color:
                  variant.variant_properties?.find(
                    (p: { type: string }) => p.type === "color"
                  )?.value || "",
                size:
                  variant.variant_properties?.find(
                    (p: { type: string }) => p.type === "size"
                  )?.value || "",
              },
              price: {
                value: Math.round(parseFloat(variant.retail_price) * 100),
                unit: "USD",
              },
              "main-image":
                variant.thumbnail_url || detailedProduct.thumbnail_url,
            },
          });
        }
      }

      if (skusToAdd.length > 0) {
        console.log(`Attempting to add ${skusToAdd.length} SKUs...`);
        const skuResponse = await fetch(
          `https://api.webflow.com/v2/sites/${siteId}/products/${existingProduct.productId}/skus`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.webflowAccessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              publishStatus: "live",
              skus: skusToAdd,
            }),
          }
        );

        if (!skuResponse.ok) {
          const errorText = await skuResponse.text();
          console.error("Failed to add SKUs:", errorText);
          throw new Error(`Failed to add SKUs: ${errorText}`);
        }

        const skuResult = await skuResponse.json();
        console.log("SKUs creation response:", skuResult);
      }

      return NextResponse.json({
        message: "Product updated successfully",
        productId: existingProduct.productId,
        skusAdded: skusToAdd.length,
      });
    }

    // 4. Create new product if it doesn't exist
    const productData = {
      publishStatus: "live" as const,
      product: {
        fieldData: {
          name: detailedProduct.name,
          slug: detailedProduct.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          ["sku-properties"]: extractSkuProperties(detailedProduct.variants),
          lastsynced: new Date().toISOString(),
        },
      },
      sku: {
        fieldData: {
          name: `${detailedProduct.name} - ${detailedProduct.variants[0].color} / ${detailedProduct.variants[0].size}`,
          slug: `${detailedProduct.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")}-${
            detailedProduct.variants[0].variant_id
          }`,
          sku: detailedProduct.variants[0].id.toString(),
          price: {
            value: Math.round(
              parseFloat(detailedProduct.variants[0].retail_price) * 100
            ),
            unit: "USD",
          },
          ["sku-values"]: generateSkuValues(detailedProduct.variants[0]),
          "main-image":
            detailedProduct.variants[0].preview_url ||
            detailedProduct.variants[0].thumbnail_url,
          ["sync-variant-id"]: "TEST",
        },
      },
    };

    const result = await webflow.products.create(siteId, productData);

    // 5. Add remaining variants as SKUs
    if (detailedProduct.variants.length > 1 && result.product?.id) {
      console.log(
        `Creating ${
          detailedProduct.variants.length - 1
        } additional SKUs for new product...`
      );
      const remainingSkus = detailedProduct.variants
        .slice(1)
        .map((variant: PrintfulSyncVariant) => ({
          fieldData: {
            name: `${detailedProduct.name} - ${variant.color} / ${variant.size}`,
            slug: `${detailedProduct.name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")}-${variant.variant_id}`,
            sku: variant.id.toString(),
            price: {
              value: Math.round(parseFloat(variant.retail_price) * 100),
              unit: "USD",
            },
            ["sku-values"]: generateSkuValues(variant),
            "main-image": variant.preview_url || variant.thumbnail_url,
          },
        }));

      const skuResponse = await fetch(
        `https://api.webflow.com/v2/sites/${siteId}/products/${result.product.id}/skus`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.webflowAccessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            publishStatus: "live",
            skus: remainingSkus,
          }),
        }
      );

      if (!skuResponse.ok) {
        const errorText = await skuResponse.text();
        console.error("Failed to add SKUs to new product:", errorText);
        throw new Error(`Failed to add SKUs to new product: ${errorText}`);
      }

      const skuResult = await skuResponse.json();
      console.log("SKUs creation response for new product:", skuResult);
    }

    return NextResponse.json({
      message: "Product created successfully",
      productId: result.product?.id,
      variantsAdded: detailedProduct.variants.length - 1,
    });
  } catch (error) {
    console.error("Error in sync process:", error);
    return NextResponse.json(
      { error: "Failed to sync product" },
      { status: 500 }
    );
  }
}
