"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import OrdersList from "@/components/orders/OrdersList";
import OrderDetails from "@/components/orders/OrderDetails";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorDisplay from "@/components/ui/ErrorDisplay";
import { useWebflowSettings } from "@/hooks/useWebflowSettings";

interface Order {
  id: string;
  orderNumber: string;
  createdOn: string;
  customerName: string;
  total: number;
  status: string;
  fulfillmentStatus: "unfulfilled" | "fulfilled" | "partially_fulfilled";
}

interface OrdersResponse {
  result: Order[];
}

export default function OrdersPage() {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const { settings } = useWebflowSettings();
  const queryClient = useQueryClient();

  const {
    data: orders,
    isLoading,
    error,
  } = useQuery<OrdersResponse>({
    queryKey: ["orders", settings.siteId],
    queryFn: async () => {
      if (!settings.siteId) return { result: [] };

      const response = await fetch(
        `/api/webflow/orders?siteId=${settings.siteId}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }
      return response.json();
    },
    enabled: !!settings.siteId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Bulk send to Printful mutation
  const { mutate: sendAllToPrintful, isPending: isSendingAll } = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/webflow/orders/fulfill-bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ siteId: settings.siteId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send orders to Printful");
      }

      return response.json();
    },
    onSuccess: () => {
      setBulkError(null);
      queryClient.invalidateQueries({ queryKey: ["orders", settings.siteId] });
    },
    onError: (error) => {
      setBulkError(error.message || "Failed to send orders to Printful");
    },
  });

  // Get count of unfulfilled orders
  const unfulfilledOrdersCount =
    orders?.result?.filter(
      (order: Order) => order.fulfillmentStatus === "unfulfilled"
    ).length || 0;

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay message={error.toString()} />;

  return (
    <>
      {bulkError && (
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
          <span>{bulkError}</span>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">
          Orders ({orders?.result?.length || 0})
        </h2>
        {unfulfilledOrdersCount > 0 && (
          <button
            className="btn btn-primary"
            onClick={() => sendAllToPrintful()}
            disabled={isSendingAll}
          >
            {isSendingAll ? (
              <>
                <span className="loading loading-spinner loading-xs"></span>
                Sending {unfulfilledOrdersCount} orders...
              </>
            ) : (
              `Send All to Printful (${unfulfilledOrdersCount})`
            )}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <OrdersList
          orders={orders?.result || []}
          selectedOrderId={selectedOrderId}
          onSelectOrder={setSelectedOrderId}
        />
        {selectedOrderId && (
          <OrderDetails
            orderId={selectedOrderId}
            siteId={settings.siteId}
            onOrderFulfilled={() => {
              // Refetch orders when an order is fulfilled
              queryClient.invalidateQueries({
                queryKey: ["orders", settings.siteId],
              });
            }}
          />
        )}
      </div>
    </>
  );
}
