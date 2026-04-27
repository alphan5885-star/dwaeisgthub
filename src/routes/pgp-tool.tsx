import { createFileRoute } from "@tanstack/react-router";
import PgpTool from "@/pages/PgpTool";
import { Protected } from "@/lib/Protected";

export const Route = createFileRoute("/pgp-tool")({
  component: () => (
    <Protected roles={["buyer", "vendor", "admin"]}>
      <PgpTool />
    </Protected>
  ),
});
