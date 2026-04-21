import { createFileRoute } from "@tanstack/react-router";
import SecuritySettings from "@/pages/SecuritySettings";
import { Protected } from "@/lib/Protected";

export const Route = createFileRoute("/security")({
  component: () => (
    <Protected roles={["buyer", "vendor", "admin"]}>
      <SecuritySettings />
    </Protected>
  ),
});
