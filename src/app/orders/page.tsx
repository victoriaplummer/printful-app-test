import OrdersPageClient from "@/components/orders/OrdersPageClient";

// Prevent static prerendering since this page renders client components that use auth
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Orders - Printful App",
  description: "Manage your Webflow orders and fulfill them with Printful",
};

export default function OrdersPage() {
  return <OrdersPageClient />;
}
