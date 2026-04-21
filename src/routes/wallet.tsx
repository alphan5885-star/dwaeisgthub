import { createFileRoute } from "@tanstack/react-router";
import Wallet from "@/pages/Wallet";
import { Protected } from "@/lib/Protected";

export const Route = createFileRoute("/wallet")({
  component: () => (
    <Protected roles={["buyer", "vendor", "admin"]}>
      <Wallet />
    </Protected>
  ),
});
