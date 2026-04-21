import { createFileRoute, Navigate } from "@tanstack/react-router";
import Login from "@/pages/Login";
import { useAuth } from "@/lib/authContext";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, role } = useAuth();
  if (user && role) {
    const target = role === "admin" ? "/admin" : role === "vendor" ? "/vendor" : "/market";
    return <Navigate to={target} replace />;
  }
  return <Login />;
}
