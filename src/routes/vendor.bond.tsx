import { createFileRoute } from "@tanstack/react-router";
import VendorBond from "@/pages/VendorBond";
import { Protected } from "@/lib/Protected";

export const Route = createFileRoute("/vendor/bond")({
  component: () => (
    <Protected roles={["vendor", "admin"]}>
      <VendorBond />
    </Protected>
  ),
});
