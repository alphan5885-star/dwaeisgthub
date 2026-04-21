import { createFileRoute } from "@tanstack/react-router";
import Profile from "@/pages/Profile";
import { Protected } from "@/lib/Protected";

export const Route = createFileRoute("/profile")({
  component: () => (
    <Protected roles={["buyer", "vendor", "admin"]}>
      <Profile />
    </Protected>
  ),
});
