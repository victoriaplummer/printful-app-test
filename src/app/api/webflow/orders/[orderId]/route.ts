import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/auth.config";
import { WebflowClient } from "webflow-api";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    orderId: string;
  };
}

export async function GET(request: Request, { params }: RouteParams) {
  const { orderId } = params;
  const session = await getServerSession(authOptions);

  if (!session?.webflowAccessToken) {
    return NextResponse.json(
      { error: "Webflow authentication required" },
      { status: 401 }
    );
  }

  try {
    const webflow = new WebflowClient({
      accessToken: session.webflowAccessToken,
    });

    // Get site ID from request URL
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get("siteId");

    if (!siteId) {
      return NextResponse.json(
        { error: "Site ID is required" },
        { status: 400 }
      );
    }

    // Get specific order from Webflow
    const orderResponse = await webflow.orders.get(siteId, orderId);
    const order = orderResponse;

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Format order for the frontend using the actual structure
    const formattedOrder = {
      id: order.orderId,
      orderNumber: order.orderId,
      createdOn: order.acceptedOn,
      customerInfo: {
        name: order.customerInfo?.fullName || "",
        email: order.customerInfo?.email || "",
        phone: "", // Phone doesn't appear to be in the API response
        address: {
          line1: order.shippingAddress?.line1 || "",
          line2: order.shippingAddress?.line2 || "",
          city: order.shippingAddress?.city || "",
          state: order.shippingAddress?.state || "",
          postalCode: order.shippingAddress?.postalCode || "",
          country: order.shippingAddress?.country || "",
        },
      },
      orderItems:
        order.purchasedItems?.map((item) => ({
          id: item.variantId || "",
          name: item.productName || "",
          variantName: item.variantName || "",
          sku: item.variantSku || "",
          price: Number(item.variantPrice?.value ?? 0) / 100,
          quantity: item.count || 0,
          thumbnailUrl: item.variantImage?.url || "",
          status: order.fulfilledOn ? "fulfilled" : "unfulfilled",
        })) || [],
      total: Number(order.customerPaid?.value ?? 0) / 100,
      fulfillmentStatus: order.fulfilledOn ? "fulfilled" : "unfulfilled",
      notes: order.orderComment || "",
      shippingInfo: {
        provider: order.shippingProvider || "",
        tracking: order.shippingTracking || "",
        trackingUrl: order.shippingTrackingUrl || "",
      },
    };

    return NextResponse.json({
      result: formattedOrder,
    });
  } catch (error) {
    console.error("Error fetching Webflow order details:", error);
    return NextResponse.json(
      { error: "Failed to fetch order details from Webflow" },
      { status: 500 }
    );
  }
}
