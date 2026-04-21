import { createFileRoute } from "@tanstack/react-router";
import ProductDetail from "@/pages/ProductDetail";
import { Protected } from "@/lib/Protected";

export const Route = createFileRoute("/product/$id")({
  component: () => (
    <Protected roles={["buyer", "vendor", "admin"]}>
      <ProductDetail />
    </Protected>
  ),
});
