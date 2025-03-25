"use client";

import React from "react";

interface OrderItem {
  id: string;
  orderNumber: string;
  createdOn: string;
  customerName: string;
  total: number;
  status: string;
  fulfillmentStatus: "unfulfilled" | "fulfilled" | "partially_fulfilled";
}

interface OrdersListProps {
  orders: OrderItem[];
  selectedOrderId: string | null;
  onSelectOrder: (orderId: string) => void;
}

export default function OrdersList({
  orders,
  selectedOrderId,
  onSelectOrder,
}: OrdersListProps) {
  if (!orders.length) {
    return <p className="text-gray-500">No orders found</p>;
  }

  // Format date without date-fns
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  return (
    <div className="overflow-y-auto max-h-[70vh]">
      <ul className="divide-y divide-gray-200">
        {orders.map((order) => (
          <li
            key={order.id}
            className={`py-3 cursor-pointer hover:bg-base-200 transition-colors ${
              selectedOrderId === order.id ? "bg-base-200" : ""
            }`}
            onClick={() => onSelectOrder(order.id)}
          >
            <div className="flex flex-col">
              <div className="flex items-center justify-between">
                <span className="font-medium">{order.orderNumber}</span>
                <FulfillmentBadge status={order.fulfillmentStatus} />
              </div>

              <div className="text-sm text-gray-500 mt-1">
                {order.customerName}
              </div>

              <div className="flex justify-between items-center mt-1">
                <span className="text-sm font-medium">
                  ${order.total.toFixed(2)}
                </span>
                <span className="text-xs text-gray-500">
                  {formatDate(order.createdOn)}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Badge component for fulfillment status
function FulfillmentBadge({ status }: { status: string }) {
  let badgeStyle = "px-2 py-1 text-xs rounded-full";

  switch (status) {
    case "fulfilled":
      badgeStyle += " bg-green-100 text-green-800";
      break;
    case "partially_fulfilled":
      badgeStyle += " bg-yellow-100 text-yellow-800";
      break;
    default:
      badgeStyle += " bg-gray-100 text-gray-800";
  }

  const label =
    status === "unfulfilled"
      ? "Unfulfilled"
      : status === "partially_fulfilled"
      ? "Partial"
      : "Fulfilled";

  return <span className={badgeStyle}>{label}</span>;
}
