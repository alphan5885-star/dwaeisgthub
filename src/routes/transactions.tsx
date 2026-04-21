import { createFileRoute } from "@tanstack/react-router";
import Transactions from "@/pages/Transactions";
import { Protected } from "@/lib/Protected";

export const Route = createFileRoute("/transactions")({
  component: () => (
    <Protected roles={["buyer", "vendor", "admin"]}>
      <Transactions />
    </Protected>
  ),
});
