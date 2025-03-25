// import { NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/app/api/auth/auth.config";
// import { WebflowClient } from "webflow-api";

// interface PrintfulProduct {
//   sync_product: {
//     id: number;
//     name: string;
//     thumbnail_url: string;
//   };
//   sync_variants: Array<{
//     id: number;
//     variant_id: number;
//     name: string;
//     retail_price: string;
//   }>;
// }

// // Interface for Webflow API response items
// interface WebflowApiProduct {
//   id?: string;
//   _id?: string;
//   name?: string;
//   slug?: string;
//   sku?: string;
//   printfulId?: string;
//   product?: {
//     id?: string;
//   };
//   // Use specific types instead of any
//   [key: string]: string | number | boolean | object | undefined;
// }

// export async function POST(request: Request) {
//   console.log("=== STARTING PRODUCTS SYNC PROCESS ===");
//   const session = await getServerSession(authOptions);

//   // Parse request body if needed
//   const body = await request.json().catch(() => ({}));
//   console.log("Request body:", JSON.stringify(body, null, 2));

//   if (!session?.accessToken || !session?.webflowAccessToken) {
//     return NextResponse.json(
//       { error: "Authentication required for both services" },
//       { status: 401 }
//     );
//   }

//   const webflow = new WebflowClient({
//     accessToken: session.webflowAccessToken,
//   });

//   try {
//     console.log("=== FETCHING PRINTFUL PRODUCTS ===");
//     // 1. Get Printful products
//     const printfulResponse = await fetch(
//       "https://api.printful.com/store/products",
//       {
//         headers: {
//           Authorization: `Bearer ${session.accessToken}`,
//         },
//       }
//     );
//     const printfulData = await printfulResponse.json();
//     console.log(
//       `Fetched ${printfulData.result?.length || 0} products from Printful`
//     );
//     console.log(
//       "First Printful product sample:",
//       printfulData.result?.length > 0
//         ? JSON.stringify(printfulData.result[0], null, 2)
//         : "No products"
//     );

//     if (!printfulData.result || printfulData.code !== 200) {
//       throw new Error("Failed to fetch Printful products");
//     }

//     // Get siteId from request body
//     const { siteId } = body;
//     console.log(`Using Webflow site ID: ${siteId}`);

//     if (!siteId) {
//       throw new Error("Webflow site ID is required");
//     }

//     // 3. Get existing Webflow products
//     console.log("=== FETCHING EXISTING WEBFLOW PRODUCTS ===");
//     const webflowProductsResponse = await webflow.products.list(siteId);
//     console.log(
//       "Webflow products response:",
//       JSON.stringify(webflowProductsResponse, null, 2)
//     );

//     const webflowProducts = (webflowProductsResponse?.items ||
//       []) as WebflowApiProduct[];
//     console.log(`Found ${webflowProducts.length} existing products in Webflow`);
//     console.log(
//       "First Webflow product sample:",
//       webflowProducts.length > 0
//         ? JSON.stringify(webflowProducts[0], null, 2)
//         : "No products"
//     );

//     // 4. Sync products
//     console.log("=== STARTING PRODUCT SYNC MAPPING ===");
//     const results = await Promise.all(
//       printfulData.result.map(async (printfulProduct: PrintfulProduct) => {
//         const existingProduct = webflowProducts.find(
//           (wp) => wp.printfulId === printfulProduct.sync_product.id.toString()
//         );

//         console.log(
//           `Processing product ${printfulProduct.sync_product.name} (ID: ${printfulProduct.sync_product.id})`
//         );
//         console.log(`Existing in Webflow: ${!!existingProduct}`);

//         if (!existingProduct) {
//           console.log("=== CREATING NEW PRODUCT IN WEBFLOW ===");
//           // Create new product in Webflow
//           const newProduct = {
//             name: printfulProduct.sync_product.name,
//             slug: printfulProduct.sync_product.name
//               .toLowerCase()
//               .replace(/[^a-z0-9]+/g, "-"),
//             sku: `PF-${printfulProduct.sync_product.id}`,
//             printfulId: printfulProduct.sync_product.id.toString(),
//             imageUrl: printfulProduct.sync_product.thumbnail_url,
//             variants: printfulProduct.sync_variants.map((variant) => ({
//               name: variant.name,
//               price: parseFloat(variant.retail_price || "0"),
//               sku: `PF-${variant.variant_id}`,
//               printfulVariantId: variant.variant_id.toString(),
//             })),
//           };

//           console.log("New product data:", JSON.stringify(newProduct, null, 2));

//           const response = await webflow.products.create(siteId, {
//             publishStatus: "staging",
//             product: {
//               fieldData: newProduct,
//             },
//           });
//           console.log(
//             "Webflow create product response:",
//             JSON.stringify(response, null, 2)
//           );

//           return {
//             status: "created",
//             printfulId: printfulProduct.sync_product.id,
//             webflowId: response.product?.id,
//           };
//         }

//         console.log(
//           `Product ${printfulProduct.sync_product.name} processed successfully`
//         );

//         return {
//           status: "exists",
//           printfulId: printfulProduct.sync_product.id,
//           webflowId: existingProduct.product?.id,
//         };
//       })
//     );

//     console.log("=== SYNC COMPLETE ===");
//     console.log("Sync results:", JSON.stringify(results, null, 2));

//     return NextResponse.json({
//       code: 200,
//       result: results,
//     });
//   } catch (error) {
//     console.error("Error syncing products:", error);
//     return NextResponse.json(
//       { error: "Failed to sync products" },
//       { status: 500 }
//     );
//   }
// }
