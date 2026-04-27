import { Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/authContext";
import type { ReactNode } from "react";

export function Protected({
  roles,
  children,
}: {
  roles: Array<"admin" | "vendor" | "buyer">;
  children: ReactNode;
}) {
  const { user, role, loading } = useAuth();
  if (loading) {
    return <>{children}</>;
  }
  if (!user) return <Navigate to="/" replace />;
  if (!role || !roles.includes(role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
