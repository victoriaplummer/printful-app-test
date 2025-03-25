import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/auth.config";

interface WebflowOrder {
  orderId: string;
  orderItems: Array<{
    productId: string;
    variantId: string;
    quantity: number;
  }>;
  customerInfo: {
    name: string;
    email: string;
    address: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      country: string;
      postalCode: string;
    };
    phone?: string;
  };
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json(
      { error: "Printful authentication required" },
      { status: 401 }
    );
  }

  try {
    const webflowOrder: WebflowOrder = await request.json();

    // Create Printful order
    const printfulOrder = {
      external_id: webflowOrder.orderId,
      shipping: "STANDARD",
      recipient: {
        name: webflowOrder.customerInfo.name,
        email: webflowOrder.customerInfo.email,
        address1: webflowOrder.customerInfo.address.line1,
        address2: webflowOrder.customerInfo.address.line2 || "",
        city: webflowOrder.customerInfo.address.city,
        state_code: webflowOrder.customerInfo.address.state,
        country_code: webflowOrder.customerInfo.address.country,
        zip: webflowOrder.customerInfo.address.postalCode,
        phone: webflowOrder.customerInfo.phone || "",
      },
      items: webflowOrder.orderItems.map((item) => ({
        variant_id: parseInt(item.variantId),
        quantity: item.quantity,
      })),
    };

    // Send order to Printful
    const response = await fetch("https://api.printful.com/orders", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(printfulOrder),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Failed to create Printful order");
    }

    return NextResponse.json({
      code: 200,
      result: {
        webflowOrderId: webflowOrder.orderId,
        printfulOrderId: data.result.id,
      },
    });
  } catch (error) {
    console.error("Error creating Printful order:", error);
    return NextResponse.json(
      { error: "Failed to create Printful order" },
      { status: 500 }
    );
  }
}
