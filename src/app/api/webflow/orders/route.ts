import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/auth.config";
import { WebflowClient } from "webflow-api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get("siteId");

  const session = await getServerSession(authOptions);

  if (!session?.webflowAccessToken) {
    return NextResponse.json(
      { error: "Webflow authentication required" },
      { status: 401 }
    );
  }

  if (!siteId) {
    return NextResponse.json({ error: "Site ID is required" }, { status: 400 });
  }

  try {
    const webflow = new WebflowClient({
      accessToken: session.webflowAccessToken,
    });

    // Get orders from Webflow using the provided siteId
    const webflowOrders = await webflow.orders.list(
      siteId,
      { limit: 50 } // Adjust as needed
    );

    // Format orders for the frontend based on the actual payload structure
    const formattedOrders = webflowOrders?.orders?.map((order) => ({
      id: order.orderId,
      orderNumber: order.orderId,
      createdOn: order.acceptedOn,
      customerName: order.customerInfo?.fullName,
      total: order.customerPaid?.value
        ? Number(order.customerPaid.value) / 100
        : 0,
      status: order.status,
      fulfillmentStatus: order.fulfilledOn ? "fulfilled" : "unfulfilled",
    }));

    return NextResponse.json({
      result: formattedOrders,
    });
  } catch (error) {
    console.error("Error fetching Webflow orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders from Webflow" },
      { status: 500 }
    );
  }
}
