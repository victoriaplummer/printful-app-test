"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorDisplay from "@/components/ui/ErrorDisplay";

interface OrderDetailsProps {
  orderId: string;
  siteId: string;
  onOrderFulfilled: () => void;
}

export default function OrderDetails({
  orderId,
  siteId,
  onOrderFulfilled,
}: OrderDetailsProps) {
  const [fulfillmentError, setFulfillmentError] = useState<string | null>(null);

  // Fetch order details
  const {
    data: orderDetails,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["order-details", siteId, orderId],
    queryFn: async () => {
      const response = await fetch(
        `/api/webflow/orders/${orderId}?siteId=${siteId}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch order details");
      }
      return response.json();
    },
  });

  // Send order to Printful mutation
  const { mutate: sendToPrintful, isPending: isSending } = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/webflow/orders/fulfill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId, siteId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send order to Printful");
      }

      return response.json();
    },
    onSuccess: () => {
      setFulfillmentError(null);
      onOrderFulfilled();
    },
    onError: (error) => {
      setFulfillmentError(error.message || "Failed to send order to Printful");
    },
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (isError) {
    return (
      <ErrorDisplay
        message={`Error loading order details: ${error?.toString()}`}
      />
    );
  }

  if (!orderDetails?.result) {
    return <div>No order details found</div>;
  }

  const { result: order } = orderDetails;

  return (
    <div className="bg-base-100 shadow rounded-lg p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-semibold">Order #{order.orderNumber}</h2>
          <p className="text-sm text-gray-500">
            Created on {new Date(order.createdOn).toLocaleString()}
          </p>
        </div>
        {order.fulfillmentStatus === "unfulfilled" && (
          <button
            className="btn btn-primary"
            onClick={() => sendToPrintful()}
            disabled={isSending}
          >
            {isSending ? (
              <>
                <span className="loading loading-spinner loading-xs"></span>
                Sending to Printful...
              </>
            ) : (
              "Send to Printful"
            )}
          </button>
        )}
      </div>

      {fulfillmentError && (
        <div className="alert alert-error mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{fulfillmentError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold mb-2">Customer Information</h3>
          <div className="text-sm">
            <p className="font-medium">{order.customerInfo.name}</p>
            <p>{order.customerInfo.email}</p>
            {order.customerInfo.phone && <p>{order.customerInfo.phone}</p>}
          </div>

          <h3 className="font-semibold mt-4 mb-2">Shipping Address</h3>
          <div className="text-sm">
            <p>{order.customerInfo.address.line1}</p>
            {order.customerInfo.address.line2 && (
              <p>{order.customerInfo.address.line2}</p>
            )}
            <p>
              {order.customerInfo.address.city},{" "}
              {order.customerInfo.address.state}{" "}
              {order.customerInfo.address.postalCode}
            </p>
            <p>{order.customerInfo.address.country}</p>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Order Items</h3>
          <div className="space-y-4">
            {order.orderItems.map((item) => (
              <div key={item.id} className="flex items-start gap-4">
                {item.thumbnailUrl && (
                  <div className="w-16 h-16 relative">
                    <img
                      src={item.thumbnailUrl}
                      alt={item.name}
                      className="object-cover rounded"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-gray-500">{item.variantName}</p>
                  <div className="flex justify-between mt-1">
                    <p className="text-sm">
                      ${item.price} × {item.quantity}
                    </p>
                    <p className="font-medium">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t mt-4 pt-4">
            <div className="flex justify-between">
              <p className="font-semibold">Total</p>
              <p className="font-semibold">${order.total.toFixed(2)}</p>
            </div>
          </div>

          {order.notes && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Order Notes</h3>
              <p className="text-sm">{order.notes}</p>
            </div>
          )}

          {order.shippingInfo.tracking && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Shipping Information</h3>
              <div className="text-sm">
                <p>Provider: {order.shippingInfo.provider}</p>
                <p>
                  Tracking:{" "}
                  {order.shippingInfo.trackingUrl ? (
                    <a
                      href={order.shippingInfo.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {order.shippingInfo.tracking}
                    </a>
                  ) : (
                    order.shippingInfo.tracking
                  )}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
