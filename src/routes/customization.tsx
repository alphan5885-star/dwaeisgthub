import { createFileRoute } from "@tanstack/react-router";
import Customization from "@/pages/Customization";
import { Protected } from "@/lib/Protected";

export const Route = createFileRoute("/customization")({
  component: () => (
    <Protected roles={["buyer", "vendor", "admin"]}>
      <Customization />
    </Protected>
  ),
});
