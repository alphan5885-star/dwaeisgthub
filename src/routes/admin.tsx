import { createFileRoute } from "@tanstack/react-router";
import AdminDashboard from "@/pages/AdminDashboard";
import { Protected } from "@/lib/Protected";

export const Route = createFileRoute("/admin")({
  component: () => (
    <Protected roles={["admin"]}>
      <AdminDashboard />
    </Protected>
  ),
});
