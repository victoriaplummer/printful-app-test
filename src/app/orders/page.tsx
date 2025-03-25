import OrdersPageClient from "@/components/orders/OrdersPageClient";

export const metadata = {
  title: "Orders - Printful App",
  description: "Manage your Webflow orders and fulfill them with Printful",
};

export default function OrdersPage() {
  return <OrdersPageClient />;
}
