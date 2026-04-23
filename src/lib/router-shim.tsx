// react-router-dom -> TanStack Router uyum katmanı (basit)
import {
  Link as TSLink,
  useNavigate as tsUseNavigate,
  useParams as tsUseParams,
  useLocation as tsUseLocation,
  useRouter,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function useNavigate() {
  const nav = tsUseNavigate();
  return (to: string | number, opts?: { replace?: boolean }) => {
    if (typeof to === "number") {
      window.history.go(to);
      return;
    }
    nav({ to, replace: opts?.replace } as never);
  };
}

export function useParams<T extends Record<string, string> = Record<string, string>>() {
  return (tsUseParams as unknown as (opts: { strict: false }) => T)({ strict: false });
}

export function useLocation() {
  const loc = tsUseLocation();
  return {
    pathname: loc.pathname,
    search: typeof loc.search === "string" ? loc.search : "",
    hash: loc.hash,
    state: loc.state,
  };
}

interface AnyProps {
  to: string;
  children?: ReactNode;
  className?: string;
  replace?: boolean;
  [key: string]: unknown;
}

export function Link({ to, children, className, replace, ...rest }: AnyProps) {
  const Anchor = TSLink as unknown as React.FC<Record<string, unknown>>;
  return (
    <Anchor to={to} replace={replace} className={className} {...rest}>
      {children}
    </Anchor>
  );
}

interface NavLinkProps extends AnyProps {
  end?: boolean;
  className?: string;
  activeClassName?: string;
}

export function NavLink({ to, children, className, end, activeClassName, ...rest }: NavLinkProps) {
  const Anchor = TSLink as unknown as React.FC<Record<string, unknown>>;
  return (
    <Anchor
      to={to}
      activeOptions={{ exact: end }}
      activeProps={{ className: cn(className, activeClassName) }}
      className={className}
      {...rest}
    >
      {children}
    </Anchor>
  );
}

export function Navigate({ to, replace }: { to: string; replace?: boolean }) {
  const nav = tsUseNavigate();
  useEffect(() => {
    nav({ to, replace } as never);
  }, [to, replace, nav]);
  return null;
}

export function Outlet() {
  return null;
}

export { useRouter };
