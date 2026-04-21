import { createFileRoute } from "@tanstack/react-router";
import Watchlist from "@/pages/Watchlist";
import { Protected } from "@/lib/Protected";

export const Route = createFileRoute("/watchlist")({
  component: () => (
    <Protected roles={["buyer", "vendor", "admin"]}>
      <Watchlist />
    </Protected>
  ),
});
