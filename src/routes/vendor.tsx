import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import VendorDashboard from "@/pages/VendorDashboard";
import { Protected } from "@/lib/Protected";

function VendorRoutePage() {
  const { pathname } = useLocation();

  return (
    <Protected roles={["vendor", "admin"]}>
      {pathname === "/vendor" ? <VendorDashboard /> : <Outlet />}
    </Protected>
  );
}

export const Route = createFileRoute("/vendor")({
  component: VendorRoutePage,
});
