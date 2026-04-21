import { createFileRoute } from "@tanstack/react-router";
import VendorDashboard from "@/pages/VendorDashboard";
import { Protected } from "@/lib/Protected";

export const Route = createFileRoute("/vendor")({
  component: () => (
    <Protected roles={["vendor", "admin"]}>
      <VendorDashboard />
    </Protected>
  ),
});
