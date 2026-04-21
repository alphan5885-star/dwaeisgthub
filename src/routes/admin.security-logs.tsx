import { createFileRoute } from "@tanstack/react-router";
import SecurityLogs from "@/pages/SecurityLogs";
import { Protected } from "@/lib/Protected";

export const Route = createFileRoute("/admin/security-logs")({
  component: () => (
    <Protected roles={["admin"]}>
      <SecurityLogs />
    </Protected>
  ),
});
