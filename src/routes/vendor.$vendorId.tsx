import { createFileRoute } from "@tanstack/react-router";
import VendorProfile from "@/pages/VendorProfile";
import { Protected } from "@/lib/Protected";

export const Route = createFileRoute("/vendor/$vendorId")({
  component: () => (
    <Protected roles={["buyer", "vendor", "admin"]}>
      <VendorProfile />
    </Protected>
  ),
});
