import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/auth.config";
import { WebflowClient } from "webflow-api";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.webflowAccessToken || !session?.printfulAccessToken) {
    return NextResponse.json(
      { error: "Authentication required for both Webflow and Printful" },
      { status: 401 }
    );
  }

  try {
    const { siteId } = await request.json();

    if (!siteId) {
      return NextResponse.json(
        { error: "Site ID is required" },
        { status: 400 }
      );
    }

    const webflow = new WebflowClient({
      accessToken: session.webflowAccessToken,
    });

    // Get all unfulfilled orders
    const webflowOrders = await webflow.orders.list(siteId, { limit: 100 });
    const unfulfilledOrders =
      webflowOrders?.orders?.filter(
        (order) =>
          !order.fulfilledOn &&
          order.status !== "refunded" &&
          order.status !== "disputed"
      ) ?? [];

    if (unfulfilledOrders?.length === 0) {
      return NextResponse.json({
        message: "No unfulfilled orders found",
        success: true,
        count: 0,
      });
    }

    // Process each order
    const results = await Promise.all(
      unfulfilledOrders.map(async (order) => {
        try {
          // Format order for Printful
          const printfulOrder = {
            external_id: order.orderId,
            shipping: "STANDARD",
            recipient: {
              name: order.customerInfo?.fullName || "",
              email: order.customerInfo?.email || "",
              address1: order.shippingAddress?.line1 || "",
              address2: order.shippingAddress?.line2 || "",
              city: order.shippingAddress?.city || "",
              state_code: order.shippingAddress?.state || "",
              country_code: order.shippingAddress?.country || "",
              zip: order.shippingAddress?.postalCode || "",
              phone: "", // Phone may not be available
            },
            items: order.purchasedItems?.map((item) => {
              // Check if variantSKU exists before trying to match
              if (!item.variantSku) {
                // Log the issue for debugging
                console.log(
                  `Missing SKU for item in order ${order.orderId}:`,
                  item
                );

                // Use product ID as fallback if available
                if (item.productId) {
                  return {
                    product_id: item.productId,
                    quantity: item.count,
                  };
                }

                throw new Error(
                  `Item is missing both SKU and product ID in order ${order.orderId}`
                );
              }

              // Extract variant_id from SKU if needed
              // Assuming SKU follows a pattern like "PF-12345" where 12345 is the Printful variant_id
              const skuMatch = item.variantSku.match(/PF-(\d+)/);

              if (skuMatch && skuMatch[1]) {
                const variant_id = parseInt(skuMatch[1]);
                return {
                  variant_id,
                  quantity: item.count,
                };
              } else {
                // If we couldn't extract a variant ID from the SKU,
                // use the raw SKU and let Printful try to match it
                return {
                  sku: item?.variantSku,
                  quantity: item.count,
                };
              }
            }),
          };

          // Send order to Printful
          const printfulResponse = await fetch(
            "https://api.printful.com/orders",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${session.printfulAccessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(printfulOrder),
            }
          );

          const printfulData = await printfulResponse.json();

          if (!printfulResponse.ok) {
            throw new Error(
              printfulData.error?.message || "Failed to create Printful order"
            );
          }

          if (!order.orderId) {
            throw new Error("Order ID is missing");
          }

          // Update order fulfillment status in Webflow
          await webflow.orders.updateFulfill(siteId, order.orderId, {
            sendOrderFulfilledEmail: false,
          });

          return {
            orderId: order.orderId,
            success: true,
            printfulOrderId: printfulData.result.id,
          };
        } catch (error) {
          console.error(`Error processing order ${order.orderId}:`, error);
          return {
            orderId: order.orderId,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      })
    );

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${successCount} orders. Failed: ${failureCount} orders.`,
      results,
      totalProcessed: results.length,
    });
  } catch (error) {
    console.error("Error in bulk order fulfillment:", error);
    return NextResponse.json(
      {
        error: "Failed to process orders",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
