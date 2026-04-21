import { createFileRoute } from "@tanstack/react-router";
import VendorWallet from "@/pages/VendorWallet";
import { Protected } from "@/lib/Protected";

export const Route = createFileRoute("/vendor/wallet")({
  component: () => (
    <Protected roles={["vendor", "admin"]}>
      <VendorWallet />
    </Protected>
  ),
});
