import { createFileRoute } from "@tanstack/react-router";
import AdminStore from "@/pages/AdminStore";
import { Protected } from "@/lib/Protected";

export const Route = createFileRoute("/admin/store")({
  component: () => (
    <Protected roles={["admin"]}>
      <AdminStore />
    </Protected>
  ),
});
