import { createFileRoute } from "@tanstack/react-router";
import Forum from "@/pages/Forum";
import { Protected } from "@/lib/Protected";

export const Route = createFileRoute("/forum")({
  component: () => (
    <Protected roles={["buyer", "vendor", "admin"]}>
      <Forum />
    </Protected>
  ),
});
