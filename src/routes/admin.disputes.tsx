import { createFileRoute } from "@tanstack/react-router";
import Disputes from "@/pages/Disputes";
import { Protected } from "@/lib/Protected";

export const Route = createFileRoute("/admin/disputes")({
  component: () => (
    <Protected roles={["admin"]}>
      <Disputes />
    </Protected>
  ),
});
