import { createFileRoute } from "@tanstack/react-router";
import Market from "@/pages/Market";
import { Protected } from "@/lib/Protected";

export const Route = createFileRoute("/market")({
  component: () => (
    <Protected roles={["buyer", "vendor", "admin"]}>
      <Market />
    </Protected>
  ),
});
