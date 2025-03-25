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
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    const webflow = new WebflowClient({
      accessToken: session.webflowAccessToken,
    });

    // Get the site ID
    const sites = await webflow.sites.list();
    if (!sites.sites || sites.sites.length === 0) {
      return NextResponse.json(
        { error: "No Webflow sites found" },
        { status: 404 }
      );
    }

    const siteId = sites.sites[0].id;

    // Get order details from Webflow
    const webflowOrder = await webflow.ecommerce.getOrder({
      siteId,
      orderId,
    });

    // Format order for Printful
    const printfulOrder = {
      external_id: webflowOrder.order.orderNumber,
      shipping: "STANDARD",
      recipient: {
        name: `${webflowOrder.order.customer.firstName} ${webflowOrder.order.customer.lastName}`,
        email: webflowOrder.order.customer.email,
        address1: webflowOrder.order.shippingAddress.line1,
        address2: webflowOrder.order.shippingAddress.line2 || "",
        city: webflowOrder.order.shippingAddress.city,
        state_code: webflowOrder.order.shippingAddress.state,
        country_code: webflowOrder.order.shippingAddress.country,
        zip: webflowOrder.order.shippingAddress.postalCode,
        phone: webflowOrder.order.customer.phone || "",
      },
      items: webflowOrder.order.items.map((item) => {
        // Extract variant_id from SKU if needed
        // Assuming SKU follows a pattern like "PF-12345" where 12345 is the Printful variant_id
        const skuMatch = item.sku.match(/PF-(\d+)/);
        const variant_id = skuMatch ? parseInt(skuMatch[1]) : null;

        if (!variant_id) {
          throw new Error(
            `Could not extract Printful variant ID from SKU: ${item.sku}`
          );
        }

        return {
          variant_id,
          quantity: item.quantity,
        };
      }),
    };

    // Send order to Printful
    const printfulResponse = await fetch("https://api.printful.com/orders", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.printfulAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(printfulOrder),
    });

    const printfulData = await printfulResponse.json();

    if (!printfulResponse.ok) {
      throw new Error(
        printfulData.error?.message || "Failed to create Printful order"
      );
    }

    // Update order fulfillment status in Webflow if needed
    try {
      await webflow.ecommerce.fulfillOrder({
        siteId,
        orderId,
        requestBody: {
          tracking: {
            carrier: "Printful",
            number: `PF${printfulData.result.id}`, // Use Printful order ID as tracking number
          },
        },
      });
    } catch (webflowError) {
      console.error("Error updating Webflow order status:", webflowError);
      // Continue execution even if Webflow update fails
    }

    return NextResponse.json({
      success: true,
      message: "Order successfully sent to Printful",
      printfulOrderId: printfulData.result.id,
    });
  } catch (error) {
    console.error("Error fulfilling order:", error);
    return NextResponse.json(
      {
        error: "Failed to fulfill order",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
