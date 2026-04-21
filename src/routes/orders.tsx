import { createFileRoute } from "@tanstack/react-router";
import Orders from "@/pages/Orders";
import { Protected } from "@/lib/Protected";

export const Route = createFileRoute("/orders")({
  component: () => (
    <Protected roles={["buyer", "vendor", "admin"]}>
      <Orders />
    </Protected>
  ),
});
